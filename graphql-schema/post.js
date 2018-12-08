const
    gql = require('graphql-tag'),
    { ApiError } = require('./errors'),
    { isAuthenticatedResolver } = require('./common-resolvers');



module.exports = {
    typeDef: gql`
        type Post {
            id: ID
            authorId: ID
            text: String
            createdAt: Date
            author: User
            comments: [Comment!]!
        }

        extend type Query {
            getPost (
                id: ID!
            ): Post
            getPosts (
                ids: [ID]
                authorId: ID
                fromDate: Date
                toDate: Date
            ): [Post!]
        }

        extend type Mutation {
            createPost (
                text: String
            ) : Post
        }
    `,

    resolvers: {
        
    }
};
