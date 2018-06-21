import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import classNames from 'classnames';
import JsTimeAgo from 'javascript-time-ago';
import ReactTimeAgo from 'react-time-ago';
import preload from '../tools/preload-images';
import getImageColorforPreview from '../tools/get-image-color-for-preview';
import './user-details-modal.css';


class UserDetailsModal extends Component {
    constructor(props) {
        super();

        this.state = {
            leftText: props.leftText || '',
            rightText: props.rightText || '',

            // input: {
            //     email: props.email,
            //     // previewBgColor: props.previewBgColor,
            //     // lastActivityDate: props.lastActivityDate,
            //     imageUrl: props.imageUrl
            // },
            previewBgColor: props.previewBgColor,
            displayed: false,
            readyToShowImage: false
        };

        if (props.handle instanceof Function) {
            console.log('CALLING `handle`');
            props.handle({
                open: (email, color) => this.open(email, color),
                close: () => this.close(),
                inst: this
            });
        }

        console.log('this.state', this.state);
    }


    async open(email='', color) {
        this.setState({
            displayed: true,
            // input: {
            //     email: email
            // },
            previewBgColor: color ? color : this.state.previewBgColor
        });

        console.log('this.state', this.state);

        // let [ lastComment ] = await Promise.all([
        //     new Promise(resolve => {
        //         let modalElem = document.querySelector('.user-details-modal');
        //         modalElem.addEventListener('transitionend', resolve, {once: true});
        //     }),
        //
        //     preload(this.state.imageUrl)
        // ]);

        this.setState({ readyToShowImage: true });

        // setTimeout(() => {
        //     this.setState({ displayed: false });
        //     setTimeout(() => {
        //         this.setState({ displayed: true });
        //     }, 2000);
        // }, 2000);
    }


    close() {
        this.setState({
            displayed: false,
            readyToShowImage: false,
            input: {
                email: null
            },
            lastActivityDate: null,
        });
    }


    render() {
        return (
            <Modal className="user-details-modal"
                   ref={ref => { /*console.log('REF', ref);*/ }}
                   isOpen={this.state.displayed}
                   centered={true}
                   onOpened={() => {
                       // console.log('onOpened!');
                       // let modalElem = document.querySelector('.user-details-modal');
                       // console.log('user-details-modal', modalElem);
                       // modalElem.addEventListener('transitionend', e => {
                       //     console.log('transitionend', e);
                       // }, {once: true});
                   }}>
                <ModalBody>
                    <div className="wrapper">
                        <button className="close-butt"
                                onClick={() => this.closeUserDetails()}>
                            <span className="x">×</span>
                        </button>

                        <div className="user-image preview abs"
                             style={{backgroundColor: this.state.previewBgColor}}>
                        </div>

                        <div className={classNames(
                                'user-image high-res abs',
                                {ready: this.state.readyToShowImage}
                             )}
                             style={{backgroundImage: `url(`+this.state.imageUrl+`)`}}>
                        </div>

                        <div className="dark-area abs"></div>

                        <div className="text lt abs"
                             onClick={async () => {
                                 // this.setState({searchTerm: this.state.input.email});
                                 // await this.search(this.state.input.email);
                                 // console.log('state.searchTerm', state.searchTerm, 'this.state.input.email', this.state.input.email);
                                 // this.close();
                             }}>
                             {this.state.leftText}
                        </div>

                        <div className="text rt abs">
                            {/*<div className="last-seen-label">Last active:</div>
                            <div className="last-seen-value">
                                {this.state.lastActivityDate &&
                                    <ReactTimeAgo>{this.state.lastActivityDate}</ReactTimeAgo>
                                }
                            </div>*/}
                            {this.state.rightText}
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        );
    }
}


export default UserDetailsModal;
