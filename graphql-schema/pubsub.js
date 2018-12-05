const
    Redis = require('ioredis'),
    { RedisPubSub } = require('graphql-redis-subscriptions'),
    config = require('../config');


const pubsub = new RedisPubSub({
    publisher: new Redis(process.env.KMTR_REDIS_URI, config.redisOpts),
    subscriber: new Redis(process.env.KMTR_REDIS_URI, config.redisOpts)
});

// setInterval(() => {
//     pubsub.publish('testSubscription', {
//         testSubscription: 'LOL'
//     });
// }, 1000);

module.exports = pubsub;
