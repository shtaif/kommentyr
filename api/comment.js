const
    escapeStringRegexp = require('escape-string-regexp'),
    CommentModel = require('../models/comment-model'),
    UserModel = require('../models/user-model'),
    crypto = require('crypto'),
    bcrypt = require('bcrypt'),
    ApiError = require('./api-error'),
    config = require('../config'),
    { DataLoader, ImprovedDataLoader } = require('../tools/data-loader');


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


module.exports = {
    typeDef: `
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
            updateComment(_id: ID!, text: String!): Comment

            postComment(
                posterId: ID
                email: String
                text: String
                replyingToId: ID
            ): Comment
        }
    `,

    resolvers: (() => {
        const testDataLoader = new ImprovedDataLoader(
            async ids => {
                return await CommentModel.find({ _id: { $in: ids } });
            },
            (id, comment) => id === comment._id.toString()
        );

        const repliesDataLoader___ = new ImprovedDataLoader(
            async parentIds => await CommentModel.find({ replyingToIds: { $in: parentIds } }),
            (id, reply) => id.toString() === reply.replyingToId,
            { returnMultiple: true }
        );

        const repliesDataLoader = new DataLoader(async parentIds => {
            let replies = await CommentModel.find({ replyingToId: { $in: parentIds } });
            let orderedReplies = new Array(parentIds.length);
            for (let i=0; i<parentIds.length; ++i) {
                let currReplies = [];
                for (let reply of replies) {
                    if (parentIds[i].toString() === reply.replyingToId) {
                        currReplies.push(reply);
                    }
                }
                orderedReplies[i] = currReplies;
            }
            return orderedReplies;
        });

        return {
            Comment: {
                replies: async (root, args, ctx) => {
                    let replies = await repliesDataLoader.load(root._id);
                    return replies;
                },

                replyCount: async (comment, args, ctx) => {
                    return await CommentModel.count({replyingToId: comment._id});
                },

                poster: async (comment, args, ctx) => {
                    let poster = (await UserModel.findOne({_id: comment.posterId})).toObject();
                    return poster;
                }
            },

            Query: {
                getComments: async(root, args, ctx) => {
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

                getComment: async(root, args, ctx) => {
                    args.limit = 1;
                    let result = await module.exports.resolvers.Query.getComments(root, args, ctx);
                    return result[0] || null;
                }
            },

            Mutation: {
                postComment: async(root, args, ctx) => {
                    try {
                        let { email, text, replyingToId } = args;

                        if (!args.posterId) {
                            // ...
                        }

                        if (args.posterId !== ctx.session.userId) {
                            // ...
                        }

                        if (!email) {
                            throw new ApiError('`email` must not be empty', 400);
                        }

                        let emailRegEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                        if (!emailRegEx.test(email)) {
                            throw new ApiError('`email` does not seem to be a valid email address', 400);
                        }

                        if (!text) {
                            throw new ApiError('`text` must not be empty', 400);
                        }

                        let result;
                        try {
                            result = await new CommentModel({
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
                            throw new ApiError("Comment couldn't be posted due to an unkown error");
                        }

                        return result;
                    }
                    catch (err) {
                        // ctx.response.status = err.statusCode || 500;
                        // ctx.body = { errorMessage: err.message };
                        throw err;
                    }
                }
            }
        };
    })()
};
