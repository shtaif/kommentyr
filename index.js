process.title = 'Kommentyr';


const
	Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
	http2 = require('http2'),
	crypto = require('crypto'),
	Koa = require('koa'),
	koaCompose = require('koa-compose'),
	KoaRouter = require('koa-router'),
	koaStatic = require('koa-static'),
	koaLogger = require('koa-logger'),
	koaCompress = require('koa-compress'),
    koaBodyparser = require('koa-bodyparser'),
    koaCors = require('koa2-cors'),
	mongoose = require('mongoose'),
	{ magenta } = require('cli-color'),
	CommentModel = require('./models/comment-model'),
	commentsApiMiddleware = require('./api/comments-api-router'),
    config = require('./config');
	// myKoaH2Push = require('./lib/my-koa-h2-push'),
	// OnCleanup = require('./lib/on-cleanup'),



(async () => {
	try {
		if (!process.env.KMTR_DB_URI) {
			throw new Error(
				'No MongoDB URI was configured!' + "\n" +
				'Please set it into the KMTR_DB_URI environment variable.'
			);
		}

		let [ , tlsKey, tlsCert ] = await Promise.all([
			mongoose.connect(process.env.KMTR_DB_URI, {poolSize: config.mongodbPoolSize}),
			fs.readFileAsync('./tls.key'),
			fs.readFileAsync('./tls.cert')
		]);

		// CommentModel.remove({}, function() {
		// 	console.log(arguments);
		// 	console.log('REMOVED ALL');
		// });

		let server = Promise.promisifyAll(
            http2.createSecureServer(
    			{
                    key: tlsKey,
                    cert: tlsCert,
                    requestCert: false,
                    rejectUnauthorized: false,
                    allowHTTP1: true,
                    settings: {enablePush: true}
    			},
				new Koa().use(koaCompose([
					koaLogger(),
    				koaCompress(),
                    koaBodyparser({enableTypes: ['json']}),
                    koaCors({
                        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
                        allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-auth'],
                        credentials: true,
                        origin: '*'
                    }),
    				koaStatic('./frontend/build', {defer: true}),
					// async (ctx, next) => {
					// 	console.log('RUNNING ERROR MIDDLEWARE!');
					// 	try {
					// 		await next();
					//     }
					// 	catch (err) {
					// 		err.status = err.myStatusCode || 500;
					// 		throw err;
					//     }
					// },
					new KoaRouter() // A base for all "API endpoint branches" to sit in as more will add up through time...
						.use('/api/comments', commentsApiMiddleware)
						.routes()
    			]))
                .callback()
    		)
        );

		await server.listenAsync(process.env.KMTR_PORT || config.defaultPort);

		console.info(magenta(`Secure HTTP2 server running on ${server.address().port}`));
	}
	catch (err) {
		console.error(err.stack);
	}
})();
