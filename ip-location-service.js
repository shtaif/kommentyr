process.title = 'Kommentyr IP Location Service';

const dotenv = require('dotenv');
dotenv.config();

const
	Promise = require('bluebird'),
	http = require('http'),
	Koa = require('koa'),
	koaCompose = require('koa-compose'),
	KoaRouter = require('koa-router'),
	koaLogger = require('koa-logger'),
	koaBodyparser = require('koa-bodyparser'),
    mysql = require('mysql2/promise'),
	{ magenta } = require('cli-color');



(async () => {
	try {
		// Verifiy required environment config parameters were defined
		/*if (!process.env.KMTR_DB_URI) {
			throw new Error(
				`No MongoDB URI was configured!
				Please set it into the KMTR_DB_URI environment variable.`
			);
		} else*/ if (!process.env.KMTR_TLS_KEY_PATH) {
			throw new Error(
				`No path of a TLS key was configured!
				Please set it into the KMTR_TLS_KEY_PATH environment variable.`
			);
		} else if (!process.env.KMTR_TLS_CERT_PATH) {
			throw new Error(
				`No path of a TLS cert was configured!
				Please set it into the KMTR_TLS_CERT_PATH environment variable.`
			);
		}

		// Establish DB connection + read TLS assets to memory needed for the HTTP2 server
		const [ dbPool ] = await Promise.all([
			(async () => {
                const pool = mysql.createPool({
                    host: 'myvm.com',
                    user: 'root',
                    password: 'hi',
                    database: 'ip2location',
                    connectionLimit: 10,
                    queueLimit: 0
                });
                let conn = await pool.getConnection();
                conn.release();
                return pool;
            })()
		]);

		// Create a Node.js HTTP2 server and pass it a fully-middlewared Koa app
		const server = Promise.promisifyAll(
			new http.Server(
                new Koa().use(koaCompose([
        			koaLogger(),
        			koaBodyparser({enableTypes: ['json']}),
        			new KoaRouter()
        				.get('/:ip', async ctx => {
                            if (!ctx.params.ip.match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
                                throw new Error(`Invalid IP address "${ctx.params.ip}"`);
                            }

                    		let [ part1, part2, part3, part4 ] = ctx.params.ip.split('.');

                            let ipNum = part4 + part3 * 256 + part2 * 256 * 256 + part1 * 256 * 256 * 256;

                            let sql = "SELECT * FROM `ip2location`.`ip_country` WHERE `ip_to` >= "+ipNum+" LIMIT 1";
                    		// let sql = "SELECT * FROM `ip2location`.`ip_country` LIMIT 10, 10";

                            let [ [ location ] ] = await dbPool.query(sql);

                            if (!location || location.country_name === '-') {
                				location = null;
                            } else {
                                for (let k in location) {
                					if (location[k] === '-')
                                        location[k] = null;
                				}
                            }

        					ctx.body = {
                                ip: ctx.params.ip,
                                location: location
                            };
        				})
        				.routes()
        		]))
                .callback()
			)
		);

		await server.listenAsync({port: 4445});

		console.info(magenta(`Secure HTTP2 server running on ${server.address().port}`));
	}
	catch (err) {
		console.error('App failed to start...'+"\n", err);
		process.exit(1);
	}
})();
