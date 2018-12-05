const makeDeferred = () => {
    let deferred = { resolve: null, reject: null };
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred;
};


module.exports.toAsyncIter = async function*(inputObservable) {
    let next = makeDeferred();
    let done = false;

    let subscription = inputObservable.subscribe(
        v => {
            next.resolve(v);
            next = makeDeferred();
        },
        e => {
            next.reject(e);
        },
        x => {
            next.resolve(x);
            done = true;
        }
    );

    try {
        while (true) {
            let value = await next.promise;
            if (done)
                return value;
            yield value;
        }
    } finally {
        subscription.unsubscribe();
    }
};


module.exports.toAsyncIterBuffered = async function*(inputObservable) {
    let done = false;
    let currDeferred = makeDeferred();
    let buffer = [ currDeferred ];

    let subscription = inputObservable.subscribe(
        v => {
            currDeferred.resolve(v);
            currDeferred = makeDeferred();
            buffer.push(currDeferred);
        },
        e => {
            currDeferred.reject(e);
        },
        x => {
            currDeferred.resolve(x);
            done = true;
        }
    );

    try {
        while (true) {
            let value = await buffer.shift().promise;
            if (done)
                return value;
            yield value;
        }
    } finally {
        subscription.unsubscribe();
    }
};
