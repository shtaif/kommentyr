import apollo from '../tools/apollo-instance';
import lockr from 'lockr';
import gql from 'graphql-tag';


export default function() {
    return async (dispatch, getState) => {
        dispatch({type: 'USER_SIGN_OUT_START'});
        try {
            let { data: { result } } = await apollo.mutate({mutation: gql`
                mutation {
                    result: signOut
                }
            `});

            if (!result) {
                throw new Error('Sign out failed');
            }

            lockr.set('me', null);

            dispatch({type: 'USER_SIGN_OUT_SUCCESS'});

            return result;
        }
        catch (err) {
            dispatch({type: 'USER_SIGN_OUT_ERROR', payload: err});
            throw err;
        }
    };
}
