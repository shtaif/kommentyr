import React, { Component, Fragment } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import classNames from 'classnames';
import './auth-modal.css';


export default class AuthModal extends Component {
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

                          }}>
                        <h3>Sign In Modal</h3>
                        <div>
                            Email:
                            <input type="email"
                                   require="true" />
                        </div>
                        <div>
                            Password:
                            <input type="password"
                                   require="true" />
                        </div>
                    </form>
                </ModalBody>
            </Modal>
        );
    }
};
