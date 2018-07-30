import React, { Component, Fragment } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import classNames from 'classnames';
import userSignInAction from '../actions/user-sign-in';
import './auth-modal.css';


export default class AuthModal extends Component {
    state = {
        email: '',
        password: ''
    };


    constructor(props) {
        super(props);
    }


    render() {
        return (
            <Modal className="auth-modal"
                   isOpen={this.props.isOpen}
                   centered={true}>
                <ModalBody>
                    <form className=""
                          onSubmit={() => {
                              this.prop.dispatch(userSignInAction(this.state.email, this.state.password));
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
                    </form>
                </ModalBody>
            </Modal>
        );
    }
};
