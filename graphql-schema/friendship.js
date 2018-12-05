const
    gql = require('graphql-tag'),
    UserModel = require('../models/user-model'),
    FriendshipModel = require('../models/friendship-model'),
    { ImprovedDataLoader } = require('../tools/data-loader'),
    { ApiError } = require('./errors'),
    { isAuthenticatedResolver } = require('./common-resolvers'),
    { userDataLoaderSingle } = require('../tools/user-data-loader');


const friendshipLoaderSingle = new ImprovedDataLoader(
    async idPairs => await FriendshipModel.find({
        // $or: idPairs.map(([ id1, id2 ]) => (
        //     {userId1: id1, userId2: id2},
        //     {userId1: id2, userId2: id1}
        // ))
        $or: idPairs.map(([ id1, id2 ]) => ({
            $or: [
                {userId1: id1, userId2: id2},
                {userId1: id2, userId2: id1}
            ]
        }))
    }),
    ([ id1, id2 ], { userId1, userId2 }) => id1 === userId1 && id2 === userId2
);


(async () => {
    await FriendshipModel.remove();
})();


module.exports = {
    typeDef: gql`
        type Friendship {
            userId1: ID
            userId2: ID
            sentAt: Date
            acceptedAt: Date
            status: FriendshipStatus
            user1: User
            user2: User
        }

        enum FriendshipStatus {
            pending
            accepted
            rejected
        }

        extend type Query {
            getFriendship(
                ids: [ID!]!
            ): Friendship

            getFriendships(
                ofId: ID!
                isIdInitiator: Boolean
                status: FriendshipStatus
            ): [Friendship]

            getMutualFriends(
                ids: [ID!]!
            ): [User]
        }

        extend type Mutation {
            createFriendship(
                id1: ID!
                id2: ID!
            ): Friendship

            updateFriendship(
                id1: ID!
                id2: ID!
                newStatus: FriendshipStatus
            ): Friendship
        }
    `,

    resolvers: {
        Friendship: {
            async user1({ userId1 }, args, ctx, operation) {
                return await userDataLoaderSingle.load(userId1);
            },

            async user2({ userId2 }, args, ctx, operation) {
                return await userDataLoaderSingle.load(userId2);
            }
        },

        Query: {
            async getFriendship(root, { ids }, ctx, operation) {
                if (ids.length !== 2) {
                    throw new Error('`ids` must contain exactly 2 user IDs');
                }
                // return await friendshipLoaderSingle.load(ids);
                let fr = await FriendshipModel.findOne({
                    $or: [
                        { userId1: ids[0], userId2: ids[1] },
                        { userId1: ids[1], userId2: ids[0] },
                    ]
                });
                return fr;
            },

            async getFriendships(root, { ofId, isIdInitiator, status }, ctx, operation) {
                let criteria = {};
                if (isIdInitiator === null || isIdInitiator === undefined) {
                    criteria.$or = [
                        { userId1: ofId },
                        { userId2: ofId }
                    ];
                } else if (isIdInitiator === true) {
                    criteria.userId1 = ofId;
                } else if (isIdInitiator === false) {
                    criteria.userId2 = ofId;
                }
                if (status) {
                    criteria.status = status;
                }
                let frs = await FriendshipModel.find(criteria);
                return frs;
            },

            async getMutualFriends(root, args, ctx, operation) {
                if (ids.length !== 2) {
                    throw new Error('`ids` must contain exactly 2 user IDs');
                }

                if (!ctx.connectionCtx.session || !ids.includes(ctx.connectionCtx.session.userId)) {
                    throw new Error('Not permitted to do this');
                }

                let friendships = await FriendshipModel.find({
                    $or: [
                        { userId1: args.ids[0] },
                        { userId2: args.ids[0] }
                    ]
                }, 'userId1 userId2');

                console.log('friendships', friendships);

                let friendIds = friendships.map(item => {
                    return item.userId1.toString() === args.ids[0] ? item.userId2.toString() : item.userId1.toString();
                });

                let mutualFriendships = await FriendshipModel.find({
                    $or: [
                        {
                            userId1: args.ids[1],
                            userId2: { $in: friendIds }
                        },
                        {
                            userId1: { $in: friendIds },
                            userId2: args.ids[1]
                        },
                    ]
                });

                console.log('mutualFriendships', mutualFriendships);

                let mutualFriendIds = mutualFriendships.map(item => {
                    return item.userId1.toString() === args.ids[1] ? item.userId2.toString() : item.userId1.toString();
                });

                return await await UserModel.find({
                    _id: { $in: mutualFriendIds }
                });
            }
        },

        Mutation: {
            createFriendship: isAuthenticatedResolver.createResolver(async (root, { id1, id2 }, ctx, operation) => {
                if (ctx.connectionCtx.session.userId !== id1) {
                    throw new ApiError(null, "Current session is not authenticated for ID "+id1+" being the initiator's ID");
                }

                if (id1 === id2) {
                    throw new ApiError(null, "`id1` and `id2` parameters must not be equal");
                }

                let existingFriendship = await module.exports.resolvers.Query.getFriendship(null, { ids: [id1, id2] }, ctx);
                if (existingFriendship) {
                    switch (existingFriendship.status) {
                        case 'pending': throw new ApiError('ERR_FRIENDSHIP_EXISTS', "Specified user IDs are already in a pending friendship request");
                        case 'accepted': throw new ApiError('ERR_FRIENDSHIP_EXISTS', "Specified user IDs are already friends");
                        case 'rejected': throw new ApiError('ERR_FRIENDSHIP_EXISTS', "Specified user IDs' friendship was rejected");
                        default: throw new ApiError('ERR_FRIENDSHIP_EXISTS', "Unkown error");
                    }
                }

                let fr = await FriendshipModel.create({
                    userId1: id1,
                    userId2: id2,
                    sentAt: new Date
                });

                return fr;
            }),

            updateFriendship: isAuthenticatedResolver.createResolver(async (root, { id1, id2, newStatus }, ctx, operation) => {
                if (newStatus !== 'accepted' && newStatus !== 'rejected') {
                    throw new ApiError(null, 'Only "accepted" and "rejected" are allowed as values for `newStatus`');
                }
                if (id2 !== ctx.connectionCtx.session.userId) {
                    throw new ApiError(null, null);
                }
                let fr = await FriendshipModel.findOne({
                    userId1: id1,
                    userId2: id2
                });
                if (fr.status !== 'pending') {
                    throw new ApiError(null, 'Only friendships with "pending" status are possible to be updated');
                }
                fr.status = newStatus;
                await fr.save();
                return fr;
            })
        }
    }
};
