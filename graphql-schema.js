const
    { makeExecutableSchema } = require('graphql-tools'),
    { typeDef: CommentType, resolvers: CommentResolvers } = require('./api/comment'),
    { typeDef: UserType, resolvers: UserResolvers } = require('./api/user'),
    { typeDef: AuthTypeDefs, resolvers: AuthResolvers } = require('./api/auth'),
    { PubSub, withFilter } = require('graphql-subscriptions'),
    _merge = require('lodash/merge'),
    CommentModel = require('./models/comment-model');


let graphqlSchema = makeExecutableSchema({
    typeDefs: [
        `
            type Query {
                test: String
            }

            type Mutation {
                updateComment___(_id: ID!, text: String!): Comment
            }

            type Subscription {
                testSubscription(param: ID!): Comment
            }
        `,
        CommentType,
        UserType,
        AuthTypeDefs
    ],
    resolvers: _merge(
        CommentResolvers,
        UserResolvers,
        AuthResolvers,
        (() => {
            return {
                Query: {
                    test(root, args, ctx) {
                        console.log('!!!TEST!!!');
                        return 'TEST';
                    }
                }
            };
        })(),
        (() => {
            const pubsub = new PubSub();
            return {
                Subscription: {
                    testSubscription: {
                        // resolve(root, args, ctx, schema) {
                        //     // console.log('TEST_SUBSCRIPTION_RESOLVE', arguments.length, [ ...arguments ]);
                        //     console.log('TEST_SUBSCRIPTION_RESOLVE', [ ...arguments ]);
                        // },
                        // subscribe() {
                        //     console.log('TEST_SUBSCRIPTION_SUBSCRIBE', [ ...arguments ]);
                        // }
                        subscribe: withFilter(
                            () => {
                                console.log('!!!!!!');
                                return pubsub.asyncIterator('testSubscription');
                            },
                            (payload, variables) => {
                                console.log('@@@@@@');
                                return payload.testSubscription.repository_name === variables.repoFullName;
                            }
                        ),
                    }
                }
            };
        })(),
    )
});

module.exports = graphqlSchema;
