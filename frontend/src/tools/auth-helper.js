import { runInAction } from 'mobx';
import gql from 'graphql-tag';
import { kmtrApiClient as kmtr } from '../tools/kmtr-api-client';
import store from '../app-store';


export default new class AuthHelper {
    isSignedIn() {
        return !!store.me;
    }


    async signIn(email, password) {
        try {
            store.isAuthenticating = true;
            if (store.me) {
                return store.me;
            }
            let { data: { result } } = await kmtr.mutate(
                gql`
                    mutation ($email: String, $password: String) {
                        result: authenticate(
                            email: $email
                            password: $password
                        ) {
                            session {
                                token userId createdAt expiresAt
                            }
                            user {
                                _id name email emailHash
                            }
                        }
                    }
                `,
                email, password
            );
            return result.user;
        }
        finally {
            store.isAuthenticating = false;
        }
    }


    async signOut() {
        try {
            store.isAuthenticating = true;

            let { data: { result } } = await kmtr.mutate(gql`
                mutation {
                    result: unauthenticate
                }
            `);

            if (!result) {
                throw new Error('Sign out failed');
            }

            return result;
        }
        finally {
            store.isAuthenticating = false;
        }
    }


    async signUp(email, password) {
        try {
            store.isAuthenticating = true;
            let { data: { newUser } } = await kmtr.mutate(
                gql`
                    mutation ($email: String, $password: String) {
                        newUser: signUp(
                            email: $email,
                            password: $password
                        ) {
                            _id name email emailHash
                        }
                    }
                `,
                email, password
            );
            return newUser;
        }
        finally {
            store.isAuthenticating = false;
        }
    }
};
