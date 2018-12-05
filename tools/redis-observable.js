const { Observable } = require('rxjs');


const subscriptionCounts = {};


module.exports = class RedisObservable extends Observable {
    constructor(redisSubscriber, ...inputPatterns) {
        super(observer => {
            let listener = (pattern, channel, message) => {
                if (inputPatterns.includes(pattern)) {
                    observer.next({
                        pattern: pattern,
                        channel: channel,
                        data: JSON.parse(message)
                    });
                }
            };

            (async () => {
                try {
                    let results = await Promise.all(
                        inputPatterns.map(async pattern => {
                            try {
                                await this.addSubscription(redisSubscriber, pattern);
                                return true;
                            }
                            catch (err) {
                                return false;
                            }
                        })
                    );
                    if (results.some(result => !result)) {
                        throw new Error('...');
                    }
                    redisSubscriber.on('pmessage', listener);
                }
                catch (err) {
                    await Promise.all(
                        inputPatterns.map(async pattern => await this.removeSubscription(redisSubscriber, pattern))
                    );
                    observer.error(err);
                }
            })();

            return async () => {
                redisSubscriber.off('pmessage', listener);
                await Promise.all(
                    inputPatterns.map(async pattern => await this.removeSubscription(redisSubscriber, pattern))
                );
            }
        });
    }


    async addSubscription(redisSubscriber, pattern) {
        if (!(pattern in subscriptionCounts)) {
            subscriptionCounts[pattern] = 0;
        }
        subscriptionCounts[pattern]++;
        try {
            await redisSubscriber.psubscribe(pattern);
        }
        catch (err) {
            subscriptionCounts[pattern]--;
            if (!subscriptionCounts[pattern]) {
                delete subscriptionCounts[pattern];
            }
            throw err;
        }
    }


    async removeSubscription(redisSubscriber, pattern) {
        if (pattern in subscriptionCounts) {
            subscriptionCounts[pattern]--;
            if (!subscriptionCounts[pattern]) {
                delete subscriptionCounts[pattern];
                try {
                    await redisSubscriber.psunubscribe(pattern);
                }
                catch (err) {
                    subscriptionCounts[pattern] = 0;
                    subscriptionCounts[pattern]++;
                }
            }
        }
    }
};
