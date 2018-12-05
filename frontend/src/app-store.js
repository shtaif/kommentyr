import { extendObservable, action, autorun } from 'mobx';
import { kmtrApiClient as kmtrApi } from './tools/kmtr-api-client';


let appStore = new class AppStore {
    constructor() {
        extendObservable(this, {
            me: null,
            meReady: (async () => {
                kmtrApi.authStatusChange.subscribe(status => updateAuth(status));
                let initialStatus = await kmtrApi.getCurrentAuthStatus();
                updateAuth(initialStatus);
            })(),
            authToken: null,
            isAuthenticating: false,
            showAuthModal: false
        });
    }

    displayAuthModal() {
        this.showAuthModal = true;
    }
};

let updateAuth = action(status => {
    if (status) {
        appStore.me = status.user;
        appStore.authToken = status.authToken;
    } else {
        appStore.me = null;
        appStore.authToken = null;
    }
});

// (async () => {
//     kmtrApi.authStatusChange.subscribe(status => updateAuth(status));
//     let initialStatus = await kmtrApi.getCurrentAuthStatus();
//     updateAuth(initialStatus);
// })();

export default window.store = appStore;

// autorun(() => {
//     console.log('STORE CHANGED', appStore.num);
// });
