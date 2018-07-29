const
    UserModel = require('../models/user-model'),
    crypto = require('crypto'),
    bcrypt = require('bcrypt'),
    ApiError = require('./api-error'),
    config = require('../config');


// (async function() {
//     await UserModel.remove();
//     console.log('DELETED ALL USERS');
// })();

module.exports = {
    typeDef: `
        extend type Mutation {
            signUp(
                email: String
                password: String
            ): User

            signIn(
                email: String
                password: String
            ): User

            signOut: Boolean
        }
    `,

    resolvers: {
        Mutation: {
            async signUp(root, args, ctx) {
                /* *** */ /* *** */ /* *** */
                // await UserModel.remove();
                /* *** */ /* *** */ /* *** */

                if (!args.email || !args.password) {
                    throw new ApiError('ERR_MISSING_PARAMS', 'Missing required parameters', 400);
                }

                let existing = await UserModel.findOne({email: args.email});

                if (existing) {
                    console.log('EXISTING', existing);
                    throw new ApiError('ERR_EMAIL_EXISTS', 'An account with this email already exists', 400);
                }

                let hashedPassword = await bcrypt.hash(args.password, config.passwordHashSaltRounds);

                let newUser = await new UserModel({
                    name: args.name || null,
                    email: args.email,
                    password: hashedPassword
                })
                .save();

                return newUser;
            },

            async signIn(root, args, ctx) {
                if (!args.email || !args.password) {
                    throw new ApiError('ERR_MISSING_PARAMS', 'Missing required parameters', 400);
                }

                let user;

                try {
                    user = await UserModel.findOne({email: args.email});

                    if (!user)
                        throw new Error;

                    let result = await bcrypt.compare(args.password, user.password);

                    if (!result)
                        throw new Error;
                }
                catch (err) {
                    throw new ApiError('ERR_NO_MATCH', "Couldn't match supplied email and password", 400);
                }

                ctx.session.userId = user.id;

                return user;
            },

            async signOut(root, args, ctx) {
                ctx.session.userId = null;
                return true;
            }
        }
    }
};
