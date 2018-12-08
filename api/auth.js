const
    UserModel = require('../models/user-model'),
    // UserSession = require('../models/user-session-model'),
    uid = require('uid-safe'),
    bcrypt = require('bcrypt'),
    pubsub = require('./pubsub'),
    { ApiError } = require('./api-errors'),
    config = require('../config');


// (async function() {
//     await UserModel.remove();
//     console.log('DELETED ALL USERS');
// })();


module.exports = {
    typeDef: `
        #type SessionInfo {
        #    authToken: String
        #    createdAt: Date
        #    expires: Date
        #    user: User
        #}

        type Session {
            token: ID
            userId: ID
            createdAt: Date
            expiresAt: Date
        }

        type AuthInfo {
            session: Session
            user: User
        }

        extend type Query {
            getCurrentSessions: [Session!]

            checkToken(
                authToken: String
            ): Boolean
        }

        extend type Mutation {
            signUp(
                email: String
                password: String
            ): User

            authenticate(
                email: String
                password: String
            ): AuthInfo

            unauthenticate(
                authToken: String
            ): Boolean
        }
    `,

    resolvers: {
        Query: {
            async getCurrentSessions(_, args, ctx) {
                // return await UserSession.findAll({
                //     where: { userId: ctx.connectionCtx.session.userId }
                // });
                return await ctx.sessionManager.getMany({ userId: ctx.connectionCtx.session.userId });
            },


            async checkToken(root, args, ctx) {
                return true;
            }
        },


        Mutation: {
            async signUp(root, args, ctx) {
                /* *** */ /* *** */ /* *** */
                // await UserModel.remove();
                /* *** */ /* *** */ /* *** */

                if (!args.email || !args.password) {
                    throw new ApiError('ERR_MISSING_PARAMS', 'Missing required parameters');
                }

                let existing = await UserModel.findOne({email: args.email});

                if (existing) {
                    throw new ApiError('ERR_EMAIL_EXISTS', 'An account with this email already exists');
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


            async authenticate(root, args, ctx) {
                if (!args.email || !args.password) {
                    throw new ApiError('ERR_MISSING_PARAMS', 'Missing required parameters');
                }

                let user;

                try {
                    user = await UserModel.findOne({email: args.email});
                    if (!user) throw null;
                    let result = await bcrypt.compare(args.password, user.password);
                    if (!result) throw null;
                }
                catch (err) {
                    throw new ApiError('ERR_NO_MATCH', "Couldn't match supplied email and password");
                }

                const now = new Date;
                const authToken = `${now.getTime()}-${await uid(24)}`;
                const sessionTimeToLive = 1000 * 60 * 2;
                const createdAt = new Date(now.getTime());
                const expires = new Date(now.getTime() + sessionTimeToLive);

                await ctx.redisPublisher
                    .multi()
                    .set(`user-session:${authToken}`, JSON.stringify({
                        userId: user._id.toString(),
                        createdAt: createdAt.toISOString(),
                        expires: expires.toISOString()
                    }))
                    .pexpireat(`user-session:${authToken}`, expires.getTime())
                    .exec();

                // const session = await UserSession.create({
                //     token: authToken,
                //     userId: user._id.toString(),
                //     expiresAt: expires.toISOString()
                //     // createdAt: createdAt.toISOString()
                // });
                const session = await ctx.sessionManager.create(
                    user._id.toString(),
                    1000 * 60 * 2
                );

                return { session, user };
            },


            async unauthenticate(root, args, ctx) {
                // console.log('SIGN-OUT:', ctx.connectionCtx);
                //TODO: If attempting to delete a token that isn't the current one being used,
                //TODO: add here a check that that token's session is related to the same user ID as the session of the current one being used
                if (args.authToken === '') {
                    throw new ApiError('ERR_INVALID_PARAMS', "Invalid `authToken` supplied");
                }

                let authTokenToUse = args.authToken || ctx.connectionCtx.authToken;

                // await ctx.sessionStore.destroy(authTokenToUse);

                await ctx.redisPublisher.del(`user-session:${authTokenToUse}`);

                // await UserSession.destroy({ where: { token: authTokenToUse } });
                await ctx.sessionManager.destroy({ token: authTokenToUse });

                await ctx.redisPublisher.publish(`sessionInvalidated:deleted:${authTokenToUse}`, JSON.stringify({
                    date: new Date().toISOString()
                }));

                if (authTokenToUse === ctx.connectionCtx.authToken) {
                    ctx.connectionCtx.session = null;
                }

                return true;
            }
        }
    }
};
