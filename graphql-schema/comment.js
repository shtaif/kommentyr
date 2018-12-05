const
    gql = require('graphql-tag'),
    escapeStringRegexp = require('escape-string-regexp'),
    crypto = require('crypto'),
    bcrypt = require('bcrypt'),
    { filter } = require('rxjs/operators'),
    { createResolver } = require('apollo-resolvers'),
    CommentModel = require('../models/comment-model'),
    UserModel = require('../models/user-model'),
    pubsub = require('./pubsub'),
    { ApiError } = require('./errors'),
    config = require('../config'),
    { DataLoader, ImprovedDataLoader } = require('../tools/data-loader'),
    { toAsyncIterBuffered: toAsyncIter } = require('../tools/observable-to-async-iterator'),
    RedisObservable = require('../tools/redis-observable'),
    { chain } = require('graphql-chain'),
    { isAuthenticatedResolver } = require('./common-resolvers');


// (async function() {
//     let UserModel = require('../models/user-model');
//
//     let comments = await CommentModel.find({});
//     console.log('COMMENTS', comments);
//
//     await UserModel.remove();
//
//     let newUsers = [];
//
//     for (let comment of comments) {
//         let user = await UserModel.findOne({email: comment.email});
//         console.log('USER', user);
//         if (!user) {
//             user = await new UserModel({
//                 email: comment.email,
//                 emailHash: comment.emailHash,
//                 password: await bcrypt.hash('12345', config.passwordHashSaltRounds)
//             })
//             .save();
//             newUsers.push(user.toObject());
//         }
//
//         comment.posterId = user._id;
//         await comment.save();
//     }
//
//     console.log('NEW_USERS', newUsers);
// })();


// (async () => {
//     let result = await CommentModel.remove({ _id: { $in: ['5b5f36e078724aab985384cf'] } });
//     console.log('REMOVED', result);
// })();


