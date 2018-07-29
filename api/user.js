const
    UserModel = require('../models/user-model');


module.exports = {
    typeDef: `
        type User {
            _id: ID
            name: String
            email: String
            emailHash: String
        }
    `,
    resolvers: {}
};
