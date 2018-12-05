const
    gql = require('graphql-tag'),
    FriendshipModel = require('../models/friendship-model');
    UserModel = require('../models/user-model');


// (async () => {
//     let results = await UserModel.find({});
//     console.log('RESULTS', results.map(item => item._id.toString()));
// })();


module.exports = {
    typeDef: gql`
        type User {
            _id: ID
            name: String
            email: String
            emailHash: String
            friendship(userId: ID!): Friendship
            friendships(userIds: [ID]): [Friendship]
        }

        extend type Query {
            getUser(id: ID): User
            getCurrentUser: User
        }

        extend type Mutation {
            updateUser(id: ID, name: String): User
        }
    `,

    resolvers: {
        User: {
            async friendship(root, args, ctx, operation) {
                return await FriendshipModel.findOne({
                    $or: [
                        { userId1: root._id, userId2: args.userId },
                        { userId1: args.userId, userId2: root._id },
                    ]
                });
            },

            async friendships(root, args, ctx, operation) {
                let allUsers = await UserModel.find();
                let friends = allUsers
                    .filter(user => {
                        return (args.userIds && args.userIds.includes(user._id.toString())) &&
                        user._id.toString() !== root._id.toString();
                    })
                    .map(user => ({
                        userId1: root._id.toString(),
                        userId2: user._id.toString(),
                        sentAt: (() => {
                            let date = new Date;
                            date.setDate(date.getDate() - 1);
                            return date;
                        })(),
                        acceptedAt: (() => {
                            let date = new Date;
                            date.setDate(date.getDate() - 2);
                            return date;
                        })(),
                        status: 'accepted',
                        user1: root,
                        user2: user
                    }));
                return friends;

                // return await FriendshipModel.find({
                //     $or: [
                //         { userId1: root._id },
                //         { userId2: root._id },
                //     ]
                // });
            }
        },

        Query: {
            async getUser(root, args, ctx, operation) {
                return await UserModel.findOne({ _id: args.id });
            },

            async getCurrentUser(root, args, ctx, operation) {
                if (ctx.connectionCtx && ctx.connectionCtx.session && ctx.connectionCtx.session.userId) {
                    return await UserModel.findOne({ _id: ctx.connectionCtx.session.userId });
                } else {
                    return null;
                }
            }
        },

        Mutation: {
            async updateUser(root, args, ctx, operation) {
                return await UserModel.findAndUpdate(
                    { _id: args.id },
                    { name: args.name }
                );
            }
        }
    }
};
