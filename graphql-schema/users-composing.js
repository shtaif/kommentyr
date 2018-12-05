const
    gql = require('graphql-tag'),
    { withFilter } = require('graphql-subscriptions'),
    UserModel = require('../models/user-model'),
    pubsub = require('./pubsub'),
    { ApiError } = require('./errors'),
    { toAsyncIterBuffered: toAsyncIter } = require('../tools/observable-to-async-iterator'),
    RedisObservable = require('../tools/redis-observable'),
    { filter, map } = require('rxjs/operators');


let userComposingStateTimers = {};


// (async () => {
//     await new Promise(resolve => setTimeout(resolve, 2000));
//
//     let sessionInvalidatedSubs1 = new RedisObservable(pubsub.redisSubscriber, 'sessionInvalidated:*:*').subscribe(data => {
//         console.log('DATA 1', data.data);
//     });
//
//     let sessionInvalidatedSubs2 = new RedisObservable(pubsub.redisSubscriber, 'sessionInvalidated:*:*').subscribe(data => {
//         console.log('DATA 2', data.data);
//     });
//
//     setInterval(() => {
//         pubsub.redisPublisher.publish('sessionInvalidated:expired:aaabbbccc', JSON.stringify({
//             date: new Date().toISOString()
//         }));
//     }, 1000);
//
//     setTimeout(() => {
//         sessionInvalidatedSubs1.unsubscribe();
//     }, 4000);
//
//     setTimeout(() => {
//         sessionInvalidatedSubs2.unsubscribe();
//     }, 7000);
// })();


module.exports = {
    typeDef: gql`
        type UserComposingStateChange {
            user: User
            composingState: Boolean
        }

        extend type Query {
            test: String
            getUsersComposing: [User]
        }

        extend type Mutation {
            updateUserComposingState(
                userId: ID!
                composingState: Boolean!
            ) : Boolean
        }

        extend type Subscription {
            userComposingStateChanged: UserComposingStateChange
        }
    `,

    resolvers: {
        Query: {
            async getUsersComposing(root, args, ctx) {
                let userIdsComposing = await ctx.redisPublisher.smembers('userIdsComposing');
                if (userIdsComposing.length) {
                    return [];
                } else {
                    return await UserModel.find({ _id: { $in: userIdsComposing } });
                }
            }
        },

        Mutation: {
            updateUserComposingState: async function callee(root, { userId, composingState }, ctx) {
                let user = await UserModel.findOne({ _id: userId });
                if (!user) {
                    throw new ApiError('ERR_NO_SUCH_USER', 'No such user as ID "'+userId+'"', { userId });
                }

                let numChanged = await ctx.redisPublisher[composingState ? 'sadd' : 'srem']('userIdsComposing', userId);

                if (numChanged) {
                    await pubsub.publish('userComposingStateChanged:'+userId, { user, composingState });
                }

                if (composingState) {
                    if (userComposingStateTimers[userId]) {
                        clearTimeout(userComposingStateTimers[userId]);
                    }
                    userComposingStateTimers[userId] = setTimeout(() => {
                        callee(root, { userId, composingState: false }, ctx);
                    }, 10000);
                } else {
                    if (userComposingStateTimers[userId]) {
                        clearTimeout(userComposingStateTimers[userId]);
                        delete userComposingStateTimers[userId];
                    }
                }

                return numChanged === 1;
            },
        },

        Subscription: {
            userComposingStateChanged: {
                subscribe(root, args, ctx, operation) {
                    return toAsyncIter(
                        new RedisObservable(pubsub.redisSubscriber, 'userComposingStateChanged:*').pipe(
                            map(data => data.data),
                            filter(data => !ctx.connectionCtx.session || ctx.connectionCtx.session.userId !== data.user._id)
                        )
                    );
                },
                resolve(root, args, ctx, operation) {
                    return root;
                }
            }
        }
    }
};
