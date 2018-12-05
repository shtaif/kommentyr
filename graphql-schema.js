const
    { GraphQLScalarType } = require('graphql'),
    { Kind } = require('graphql/language'),
    { makeExecutableSchema } = require('graphql-tools'),
    _merge = require('lodash/merge'),
    pubsub = require('./api/pubsub'),
    UserModel = require('./models/user-model'),
    CommentModel = require('./models/comment-model'),
    { ApiError } = require('./api/api-errors'),
    { typeDef: CommentType, resolvers: commentResolvers } = require('./api/comment'),
    { typeDef: UserType, resolvers: userResolvers } = require('./api/user'),
    { typeDef: FriendshipType, resolvers: friendshipResolvers } = require('./api/friendship'),
    { typeDef: AuthTypeDefs, resolvers: authResolvers } = require('./api/auth'),
    { typeDef: UsersComposingTypeDefs, resolvers: usersComposingResolvers } = require('./api/users-composing');



let graphqlSchema = makeExecutableSchema({
    typeDefs: [
        `
            scalar Date

            type Query {
                _: String
                now: Date
                throwError: String
                throwApiError: String
            }

            type Mutation {
                _: String
            }

            type Subscription {
                _: String
                testSubscription(param: ID!): String
            }
        `,
        CommentType,
        UserType,
        FriendshipType,
        AuthTypeDefs,
        UsersComposingTypeDefs
    ],

    resolvers: _merge(
        {
            Date: new GraphQLScalarType({
                name: 'Date',
                description: 'Date custom scalar type',
                serialize: value => value.toISOString(),
                parseValue: value => new Date(value),
                parseLiteral: ast => ast.kind === Kind.STRING ? new Date(ast.value) : null
            }),

            Query: {
                _(root, args, ctx) {
                    console.log('!!!TEST_QUERY!!!');
                    return 'TEST_QUERY';
                },

                now(root, args, ctx) {
                    return new Date;
                },

                throwError(root, args, ctx) {
					throw new Error('LOL regular error...');
                    return 'Hi!';
                },

                throwApiError(root, args, ctx) {
                    throw new ApiError({
                        errorCode: 'ERR_LOL_API',
                        message: 'Laughing Out Loudly Error!',
                        data: null,
                        internalData: null
                    });
                    // throw new Error('LOL!');
                    return 'Hi!';
                }
            },

            Mutation: {
                _(root, args, ctx) {
                    console.log('!!!TEST_MUTATION!!!');
                    return 'TEST_MUTATION';
                }
            },

            Subscription: {
                _: {
                    subscribe: () => {
                        console.log('!!!TEST_SUBSCRIPTION!!!');
                        return null;
                    }
                },

                testSubscription: {
                    subscribe: () => {
                        console.log('SUBSCRIBE');
                        return pubsub.asyncIterator('testSubscription');
                    },

                    // subscribe: withFilter(
                    //     () => {
                    //         console.log('!!!!!!');
                    //         return pubsub.asyncIterator('testSubscription');
                    //     },
                    //     (payload, variables) => {
                    //         console.log('@@@@@@');
                    //         return true;
                    //         // return payload.testSubscription.repository_name === variables.repoFullName;
                    //     }
                    // )
                }
            }
        },
        commentResolvers,
        userResolvers,
        friendshipResolvers,
        authResolvers,
        usersComposingResolvers,
    )
});

module.exports = graphqlSchema;
