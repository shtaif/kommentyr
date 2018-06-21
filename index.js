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
	koaSend = require('koa-send'),
	mongoose = require('mongoose'),
	{ magenta } = require('cli-color'),
	CommentModel = require('./models/comment-model'),
	commentsApiMiddleware = require('./api/comments-api-router'),
	config = require('./config');



(async () => {
	try {
		// Verifiy database connection string was defined as the `KMTR_DB_URI` env var
		if (!process.env.KMTR_DB_URI) {
			throw new Error(
				'No MongoDB URI was configured!' + "\n" +
				'Please set it into the KMTR_DB_URI environment variable.'
			);
		}

		// Establish DB connection + read TLS assets to memory needed for the HTTP2 server
		let [ , tlsKey, tlsCert ] = await Promise.all([
			mongoose.connect(process.env.KMTR_DB_URI, {poolSize: config.mongodbPoolSize}),
			fs.readFileAsync('./tls.key'),
			fs.readFileAsync('./tls.cert')
		]);

		// Create a Node.js HTTP2 server and pass it a fully-middlewared Koa app
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
					koaStatic('./frontend/build', {defer: true}),
					new KoaRouter() // A base for all "API endpoint branches" to sit in as more will add up through time...
						.get('/', async ctx => {
							await koaSend(ctx, './frontend/build/index.html');
						})
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
		console.error('App failed to start...'+"\n", err);
		process.exit(1);
	}
})();
