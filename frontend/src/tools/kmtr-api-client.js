import { ApolloLink } from 'apollo-link';
import gql from 'graphql-tag';
import { Observable, Subject, from } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
// import { onError } from 'apollo-link-error';
import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { InterceptOperationLink } from './apollo-link-intercept-operation';
import { WebSocketLink } from 'apollo-link-ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import lockr from 'lockr';


const apiWsEndpoint = '127.0.0.1:4444/graphql-api';


const storage = {
    keyPrefix: 'kmtr_api_',
    async load(key) {
        return lockr.get(this.keyPrefix + key);
    },
    async save(key, value) {
        return lockr.set(this.keyPrefix + key, value);
    }
};


let currentAuthToken = null;


const initialAuthTokenLoad = (async () => {
    currentAuthToken = await storage.load('authToken');
    /* *** */ /* *** */ /* *** */
    // currentAuthToken = '1533489158473-VhE20k0G1xy2z92vR5yTAJ8e-oVsjzSG___';
    /* *** */ /* *** */ /* *** */
    console.log('currentAuthToken', currentAuthToken);
})();


const subsClient = new SubscriptionClient('wss://'+apiWsEndpoint, {
    reconnect: true,
    timeout: 1000*10,
    connectionCallback: async err => {
        if (err) {
            if (err.message === 'ERR_INVALID_AUTH_TOKEN') {
                await kmtrApiClient.changeAuthStatus(null);
            }
        }
    },
    connectionParams: async () => {
        await initialAuthTokenLoad;
        return { authToken: currentAuthToken };
    }
});



// console.log('subsClient', subsClient);
// setTimeout(async () => {
//     // console.log('Trying reconnect...');
//     // subsClient.tryReconnect();
//     // setTimeout(() => {
//     //     console.log('Trying reconnect...');
//     //     subsClient.tryReconnect();
//     // }, 2000);
//     console.log('Closing...');
//     // subsClient.onDisconnected(() => {
//     //     console.log('DISCONNECTED');
//     // });
//     subsClient.close();
//     subsClient.connect();
//     // console.log('Closed');
// }, 2000);



export const kmtrApiClient = new class extends ApolloClient {
    authStatusChange = new Subject;


    constructor() {
        super({
            fetchPolicy: 'network-only',

            cache: new InMemoryCache(),

            link: ApolloLink.from([
                // onError(({ graphQLErrors, networkError, operation, response, forward }) => {
                //     // console.log('graphQLErrors', graphQLErrors);
                //     // console.log('networkError', networkError);
                //
                //     if (networkError) {
                //         console.log('networkError and currentAuthToken = ', authToken, operation);
                //         // currentAuthToken = null;
                //         // let obs = forward(operation);
                //         // // console.log('obs.next', obs.next);
                //         // return obs;
                //     }
                // }),

                (operation, forward) => {
                    let retried = false;

                    return from(forward(operation)).pipe(
                        catchError(err => {
                            if (!retried && err.message === 'ERR_INVALID_AUTH_TOKEN') {
                                retried = true;
                                return new Observable(observer => {
                                    let off = subsClient.on('reconnected', () => {
                                        off();
                                        console.log('RECONNECTED IN OBSERVABLE');
                                        observer.next();
                                        observer.complete();
                                    });
                                })
                                .pipe(mergeMap(value => forward(operation)));
                            } else {
                                throw err;
                            }
                        })
                    );
                },

                new InterceptOperationLink({
                    Mutation: {
                        authenticate: (operation, fieldAst, forward) => {
                            try {
                                const sessionField = fieldAst.selectionSet.selections.find(item => item.name.value === 'session');
                                if (!sessionField) throw null;
                                const tokenField = sessionField.selectionSet.selections.find(item => item.name.value === 'token');
                                if (!tokenField) throw null;
                            } catch (err) {
                                throw new Error('Must specify the `session.token` field in the selection set');
                            }

                            return from(forward(operation)).pipe(
                                mergeMap(async result => {
                                    let opResult = result.data[(fieldAst.alias ? fieldAst.alias : fieldAst.name).value];
                                    let user;

                                    if (
                                        opResult.user &&
                                        opResult.user._id !== undefined &&
                                        opResult.user.name !== undefined &&
                                        opResult.user.email !== undefined &&
                                        opResult.user.emailHash !== undefined
                                    ) {
                                        user = opResult.user;
                                    } else {
                                        let currentUserQuery = await this.query(`
                                            query {
                                                user: getCurrentUser {
                                                    _id name email emailHash
                                                }
                                            }
                                        `);
                                        user = currentUserQuery.data.user;
                                    }

                                    await this.changeAuthStatus({ user, authToken: opResult.session.token });

                                    return result;
                                })
                            );
                        },

                        unauthenticate: (operation, fieldAst, forward) => {
                            return from(forward(operation)).pipe(
                                mergeMap(async result => {
                                    await this.changeAuthStatus(null);
                                    return result;
                                })
                            );
                        }
                    }
                }),

                new WebSocketLink(subsClient)
            ])
        });
    }


    async changeAuthStatus(status) {
        currentAuthToken = status ? status.authToken : null;

        this.authStatusChange.next(status);

        await Promise.all([
            storage.save('authToken', status ? status.authToken : null),

            storage.save('currentUser', status ? status.user : null),

            storage.save(
                'sessions',
                (() => {
                    if (status) {
                        return [{
                            session: { token: status.authToken },
                            user: status.user
                        }];
                    } else return [];
                })()
            ),
            
            (async () => {
                await new Promise(resolve => setTimeout(resolve, 0));

                let activeSubscriptions = { ...subsClient.operations };
                subsClient.close();
                subsClient.unsentMessagesQueue.push(
                    ...Object.keys(activeSubscriptions).map(k => {
                        return subsClient.buildMessage(k, 'start', activeSubscriptions[k].options);
                    })
                );
                subsClient.connect();
                Object.assign(subsClient.operations, activeSubscriptions);

                await new Promise(resolve => {
                    let off = subsClient.on('connected', () => { off(); resolve(); });
                })
            })()
        ]);
    }


    async getCurrentAuthStatus() {
        await initialAuthTokenLoad;
        let [ authToken, user ] = await Promise.all([
            storage.load('authToken'),
            storage.load('currentUser')
        ]);
        if (!authToken || !user) {
            return null;
        } else {
            return { authToken, user };
        }
    }


    parseVars(parsedQuery, varArr) {
        let variables = {};
        let varDefs = parsedQuery.definitions[0].variableDefinitions;
        for (let i=0; i<varDefs.length; ++i) {
            variables[varDefs[i].variable.name.value] = varArr[i];
        }
        return variables;
    }


    async query(query, ...variableArr) {
        if (!(query instanceof Object)) {
            query = gql(query);
        }
        return await super.query({
            query: query,
            variables: this.parseVars(query, variableArr)
        });
    }


    async mutate(mutation, ...variableArr) {
        if (!(mutation instanceof Object)) {
            mutation = gql(mutation);
        }
        return await super.mutate({
            mutation: mutation,
            variables: this.parseVars(mutation, variableArr)
        });
    }


    subscribe(subscription, ...variableArr) {
        if (!(subscription instanceof Object)) {
            subscription = gql(subscription);
        }
        return super.subscribe({
            query: subscription,
            variables: this.parseVars(subscription, variableArr)
        });
    }
};
