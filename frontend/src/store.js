import { createStore, applyMiddleware } from 'redux';

const initialState = {
    me: null
};

export default createStore(
    (state=initialState, action) => {
        switch (action.type) {
            case 'USER_LOADED':
                return { ...state, me: action.payload };
            case 'USER_SIGN_IN':
                return { ...state, me: action.payload };
            case 'USER_SIGN_OUT':
                return { ...state, me: null };
            default:
                return state;
        }
    },
    applyMiddleware()
);