module.exports = {
    typeDef: gql`
        type Comment {
            _id: ID
            posterId: ID
            replyingToId: ID
            email: String
            emailHash: String
            createdAt: String
            text: String
            replyCount: Int
            replies: [Comment]
            poster: User
        }

        type CommentChange {
            type: CommentChangeType
            comment: Comment
        }

        enum CommentChangeType { created updated deleted }

        extend type Query {
            getComment(
                emailContains: String
                replyingToId: ID
                skip: Int
                sortField: String
                sortDirection: String
            ): Comment

            getComments(
                emailContains: String
                replyingToId: ID
                skip: Int
                limit: Int
                sortField: String
                sortDirection: String
            ): [Comment]
        }

        extend type Mutation {
            postComment(
                posterId: ID
                email: String
                text: String
                replyingToId: ID
            ): Comment

            editComment(
                id: ID!
                text: String!
            ): Comment

            deleteComment(
                id: ID!
            ): Comment
        }

        extend type Subscription {
            commentChanges(
                types: [CommentChangeType!]!
            ): CommentChange
        }
    `,

    resolvers: (() => {
        const repliesLoader = new ImprovedDataLoader(
            async parentIds => {
                return await CommentModel.find({ replyingToIds: { $in: parentIds } });
            },
            (id, reply) => {
                return id.toString() === reply.replyingToId;
            },
            { returnMultiple: true }
        );

        const posterLoader = new ImprovedDataLoader(
            async ids => {
                return await UserModel.find({ _id: { $in: ids } });
            },
            (id, user) => {
                return id === user._id.toString();
            }
        );

        return {
            Comment: {
                async replies(root, args, ctx) {
                    let replies = await repliesLoader.load(root._id);
                    return replies;
                },

                async replyCount(root, args, ctx) {
                    return await CommentModel.count({replyingToId: root._id});
                },

                async poster(root, args, ctx) {
                    return await posterLoader.load(root.posterId);
                }
            },

            Query: {
                async getComments(_, args, ctx, operation) {
                // getComments: isAuthenticatedResolver.createResolver(async (root, args, ctx, operation) => {
                    let {
                        id,
                        emailContains,
                        replyingToId,
                        skip,
                        limit,
                        sortField,
                        sortDirection
                    } = args;
                
                    let conditions = {};
                    if (id) {
                        conditions._id = id;
                    }
                    if (emailContains) {
                        conditions.email = new RegExp(escapeStringRegexp(emailContains), 'i');
                    }
                    if (replyingToId) {
                        conditions.replyingToId = replyingToId;
                    }
                
                    let comments = (await CommentModel.find(
                        conditions,
                        null,
                        {
                            skip: Number.isInteger(+skip)? +skip : 0,
                            limit: limit && Number.isInteger(+limit)? +limit : null,
                            sort: {[sortField || 'createdAt']: sortDirection || 'desc'}
                        }
                    ))
                    .map(item => item.toObject());
                
                    return comments;
                },

                async getComment(root, args, ctx, operation) {
                    args.limit = 1;
                    let result = await module.exports.resolvers.Query.getComments(root, args, ctx);
                    return result[0] || null;
                }
            },

            Mutation: {
                postComment: isAuthenticatedResolver.createResolver(async (root, args, ctx, operation) => {
                    try {
                        let { email, text, replyingToId, posterId } = args;

                        if (!posterId || posterId !== ctx.user._id) {
                            // console.log(posterId, ctx.session.userId, ctx.session);
                            throw new InvalidParamsError({message: '`posterId` must be supplied and correspond to the signed-in user'});
                        }

                        if (!email) {
                            throw new InvalidParamsError({message: '`email` must not be empty'});
                        }

                        let emailRegEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                        if (!emailRegEx.test(email)) {
                            throw new InvalidParamsError({message: '`email` does not seem to be a valid email address'});
                        }

                        if (!text) {
                            throw new InvalidParamsError({message: '`text` must not be empty'});
                        }

                        let newComment;
                        try {
                            newComment = await new CommentModel({
                                posterId: posterId,
                                email: email,
                                text: text,
                                emailHash: (() => {
                                    let normalizedEmail = email.trim().toLowerCase();
                                    return crypto.createHash('md5').update(normalizedEmail).digest('hex');
                                })(),
                                replyingToId: replyingToId
                            })
                            .save();
                        }
                        catch (err) {
                            console.error(err);
                            throw new InvalidParamsError({message: "Comment couldn't be posted due to an unkown error"});
                        }

                        await pubsub.publish('commentChanges:created', {
                            type: 'created',
                            comment: newComment
                        });

                        return newComment;
                    }
                    catch (err) {
                        // ctx.response.status = err.statusCode || 500;
                        // ctx.body = { errorMessage: err.message };
                        throw err;
                    }
                }),

                editComment: isAuthenticatedResolver.createResolver(async (root, args, ctx, operation) => {
                    let comment = await CommentModel.findOne({_id: args.id});

                    // console.log('COMMENT_TO_EDIT:', comment);

                    if (ctx.user._id !== comment.posterId) {
                        throw new Error('Not allowed to edit this comment');
                    }

                    // await CommentModel.update(
                    //     {_id: args.id},
                    //     {text: args.text}
                    // );

                    comment.text = args.text;

                    await pubsub.publish('commentChanges:updated', {
                        type: 'updated',
                        comment: comment
                    });

                    return comment;
                }),

                deleteComment: isAuthenticatedResolver.createResolver(async (root, args, ctx, operation) => {
                    let comment = await CommentModel.findOne({_id: args.id});

                    // console.log('COMMENT_TO_DELETE:', comment);

                    if (ctx.user._id !== comment.posterId) {
                        throw new Error('Not allowed to delete this comment');
                    }

                    // await CommentModel.delete({ _id: args.id });

                    await pubsub.publish('commentChanges:deleted', {
                        type: 'deleted',
                        comment: comment
                    });

                    return comment;
                })
            },

            Subscription: {
                commentChanges: {
                    subscribe(root, { types }, ctx, operation) {
                        return toAsyncIter(
                            new RedisObservable(pubsub.redisSubscriber, ...types.map(type => `commentChanges:${type}`)).pipe(
                                filter(data => {
                                    return !(ctx.user && ctx.user._id === data.comment.posterId);
                                })
                            )
                        );
                    },
                    resolve(root, args, ctx, operation) {
                        return root;
                    }
                }
            }
        };
    })()
};
