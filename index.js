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
	koaCors = require('@koa/cors'),
	koaLogger = require('koa-logger'),
	koaCompress = require('koa-compress'),
	koaBodyparser = require('koa-bodyparser'),
	koaSession = require('koa-session'),
	KoaSessionMongoose = require('koa-session-mongoose'),
	koaSend = require('koa-send'),
	koaGraphql = require('koa-graphql'),
	mongoose = require('mongoose'),
	{ magenta } = require('cli-color'),
	CommentModel = require('./models/comment-model'),
	UserModel = require('./models/user-model'),
	graphqlSchema = require('./graphql-schema'),
	commentsApiMiddleware = require('./api/comments-api-router'),
	authApiMiddleware = require('./api/auth-api-router'),
	config = require('./config');


async function init() {
	console.log('INIT');
};
(async () => {
	try {
		// Verifiy database connection string was defined as the `KMTR_DB_URI` env var
		if (!process.env.KMTR_DB_URI) {
			throw new Error(
				`No MongoDB URI was configured!
				Please set it into the KMTR_DB_URI environment variable.`
			);
		}

		// Establish DB connection + read TLS assets to memory needed for the HTTP2 server
		let [ dbConnection , tlsKey, tlsCert ] = await Promise.all([
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
				(() => {
					let koa = new Koa();
					koa.keys = ['albert_hoffman'];
					return koa.use(koaCompose([
						koaLogger(),
						koaCompress(),
						koaStatic('./frontend/build', {defer: true}),
						koaBodyparser({enableTypes: ['json']}),
						koaCors({
							origin: ctx => ctx.request.header.origin,
							credentials: true,
	                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
	                        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-auth'],
	                    }),
						koaSession({
							key: 'kommentyr_session',
							maxAge: config.sessionMaxAge,
							overwrite: true,
							httpOnly: true,
							signed: true,
							rolling: true,
							renew: false,
							store: new KoaSessionMongoose({
								connection: dbConnection,
								expires: config.sessionMaxAge
							})
						}, koa),
						async function(ctx, next) {
							// console.log('_________', ctx.session);
							await next();
						},
						new KoaRouter() // A base for all "API endpoint branches" to sit in as more will add up through time...
							.options('*', async ctx => {
								ctx.body = '';
							})
							.get('/', async ctx => {
								await koaSend(ctx, './frontend/build/index.html');
							})
							.all('/graphql-api', koaGraphql({
								schema: graphqlSchema,
								graphiql: true
							}))
							.use('/api',
								new KoaRouter()
									.use('/auth', authApiMiddleware)
									.use('/comments', commentsApiMiddleware)
									.routes()
							)
							.routes()
					]))
					.callback();
				})()
			)
		);

		await server.listenAsync({port: process.env.KMTR_PORT || config.defaultPort});

		console.info(magenta(`Secure HTTP2 server running on ${server.address().port}`));
	}
	catch (err) {
		console.error('App failed to start...'+"\n", err);
		process.exit(1);
	}
})();
