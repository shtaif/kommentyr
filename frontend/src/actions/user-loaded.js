export default function(payload) {
    return (dispatch, getState) => {
        dispatch({type: 'USER_LOADED', payload });
    };
};
