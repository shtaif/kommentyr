import apollo from '../tools/apollo-instance';
import gql from 'graphql-tag';
import lockr from 'lockr';


export default function(email, password) {
    return async (dispatch, getState) => {
        dispatch({type: 'USER_SIGN_IN_START'});
        try {
            let { data: { me } } = await apollo.mutate({
                mutation: gql`
                    mutation ($email: String, $password: String) {
                        me: signIn(
                            email: $email
                            password: $password
                        ) {
                            _id
                            name
                            email
                            emailHash
                        }
                    }
                `,
                variables: { email, password }
            });
            lockr.set('me', me);
            dispatch({type: 'USER_SIGN_IN_SUCCESS', payload: me});
            return me;
        }
        catch (err) {
            dispatch({type: 'USER_SIGN_IN_ERROR', payload: err});
            throw err;
        }
    };
};
