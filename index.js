process.title = `Kommentyr ${process.env.NODE_ENV ? `(${process.env.NODE_ENV})` : ''}`;

const dotenv = require('dotenv');
dotenv.config();

const
	Promise = require('bluebird'),
	{ promises: fsp } = require('fs'),
	http = require('http'),
	https = require('https'),
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
	// koaSession = require('koa-session'),
	KoaSessionMongoose = require('koa-session-mongoose'),
	// { koaCookie } = require('koa-cookie'),
	koaBearerToken = require('koa-bearer-token'),
	koaSend = require('koa-send'),
	koaGraphql = require('koa-graphql'),
	{ ApolloServer } = require('apollo-server-koa'),
	{ default: koaPlayground } = require('graphql-playground-middleware-koa'),
<<<<<<< HEAD
	{ koa: koaVoyager } = require('graphql-voyager/middleware'),
=======
>>>>>>> ec6c5c86550df504601e718cd681258462141639
	// c2k = require('koa-connect'),
	mongoose = require('mongoose'),
	Redis = require('ioredis'),
	{ first } = require('rxjs/operators'),
	{ RedisPubSub } = require('graphql-redis-subscriptions'),
	{ execute, subscribe } = require('graphql'),
	{ SubscriptionServer } = require('subscriptions-transport-ws'),
	{ magenta } = require('cli-color'),
	// kafka = require('node-rdkafka'),
	CommentModel = require('./models/comment-model'),
	UserModel = require('./models/user-model'),
	// graphqlSchema = require('./graphql-schema'),
	graphqlSchema = require('./graphql-schema/index'),
	commentsApiMiddleware = require('./api/comments-api-router'),
	authApiMiddleware = require('./api/auth-api-router'),
	{ ApiError, UnknownError: UnknownApiError } = require('./api/api-errors'),
	RedisObservable = require('./tools/redis-observable'),
<<<<<<< HEAD
	// sequelize = require('./tools/sequelize-connection'),
=======
	sequelize = require('./tools/sequelize-connection'),
>>>>>>> ec6c5c86550df504601e718cd681258462141639
	SessionManager = require('./tools/session-manager/index'),
	_each = require('lodash/each'),
	_partition = require('lodash/partition'),
	_find = require('lodash/find'),
	config = require('./config');


