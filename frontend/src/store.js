import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';
import lockr from 'lockr';

const initialState = {
    me: null,
    isAuthenticating: false
};

initialState.me = lockr.get('me');

export default createStore(
    (state=initialState, action) => {
        let changes;
        switch (action.type) {
            case 'USER_LOADED':
                changes = { me: action.payload };
                break;
            case 'USER_SIGN_IN_START':
                changes = { isAuthenticating: true };
                break;
            case 'USER_SIGN_IN_SUCCESS':
                changes = { me: action.payload, isAuthenticating: false };
                break;
            case 'USER_SIGN_IN_ERROR':
                changes = { isAuthenticating: false };
                break;
            case 'USER_SIGN_OUT_START':
                changes = { isAuthenticating: true };
                break;
            case 'USER_SIGN_OUT_SUCCESS':
                changes = { me: null, isAuthenticating: false };
                break;
            case 'USER_SIGN_OUT_FAIL':
                changes = { isAuthenticating: false };
        }
        return { ...state, ...changes };
    },

    applyMiddleware(
        ReduxThunk
    )
);
