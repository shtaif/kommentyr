module.exports = {
	env: process.env.APP_ENV || 'development',
	mongodbPoolSize: 6,
    defaultPort: 4443,
	passwordHashSaltRounds: 12,
	sessionMaxAge: 1000 * 60 * 60 * 24 * 1
};
