const
    Deferred = require('promise-deferred'),
    _flatten = require('lodash/flatten');


class DataLoader {
    constructor(operation) {
        this.requests = [];
        this.isScheduled = false;
        this.operation = operation;
    }

    load(payload) {
        if (!this.isScheduled) {
            this.isScheduled = true;

            process.nextTick(async () => {
                this.isScheduled = false;
                let currRequests = this.requests;
                let payloads = currRequests.map(item => item.payload);
                this.requests = [];

                // console.log('DataLoader: fetching IDs:', payloads);

                let results = await this.operation(payloads);

                // console.log('DataLoader: fetched:', results);

                for (let i=0; i<results.length; ++i) {
                    currRequests[i].deferred.resolve(results[i]);
                }
            });
        }

        let deferred = new Deferred;

        this.requests.push({ payload: payload, deferred: deferred });

        return deferred.promise;
    }
}


class ImprovedDataLoader extends DataLoader {
    constructor(dataFetcher, comparator, opts={}) {
        super(async identifiers => {
            let items = await dataFetcher(_flatten(identifiers));

            if (!(comparator instanceof Function)) {
                let key = comparator;
                comparator = (identifier, item) => identifier === item[key];
            }

            let orderedItems = new Array(identifiers.length);

            if (opts.returnMultiple) {
                for (let i=0; i<identifiers.length; ++i) {
                    let matching = [];
                    if (identifiers[i] instanceof Array) {
                        for (let j=0; j<identifiers[i].length; ++j) {
                            for (let k=0; k<items.length; ++k) {
                                if (comparator(identifiers[i][j], items[k])) {
                                    matching.push(items[k]);
                                }
                            }
                        }
                    } else {
                        for (let j=0; j<items.length; ++j) {
                            if (comparator(identifiers[i], items[j])) {
                                matching.push(items[j]);
                            }
                        }
                    }
                    orderedItems[i] = matching;
                }
            } else {
                for (let i=0; i<identifiers.length; ++i) {
                    if (identifiers[i] instanceof Array) {
                        let resultingItems = [];
                        for (let j=0; j<identifiers[i].length; ++j) {
                            for (let k=0; k<items.length; ++k) {
                                if (comparator(identifiers[i][j], items[k])) {
                                    resultingItems.push(items[k]);
                                    break;
                                }
                            }
                        }
                        orderedItems[i] = resultingItems;
                    } else {
                        for (let j=0; j<items.length; ++j) {
                            if (comparator(identifiers[i], items[j])) {
                                orderedItems[i] = items[j];
                                break;
                            }
                        }
                    }
                }
            }

            return orderedItems;
        });
    }
}


module.exports.DataLoader = DataLoader;
module.exports.ImprovedDataLoader = ImprovedDataLoader;
