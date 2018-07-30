import { extendObservable, autorun } from 'mobx';
console.log('autorun', autorun);

let appStore = new class AppStore {
    constructor() {
        extendObservable(this, {
            prop: 'VALUE',
            num: 0
        });
    }
};

window.store = appStore;

export default appStore;

autorun(() => {
    console.log('STORE CHANGED', appStore.num);
});

// setInterval(() => {
//     console.log('!@#');
//     appStore.num = appStore.num + 1;
// }, 1000);
