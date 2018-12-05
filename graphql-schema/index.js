const
    { GraphQLScalarType } = require('graphql'),
    gql = require('graphql-tag'),
    { Kind } = require('graphql/language'),
    { makeExecutableSchema } = require('graphql-tools'),
    _merge = require('lodash/merge'),
    { chain } = require('graphql-chain'),
    pubsub = require('./pubsub'),
    UserModel = require('../models/user-model'),
    CommentModel = require('../models/comment-model'),
    { ApiError } = require('./errors'),
    { typeDef: CommentType, resolvers: commentResolvers } = require('./comment'),
    { typeDef: UserType, resolvers: userResolvers } = require('./user'),
    { typeDef: FriendshipType, resolvers: friendshipResolvers } = require('./friendship'),
    { typeDef: AuthTypeDefs, resolvers: authResolvers } = require('./auth'),
    { typeDef: UsersComposingTypeDefs, resolvers: usersComposingResolvers } = require('./users-composing');



let graphqlSchema = makeExecutableSchema({
    typeDefs: [
        gql`
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

    resolvers: (() => {
        const resolvers = _merge(
            {
                Date: new GraphQLScalarType({
                    name: 'Date',
                    description: 'Date custom scalar type',
                    serialize: value => value.toISOString(),
                    parseValue: value => new Date(value),
                    parseLiteral: ast => {
                        if (ast.kind === Kind.STRING) {
                            const date = new Date(ast.value);
                            if (isNaN(date)) {
                                return undefined;
                            }
                            return date;
                        }
                        
                        if (ast.kind === Kind.INT) {
                            return new Date(+ast.value);
                        }
                    }
                }),

                Query: {
                    _(_, args, ctx) {
                        console.log('!!!TEST_QUERY!!!');
                        return 'TEST_QUERY';
                    },

                    now(_, args, ctx) {
                        return new Date;
                    },

                    throwError(_, args, ctx) {
                        throw new Error('LOL regular error...');
                    },

                    throwApiError(_, args, ctx) {
                        throw new ApiError({
                            errorCode: 'ERR_LOL_API',
                            message: 'Laughing Out Loudly Error!',
                            data: null,
                            internalData: null
                        });
                        // throw new Error('LOL!');
                    }
                },

                Mutation: {
                    _(_, args, ctx) {
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
        );

        for (let k in resolvers) {
            for (let j in resolvers[k]) {
                if (resolvers[k][j] instanceof Array) {
                    resolvers[k][j] = chain(resolvers[k][j])();
                }
            }
        }

        return resolvers;
    })()
});

module.exports = graphqlSchema;
