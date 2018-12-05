const
    { UnauthenticatedError } = require('./api-errors'),
    { createResolver } = require('apollo-resolvers');


module.exports.isAuthenticatedResolver = createResolver(
    (root, args, ctx, operation) => {
        if (!ctx.connectionCtx.session || !ctx.connectionCtx.session.userId) {
            throw new UnauthenticatedError();
        }
    }
);
