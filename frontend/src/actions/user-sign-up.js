import apollo from '../tools/apollo-instance';
import gql from 'graphql-tag';


export default function(email, password) {
    return async (dispatch, getState) => {
        dispatch({type: 'USER_SIGN_UP_START'});

        try {
            let { data: { newUser } } = await apollo.mutate({
                mutation: gql`
                    mutation ($email: String, $password: String) {
                        newUser: signUp(
                            email: $email,
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

            dispatch({type: 'USER_SIGN_UP_SUCCESS', payload: newUser});

            return newUser;
        }
        catch (err) {
            dispatch({type: 'USER_SIGN_UP_ERROR', payload: err});
            throw err;
        }
    };
};
