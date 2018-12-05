module.exports = {
	mongodbPoolSize: 6,
    defaultPort: 4443,
	passwordHashSaltRounds: 12,
	sessionMaxAge: 1000 * 60 * 60 * 24 * 1,
	redisOpts: {
		showFriendlyErrorStack: true,
		retryStrategy: options => { // reconnect after:
			return Math.max(options.attempt * 100, 3000);
		}
	}
};
