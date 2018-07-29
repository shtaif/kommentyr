import React, { Component, Fragment } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import classNames from 'classnames';
import CommentForm from './comment-form';
import './reply-modal.css';


export default class ReplyModal extends Component {
    constructor(props) {
        super(props);
    }


    render() {
        return (
            <Modal className="reply-modal"
                   isOpen={this.props.isOpen}
                   centered={true}>
                <ModalBody>
                    <h3>Replying to: {this.props.targetComment? this.props.targetComment.poster.email : ''}</h3>
                    <CommentForm className="reply-comment-form"
                                 onEmailChange={this.props.onEmailChange}
                                 onTextChange={this.props.onTextChange}
                                 onSubmit={this.props.onSubmit} />
                </ModalBody>
            </Modal>
        );
    }
};
