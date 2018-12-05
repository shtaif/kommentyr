import React, { Component, Fragment } from 'react';
import { observer as mobxObserver } from 'mobx-react';
import { Tooltip } from 'reactstrap';
import { kmtrApiClient as kmtrApi } from '../tools/kmtr-api-client';
import MessageBubble from './message-bubble';
// import JsTimeAgo from 'javascript-time-ago';
// import en from 'javascript-time-ago/locale/en';
import ReactTimeAgo from 'react-time-ago';
import store from '../app-store';
import './comment.css';


// JsTimeAgo.locale(en);


export default mobxObserver(
    class Comment extends Component {
        state = {
            tooltipOpen: false
        };

        isFriendWith(user) {
            // return store.me._id !== user._id && !!user.friendships.find(fr => {
            //     return fr.userId1 === store.me._id || fr.userId2 === store.me._id;
            // });
            return store.me && store.me._id !== user._id && user.friendship/* && user.friendship.status === 'accepted'*/;
        }

        async sendFriendshipRequest(targetUserId) {
            let { data: { friendship } } = await kmtrApi.mutate(
                `mutation ( $ownId: ID!, $targetUserId: ID! ) {
                    friendship: createFriendship(
                        id1: $ownId
                        id2: $targetUserId
                    ) {
                        userId1 userId2 sentAt acceptedAt status
                    }
                }`,
                store.me._id,
                targetUserId
            );
            return friendship;
        }

        render() {
            let { className='', comment, imageUrl, imageOnClick, ...otherProps } = this.props;

            let areFriends = this.isFriendWith(comment.poster);

            return (
                <Fragment>
                    <MessageBubble {...otherProps}
                                   id={`my-tooltip-${comment._id}`}
                                   className={`comment-component ${className}`}
                                   leftPartTemplate={() =>
                                       <div className="image"
                                            id="my-tooltip"
                                            style={{backgroundImage: `url(${imageUrl})`}}
                                            onClick={imageOnClick}>
                                            {areFriends && (
                                                <div className="friend-icon"></div>
                                            )}
                                        </div>
                                   }>
                        <div className="email-and-time">
                            <span className="email">
                                {comment.poster.name || comment.poster.email}
                            </span>
                            <span> - </span>
                            <span className="time">
                                <ReactTimeAgo>{comment.createdAt}</ReactTimeAgo>
                            </span>
                        </div>
                        <div className="text">
                            {comment.text}
                        </div>
                    </MessageBubble>

                    {store.me && store.me._id !== comment.poster._id && (
                        <Tooltip placement="top"
                                 isOpen={this.state.tooltipOpen}
                                 target={`my-tooltip-${comment._id}`}
                                 autohide={false}
                                 toggle={() => this.setState(state => ({ tooltipOpen: !state.tooltipOpen }))}>
                            {areFriends ? (
                                <div>FRIENDS</div>
                            ) : (
                                <button className=""
                                        onClick={async () => {
                                            let friendship = await this.sendFriendshipRequest(comment.poster._id);
                                            comment.poster.friendship = friendship;
                                        }}>
                                    Send Friend Request
                                </button>
                            )}
                        </Tooltip>
                    )}
                </Fragment>
           );
        }
    }
);