(async () => {
	try {
		// let result = await require('axios').get('http://localhost:4445/79.183.19.101');
		// console.log('RESULT.DATA', result.data);

		// Verifiy required environment config parameters were defined
		// if (!process.env.KMTR_DB_URI) {
		// 	throw new Error(
		// 		`No MongoDB URI was configured!
		// 		Please set it into the KMTR_DB_URI environment variable.`
		// 	);
		// } else if (!process.env.KMTR_REDIS_URI) {
		// 	throw new Error(
		// 		`No Redis URI was configured!
		// 		Please set it into the KMTR_REDIS_URI environment variable.`
		// 	);
		// } else if (!process.env.KMTR_KAFKA_HOST) {
		// 	throw new Error(
		// 		`No Kafka host was configured!
		// 		Please set it into the KMTR_KAFKA_HOST environment variable.`
		// 	);
		// } else if (!process.env.KMTR_TLS_KEY_PATH) {
		// 	throw new Error(
		// 		`No path of a TLS key was configured!
		// 		Please set it into the KMTR_TLS_KEY_PATH environment variable.`
		// 	);
		// } else if (!process.env.KMTR_TLS_CERT_PATH) {
		// 	throw new Error(
		// 		`No path of a TLS cert was configured!
		// 		Please set it into the KMTR_TLS_CERT_PATH environment variable.`
		// 	);
		// }
		_each({
			KMTR_DB_URI: 'MongoDB URI',
			KMTR_REDIS_URI: 'Redis URI',
			KMTR_KAFKA_HOST: 'Kafka host',
			KMTR_TLS_KEY_PATH: 'path of a TLS key',
			KMTR_TLS_CERT_PATH: 'path of a TLS cert'
		}, (v, k) => {
			if (!process.env[k]) {
				throw new Error(
					`No ${v} was configured!
					Please set it into the ${k} environment variable.`
				);
			}
		});
		
<<<<<<< HEAD
		// const sessionManager = new SessionManager(sequelize);
		const sessionManager = null;
=======
		const sessionManager = new SessionManager(sequelize);
>>>>>>> ec6c5c86550df504601e718cd681258462141639
		
		// Establish DB connection + read TLS assets to memory needed for the HTTP2 server
		const [
			dbConnection,
			tlsKey,
			tlsCert,
			redisPublisher,
			redisSubscriber,
			kafkaProducer,
			kafkaConsumer
		]
		= await Promise.all([
			mongoose.connect(process.env.KMTR_DB_URI, {poolSize: config.mongodbPoolSize}),

			fsp.readFile(process.env.KMTR_TLS_KEY_PATH),

			fsp.readFile(process.env.KMTR_TLS_CERT_PATH),

			...new Array(2).fill().map(async () => {
<<<<<<< HEAD
				return null;
				// return await new Promise((resolve, reject) => {
				// 	const client = new Redis(process.env.KMTR_REDIS_URI, config.redisOpts);
				// 	client.once('connect', () => resolve(client));
				// 	client.once('error', reject);
				// });
=======
				return await new Promise((resolve, reject) => {
					const client = new Redis(process.env.KMTR_REDIS_URI, config.redisOpts);
					client.once('connect', () => resolve(client));
					client.once('error', reject);
				});
>>>>>>> ec6c5c86550df504601e718cd681258462141639
			}),

			new Promise((resolve, reject) => {
				resolve(null);
				// const client = Promise.promisifyAll(new kafka.Producer({
				// 	'metadata.broker.list': process.env.KMTR_KAFKA_HOST,
				// 	'group.id': 'kafka'
				// }));
				// client.setPollInterval(250);
				// client
				// 	.connect()
				// 	.once('ready', () => resolve(client))
				// 	.once('event.error', reject);
			}),

			new Promise((resolve, reject) => {
				resolve(null);
			// 	const client = Promise.promisifyAll(new kafka.Consumer({
			// 		'metadata.broker.list': process.env.KMTR_KAFKA_HOST,
			// 		'group.id': 'kafka',
			// 		'topic.metadata.refresh.interval.ms': 1000 // Default was 300000ms (30s)
			// 	}, {}))
			// 	.connect()
			// 	.once('ready', () => resolve(client))
			// 	.once('event.error', reject);
			}),

<<<<<<< HEAD
			// sequelize.sync({ alter: true })
=======
			sequelize.sync({ alter: true })
>>>>>>> ec6c5c86550df504601e718cd681258462141639
		]);

		// let counter = 1;
		// let intervalId = setInterval(async () => {
		// 	try {
		// 		let msg = `Awesome message ${counter++}`;
		// 		console.log('SENDING MESSAGE:', msg);
		// 		let result = kafkaProducer.produce(
		// 			'test-topic',
		// 			null,
		// 			new Buffer(msg),
		// 			// 'Stormwind',
		// 			// Date.now()
		// 		);
		// 		if (counter > 40) {
		// 			clearInterval(intervalId);
		// 		}
		// 		await kafkaProducer.flushAsync(500);
		// 		console.log('FLUSH');
		// 	} catch (err) {
		// 		console.error('A problem occurred when sending our message', err);
		// 	}
	    // }, 1000);
		//
		// // setTimeout(() => {
		// // 	console.log('FINISHED SENDING MESSAGES');
		// // 	clearInterval(intervalId);
		// // }, 6000);
		//
		// setTimeout(() => {
		// 	console.log('STARTING CONSUMER');
		// 	kafkaConsumer.subscribe(['test-topic']);
		// 	kafkaConsumer.consume();
		// 	// setInterval(async () => {
		// 	// 	try {
		// 	// 		let message = await kafkaConsumer.consumeAsync(1);
		// 	// 		// console.log('MESSAGE', message);
		// 	// 	} catch (err) {
		// 	// 		console.log('ERR', err);
		// 	// 	}
		// 	// }, 1000);
		// 	kafkaConsumer.on('data', data => {
		// 		console.log('GOT MESSAGE:', data.value.toString());
		// 		// console.log('DATA', data);
		// 	});
		// }, 3000);

<<<<<<< HEAD
		// const pubsub = new RedisPubSub({
		//     publisher: redisPublisher,
		//     subscriber: redisSubscriber
		// });
		const pubsub = null;
=======
		const pubsub = new RedisPubSub({
		    publisher: redisPublisher,
		    subscriber: redisSubscriber
		});
>>>>>>> ec6c5c86550df504601e718cd681258462141639

		const koaSessionMongoose = new KoaSessionMongoose({
			connection: dbConnection,
			expires: config.sessionMaxAge
		});

		const gqlCommonContext = {
			pubsub,
			redisPublisher,
			redisSubscriber,
			kafkaProducer,
			kafkaConsumer,
			sessionManager
		};

		const koaApp = (() => {
			const koa = new Koa();
			koa.keys = ['albert_hoffman'];
			koa.use(koaCompose([
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
				// koaSession({
				// 	key: 'kommentyr_session',
				// 	maxAge: config.sessionMaxAge,
				// 	overwrite: true,
				// 	httpOnly: true,
				// 	signed: true,
				// 	rolling: true,
				// 	renew: false,
				// 	// store: koaSessionMongoose
				// 	store: {
				// 		async get(key, maxAge, { rolling }) {
				// 			const session = await sessionManager.getOne({ token: key });
				// 			return session;
				// 		},
				// 		async set(key, session, maxAge, { rolling, changed }) {
				// 			if (rolling) {
				// 				await sessionManager.updateTtl(key, maxAge);
				// 			}
				// 		},
				// 		async destroy(key) {
				// 			await sessionManager.destroy([key]);
				// 		}
				// 	}
				// }, koa),
				// koaCookie(),
				// async (ctx, next) => {
				// 	const cookieKey = 'kommentyr_token';

				// 	ctx.kommentyrSessions = [];

				// 	const tokenCookies = Object.keys(ctx.cookies)
				// 		.filter(key => ctx.cookies[key].startsWith(`${cookieKey}.`))
				// 		.map(key => ({
				// 			key,
				// 			value: ctx.cookies[key]
				// 		}));

				// 	if (!tokenCookies.length) {
				// 		return await next();
				// 	}

				// 	const sessions = await sessionManager.getMany({ token: tokenCookies.map(item => item.value) });

				// 	const [ /*validTokenCookies*/ , invalidTokenCookies ] = _partition(tokenCookies, tokenCookie => {
				// 		return _find(sessions, { token: tokenCookie.key });
				// 	});

				// 	if (invalidTokenCookies.length) {
				// 		for (let tokenCookie of invalidTokenCookies) {
				// 			ctx.set('set-cookie', `${tokenCookie.key}=${tokenCookie.value}; max-age=0;`);
				// 		}
				// 		throw new Error(`Some of the provided tokens were not valid: "${tokensNotFound.join('", "')}"`);
				// 	}

				// 	await Promise.all(
				// 		ctx.kommentyrSessions
				// 			.filter(session => session.isRolling)
				// 			.map(async session => {
				// 				await sessionManager.updateTtl(session.token, opts.maxAge);
				// 				session.expiresAt = new Date(Date.now() + opts.maxAge);
				// 			})
				// 	);

				// 	return await next();
				// },
				koaBearerToken(),
				async (ctx, next) => {
					ctx.kommentyrSessions = [];

					if (!ctx.request.token) {
						return await next();
					}

					const tokens = ctx.request.token
						.split('|')
						.filter(token => token !== '')
						.map(token => token.trim());

					const sessions = await sessionManager.getMany({ token: tokens });

					const [ /*validTokens*/ , invalidTokens ] = _partition(tokens, token => _find(sessions, { token }));

					if (invalidTokens.length) {
						ctx.status = 401;
						ctx.body = {
							error: `Request contained tokens that aren't valid:\n${invalidTokens.map(tk => `- "${tk}"`).join('\n')}`,
							errorCode: 'INVALID_AUTH_TOKENS',
							data: { tokensNotValid: invalidTokens }
						};
						return;
					}

					await Promise.all(
						sessions
							.filter(session => session.isRolling)
							.map(async session => {
								await sessionManager.updateTtl(session.token, opts.maxAge);
								session.expiresAt = new Date(Date.now() + opts.maxAge);
							})
					);

					ctx.kommentyrSessions.push(...sessions);

					// return await Promise.all([
					// 	next(),
					// 	...sessions
					// 		.filter(session => session.isRolling)
					// 		.map(async session => {
					// 			await sessionManager.updateTtl(session.token, opts.maxAge);
					// 			session.expiresAt = new Date(Date.now() + opts.maxAge);
					// 		})
					// ]);

					return await next();
				},
				new KoaRouter() // A base for all "API endpoint branches" to sit in as more will add up through time...
					.options('*', async ctx => {
						ctx.body = '';
					})
					.get('/', async ctx => {
						await koaSend(ctx, './frontend/build/index.html');
					})
					.get('/test', async ctx => {
						// koaSessionMongoose;
						// if (!ctx.session.count) {
						// 	ctx.session.count = 0;
						// }
						// ctx.session.count++;
						// ctx.session.test = 'TEST';
						ctx.body = 'Test Page';
					})
<<<<<<< HEAD
					.all('/voyager', koaVoyager({
						endpointUrl: '/graphql-api'
					}))
=======
>>>>>>> ec6c5c86550df504601e718cd681258462141639
					.get('/playground', koaPlayground({
						endpoint: '/graphql-api'
					}))
					.post('/graphql-api',
						async (ctx, next) => {
							await next();

							if (!ctx.body.errors) {
								return;
							}
							
							ctx.body.errors = ctx.body.errors.map(error => {
								if (error.originalError instanceof Error) {
									console.log(error.originalError);
	
									const errorInstance = error.originalError instanceof ApiError ? error.originalError : new UnknownApiError;
	
									return {
										errorCode: errorInstance.errorCode,
										message: errorInstance.message,
										data: errorInstance.data,
										thrownAt: errorInstance.thrownAt,
										locations: error.locations,
										path: error.path,
										stack: (() => {
											if (process.NODE_ENV !== 'production') {
												return error.stack ? error.stack.split('\n') : [];
<<<<<<< HEAD
											}
											return undefined;
=======
											} else {
												return undefined;
											}
>>>>>>> ec6c5c86550df504601e718cd681258462141639
										})()
									};
								} else {
									return error;
								}
							});
						},
						koaGraphql(req => ({
							schema: graphqlSchema,
							context: {
								request: req,
								kommentyrSessions: req.ctx.kommentyrSessions,
								connectionCtx: {
									session: req.session || null,
									sessionExpiry: req.session ? req.session.expiresAt : null,
									authToken: req.session ? req.session.token : null
								},
								session: {
									data: req.session || null,
									sessionExpiry: req.session ? req.session.expiresAt : null,
									authToken: req.session ? req.session.token : null
								},
								...gqlCommonContext
							},
							formatError: error => error
<<<<<<< HEAD
						}))
					)
=======
						})))
>>>>>>> ec6c5c86550df504601e718cd681258462141639
					.use('/api', new KoaRouter()
						.use('/auth', authApiMiddleware)
						.use('/comments', commentsApiMiddleware)
						.routes()
					)
					.routes()
			]));
			return koa;
		})();

		// Create a Node.js HTTP2 server and pass it a fully-middlewared Koa app
		const server = Promise.promisifyAll(
			http2.createSecureServer(
				{
					key: tlsKey,
					cert: tlsCert,
					requestCert: false,
					rejectUnauthorized: false,
					allowHTTP1: true,
					settings: {enablePush: true}
				},
				koaApp.callback()
			)
		);

		await server.listenAsync({port: process.env.PORT || config.defaultPort});

		console.info(magenta(`Secure HTTP2 server running on ${server.address().port}`));

		let subscriptionServer = new SubscriptionServer({
			execute: execute,
			subscribe: subscribe,
			schema: graphqlSchema,
			onConnect: async (connectionParams, webSocket, ctx) => {
				let session = null;
				let user = null;

				if (connectionParams.authToken) {
					if (connectionParams.authToken.includes(' ')) {
						throw new Error('ERR_INVALID_AUTH_TOKEN');
					}

					// session = await koaSessionMongoose.get(connectionParams.authToken);

					// session = JSON.parse(
					// 	await redisPublisher.get(`user-session:${connectionParams.authToken}`)
					// );
					session = await sessionManager.getOne({ token: connectionParams.authToken });
					// console.log('redisSession:', redisSession);

					if (!session) {
						throw new Error('ERR_INVALID_AUTH_TOKEN');
					}

					user = (await UserModel.findOne({ _id: session.userId })).toObject();

					let subs = [
						new RedisObservable(redisSubscriber, `sessionInvalidated:*:${connectionParams.authToken}`)
							.pipe(first())
							.subscribe(data => webSocket.close()),
						new RedisObservable(redisSubscriber, `userUpdated:${user._id.toString()}`)
							.subscribe(({ data }) => Object.assign(user, data))
					];

					webSocket.once('close', () => {
						for (let sub of subs)
							sub.unsubscribe();
					});
				}

				let connectionCtx = {
					session: session,
					sessionExpiry: null,
					authToken: connectionParams.authToken || null
				};

				return {
					user,
					session: {
						data: session,
						expiry: null,
						authToken: connectionParams.authToken || null
					},
					connectionCtx,
					webSocket,
					...gqlCommonContext
				};
			},
			onOperation: (() => {
				const myFormatResponse = result => {
			        if (result.errors) {
						result.errors = result.errors.map(err => {
							if (err.originalError instanceof ApiError) {
								return { ...err.originalError, internalData: undefined };
							} else {
								console.error(err);
								return new UnknownApiError;
							}
						});
					}
					return result;
			    };
				return function(subscribeMessage, subscriptionOpts, webSocket) {
					// console.log('subscribeMessage', subscribeMessage);
					// console.log('subscriptionOpts', subscriptionOpts);
					// console.log('webSocket', webSocket);
				    subscriptionOpts.formatResponse = myFormatResponse;
					return subscriptionOpts;
				};
			})()
		}, {
			server: Promise.promisifyAll(new https.Server({
				key: tlsKey,
				cert: tlsCert
			})),
			path: '/graphql-api'
		});

		await subscriptionServer.server._server.listenAsync({port: parseInt(process.env.PORT || config.defaultPort) + 1});

		console.info(magenta(`HTTP server running on ${subscriptionServer.server._server.address().port}`));

		// (async () => {
		// 	let sessKey = 'lol2';
		//
		// 	let setResult = await koaSessionMongoose.set(
		// 		sessKey,
		// 		{
		// 			testKey: 'testValue'
		// 		},
		// 		15,
		// 		{
		// 			rolling: true,
		// 			changed: true
		// 		}
		// 	);
		// 	console.log('SET_RESULT', setResult);
		//
		// 	let getResult = await koaSessionMongoose.get(sessKey);
		// 	console.log('GET_RESULT', getResult);
		//
		// 	console.log('onConnect:', ctx);
		// })();
	}
	catch (err) {
		console.error('App failed to start...'+"\n", err);
		process.exit(1);
	}
})();
