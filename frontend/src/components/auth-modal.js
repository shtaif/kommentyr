import React, { Component, Fragment } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import classNames from 'classnames';
import auth from '../tools/auth-helper';
import './auth-modal.css';


export default class AuthModal extends Component {
    state = {
        email: '',
        password: ''
    };


    constructor(props) {
        super(props);
    }


    async onSubmit() {
        try {
            console.log('ONSUBMIT');

            // if (!this.state.email || !this.state.password) {
            //
            // }

            let currUser = await auth.signIn(this.state.email, this.state.password);
            (this.props.onSignIn || (() => {}))(currUser);
        }
        catch (err) {
            if (this.props.onSignInError)
                this.props.onSignInError(err);
            throw err;
        }
    }


    render() {
        return (
            <Modal className="auth-modal"
                   isOpen={this.props.isOpen}
                   centered={true}>
                <ModalBody>
                    <form className=""
                          onSubmit={e => {
                              e.preventDefault();
                              this.onSubmit();
                          }}>
                        <h3>Sign In Modal</h3>
                        <div>
                            Email:
                            <input type="email"
                                   require="true"
                                   value={this.state.email}
                                   onInput={e => this.setState({ email: e.target.value })} />
                        </div>
                        <div>
                            Password:
                            <input type="password"
                                   require="true"
                                   value={this.state.password}
                                   onInput={e => this.setState({ password: e.target.value })} />
                        </div>
                        <div>
                            <button type="submit">
                                SIGN IN
                            </button>
                        </div>
                    </form>
                </ModalBody>
            </Modal>
        );
    }
};
