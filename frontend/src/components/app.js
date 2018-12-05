import React, { Component, Fragment } from 'react';
import { action, runInAction, observable, extendObservable, observe, intercept } from 'mobx';
import { observer as mobxObserver } from 'mobx-react';
import classNames from 'classnames';
import debounce from 'lodash.debounce';
import gql from 'graphql-tag';
import lockr from 'lockr';
import JsTimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import ReactTimeAgo from 'react-time-ago';
import InfiniteScroll from 'react-infinite-scroller';
import FlipMove from 'react-flip-move';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Tooltip } from 'reactstrap';
import TextareaAutosize from 'react-textarea-autosize';
import CommentForm from './comment-form';
import Comment from './comment';
import MessageBubble from './message-bubble';
import CommentNodeTree from './comment-node-tree';
import AuthModal from './auth-modal';
import ReplyModal from './reply-modal';
import MdLoader from './md-loader';
// import apiClient from '../tools/api-client';
import { kmtrApiClient as kmtrApi } from '../tools/kmtr-api-client';
import auth from '../tools/auth-helper';
import preload from '../tools/preload-images';
import getImageColorforPreview from '../tools/get-image-color-for-preview';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';



let gravatarUrl = (emailHash, size='') => {
    return `https://www.gravatar.com/avatar/${emailHash}.jpg?s=${size}`;
};


export default mobxObserver(
    class App extends Component {
        state = {
            commentsWithRepliesExpanded: [],
            searchTerm: '',
            lastSearchTermUsed: '',
            userImageThumbSize: 70,
            userImageHighResSize: 500,
            newCommentEmail: '',
            newCommentText: '',
            isAtFirstPage: true,
            hasMoreCommentsToLoad: true,
            loaderTopPos: null,
            userDetailsModal: {
                isOpen: false,
                email: null,
                emailHash: null,
                previewBgColor: 'rgb(0,0,0)',
                highResReady: false,
                lastComment: null
            },
            replyModal: {
                isOpen: false,
                targetComment: null,
                email: '',
                text: ''
            },
            friendRequests: []
        };
        commentListRef = null;
        topCommentsPageSize = 10;
        nestedCommentsPageSize = 4;
        unsubscribeAuthStatusChange = null;
        loadCommentsDebounced = (() => {
            let debounced = debounce(this.loadComments, 250);
            return opts => {
                this.isLoadingComments = true;
                debounced.call(this, opts);
            };
        })();
        debounceComposingStateReset = debounce(async () => {
            this.isComposing = false;
            await this.setComposingState(false);
        }, 2000);

        flipMoveProps = {
            typeName: null,
            duration: 200,
            staggerDelayBy: 25,
            enterAnimation: {
                from: { opacity: 0, transform: 'scale(0.5)' },
                to: { opacity: 1, transform: 'scale(1.0)' }
            },
            leaveAnimation: {
                from: { opacity: 1, transform: 'scale(1.0)' },
                to: { opacity: 0, transform: 'scale(0.5)' }
            }
        };


        constructor(props) {
            super(props);

            JsTimeAgo.locale(en);

            extendObservable(this, {
                counter: 0,
                usersComposing: [],
                comments: [],
                items: [{name: 'aaa'}, {name: 'bbb'}, {name: 'ccc'}, {name: 'ddd'}],
                isLoadingComments: false,
                isInited: false,
                isComposing: false
            });

            window.items = this.items;
        }


        async componentWillUnmount() {
            this.unsubscribeAuthStatusChange();
        }


        async componentDidMount() {
            let uns = [
                intercept(this.props.store, 'me', change => {
                    if (!change.newValue) {
                        this.debounceComposingStateReset.flush();
                    }
                    return change;
                }),

                observe(this.props.store, 'me', ({ newValue, oldValue }) => {
                    console.log('AUTH_STATUS_CHANGE', newValue, ' <== ', oldValue);
                    if (newValue) {
                        if (this.isComposing) {
                            this.setComposingState(true);
                        }
                    } else {
                        this.debounceComposingStateReset.flush();
                    }
                })
            ];

            this.unsubscribeAuthStatusChange = () => {
                for (let un of uns) un();
            };

            try {
                await Promise.all([
                    this.loadComments({reset: true}),

                    (async () => {
                        kmtrApi.subscribe(
                            `subscription {
                                userComposingStateChanged {
                                    composingState
                                    user { _id name email emailHash }
                                }
                            }`
                        )
                        .subscribe(
                            async data => {
                                // console.log('userComposingStateChanged', data.data.userComposingStateChanged);
                                await usersComposingPromise;
                                let { user, composingState } = data.data.userComposingStateChanged;
                                let index = this.usersComposing.findIndex(item => item._id === user._id);
                                if (composingState) {
                                    if (index === -1)
                                        this.usersComposing.push(user);
                                } else {
                                    if (index !== -1)
                                        this.usersComposing.splice(index, 1);
                                }
                            },
                            err => {
                                console.log('ERR', err);
                            },
                            () => {
                                console.log('COMPLETE');
                            }
                        );
                        // .subscribe({
                        //     next: async data => {
                        //         // console.log('userComposingStateChanged', data.data.userComposingStateChanged);
                        //         await usersComposingPromise;
                        //         let { user, composingState } = data.data.userComposingStateChanged;
                        //         let index = this.usersComposing.findIndex(item => item._id === user._id);
                        //         if (composingState) {
                        //             if (index === -1)
                        //                 this.usersComposing.push(user);
                        //         } else {
                        //             if (index !== -1)
                        //                 this.usersComposing.splice(index, 1);
                        //         }
                        //     },
                        //     error: err => {
                        //         console.log('ERR', err);
                        //     },
                        //     complete: () => {
                        //         console.log('COMPLETE');
                        //     }
                        // });
                        let usersComposingPromise = this.loadUsersComposing();
                        await usersComposingPromise;
                    })()
                ]);
            }
            catch (err) {
                console.log('MY ERR', err.stack);
                throw err;
            }

            kmtrApi.subscribe(
                `subscription ( $types: [CommentChangeType!]! ) {
                    commentChanges ( types: $types ) {
                        type
                        comment {
                            _id createdAt text replyCount replyingToId
                            poster {
                                _id email emailHash
                            }
                        }
                    }
                }`,
                ['created', 'updated', 'deleted']
            )
            .subscribe(data => {
                console.log('COMMENT_CHANGES', data.data.commentChanges);
                let { type, comment } = data.data.commentChanges;
                switch (type) {
                    case 'created': {
                        this.patchComment(comment);
                        this.comments.unshift(comment);
                        break;
                    }
                    case 'updated': {
                        let commentToUpdate = this.comments.find(item => item._id === comment._id);
                        if (!commentToUpdate) {
                            commentToUpdate.text = comment.text;
                        }
                        break;
                    }
                    case 'deleted': {
                        let index = this.comments.findIndex(item => item._id === comment._id);
                        if (index !== -1) {
                            this.comments.splice(index, 1);
                        }
                        break;
                    }
                }
            });

            (async () => {
                await this.props.store.meReady;
                if (this.props.store.me) {
                    let { data: { friendships } } = await kmtrApi.query(
                        `query ($ofId: ID!) {
                            friendships: getFriendships (
                                ofId: $ofId
                                isIdInitiator: false
                                status: pending
                            ) {
                                userId1 userId2 sentAt acceptedAt status
                                user1 {
                                    _id email
                                }
                                user2 {
                                    _id email
                                }
                            }
                        }`,
                        this.props.store.me._id
                    );
                    console.log('pending friend requests', friendships);
                    this.setState(state => ({ friendRequests: friendships }));
                }
            })();

            // (() => {
            //     let composingState = false;
            //
            //     setInterval(async () => {
            //         let promise = kmtrApi.mutate(
            //             `mutation ( $userId: ID!, $composingState: Boolean! ) {
            //                 updateUserComposingState (
            //                     userId: $userId
            //                     composingState: $composingState
            //                 )
            //             }`,
            //             '5b54e31f690bfdca48281e65',
            //             composingState
            //         );
            //
            //         composingState = !composingState;
            //
            //         await promise;
            //     }, 2000);
            // })();

            // (() => {
            //     let userIds = [
            //         "5b54e31f690bfdca48281e65",
            //         "5b54e31f690bfdca48281e66",
            //         "5b54e320690bfdca48281e67",
            //     ];
            //     let k = 0;
            //     let dir = 1;
            //
            //     setInterval(async () => {
            //         await kmtrApi.mutate(
            //             `mutation ( $userId: ID!, $composingState: Boolean! ) {
            //                 updateUserComposingState (
            //                     userId: $userId
            //                     composingState: $composingState
            //                 )
            //             }`,
            //             userIds[k],
            //             dir === 1
            //         );
            //         if (dir === 1) {
            //             if (k === userIds.length - 1) {
            //                 dir = -1;
            //             } else {
            //                 k += 1 * dir;
            //             }
            //         } else {
            //             if (k === 0) {
            //                 dir = 1;
            //             } else {
            //                 k += 1 * dir;
            //             }
            //         }
            //     }, 3000);
            // })();
        }


        async loadUsersComposing() {
            let { data: { usersComposing } } = await kmtrApi.query(
                `query {
                    usersComposing: getUsersComposing {
                        _id name email emailHash
                    }
                }`
            );

            this.usersComposing = usersComposing;
        }


        async setComposingState(state) {
            if (!this.props.store.me)
                return;

            return await kmtrApi.mutate(
                `mutation ( $userId: ID!, $composingState: Boolean! ) {
                    updateUserComposingState (
                        userId: $userId
                        composingState: $composingState
                    )
                }`,
                this.props.store.me._id,
                state
            );
        }


        /*
        * Opens the User Details Dialog and kicks-off additional async preparations for it.
         */
        async openUserDetails(email, emailHash) {
            let preloadPromise = preload(gravatarUrl(emailHash, this.state.userImageHighResSize));

            let previewColor = await getImageColorforPreview(gravatarUrl(emailHash, this.state.userImageThumbSize), {quality: 5});

            this.setState({
                userDetailsModal: {
                    ...this.state.userDetailsModal,
                    isOpen: true,
                    email: email,
                    emailHash: emailHash,
                    previewBgColor: previewColor
                }
            });

            let [ lastComment ] = await Promise.all([
                (async () => {
                    let result = await kmtrApi.query(
                        `query ( $emailContains: String ) {
                            lastComment: getComment (
                                emailContains: $emailContains
                                sortField: "createdAt"
                                sortDirection: "desc"
                            ) {
                                _id createdAt text replyCount replyingToId
                                poster {
                                    email emailHash
                                }
                            }
                        }`,
                        email
                    );
                    return { ...result.data.lastComment };
                })(),

                new Promise(resolve => {
                    let modalElem = document.querySelector('.user-details-modal');
                    modalElem.addEventListener('transitionend', resolve, {once: true});
                }),

                preloadPromise
            ]);

            this.patchComment(lastComment);

            this.setState({
                userDetailsModal: {
                    ...this.state.userDetailsModal,
                    lastComment: lastComment,
                    highResReady: true
                }
            });
        }


        openReplyModalFor(comment) {
            this.setState(({ replyModal }) => ({
                replyModal: {
                    ...replyModal,
                    isOpen: true,
                    targetComment: comment
                }
            }));
        }


        /*
        * Closes the User Details Dialog.
         */
        closeUserDetails() {
            this.setState({
                userDetailsModal: {
                    ...this.state.userDetailsModal,
                    isOpen: false,
                    highResReady: false
                }
            });
        }


        patchComment(comment) {
            comment.replies = [];
            comment.isLoadingReplies = false;
            comment.createdAt = new Date(comment.createdAt);
        }


        /*
        * Loads comments; has two modes based on the `opts.reset` option:
        * either reset comment to the first "page" of comments, or just load the next page and add it to the current comments
         */
        async loadComments(opts={}) {
            runInAction(() => {
                this.setState(state => ({
                    hasMoreCommentsToLoad: opts.reset ? true : state.hasMoreCommentsToLoad,
                    loaderTopPos: opts.reset ? null : this.commentListRef.offsetHeight - 10,
                    isAtFirstPage: opts.reset
                }));
                this.isInited = true;
                this.isLoadingComments = true;
            });

            await this.props.store.meReady;

            try {
                let resp = await kmtrApi.query(
                    `query (
                        $emailContains: String
                        $replyingToId: ID
                        $skip: Int
                        $limit: Int
                        $sortField: String
                        $sortDirection: String
                        #$friendshipsOfUserIds: [ID]
                        #$friendshipWithUserId: ID!
                    ) {
                        comments: getComments(
                            emailContains: $emailContains
                            replyingToId: $replyingToId
                            skip: $skip
                            limit: $limit
                            sortField: $sortField
                            sortDirection: $sortDirection
                        ) {
                            _id createdAt text replyCount replyingToId
                            poster {
                                _id email emailHash
                                #friendships (userIds: $friendshipsOfUserIds) {
                                #    userId1 userId2 sentAt acceptedAt status
                                #}
                                #friendship (userId: $friendshipWithUserId) {
                                #    userId1, userId2, sentAt acceptedAt status
                                #}
                            }
                        }
                    }`,
                    this.state.searchTerm.length < 2 ? '' : this.state.searchTerm,
                    null,
                    opts.reset ? 0 : this.comments.length,
                    this.topCommentsPageSize,
                    'createdAt',
                    'desc',
                    // this.props.store.me ? [this.props.store.me._id] : undefined
                    this.props.store.me ? this.props.store.me._id : undefined
                );

                let comments = resp.data.comments;

                /* *** *//* *** *//* *** */
                // let createdAt = new Date(Date.now() - 1000*60*12);
                // comments = [];
                // for (let i=0; i<8; ++i) {
                //     comments.push({
                //         _id: (i + 1).toString(),
                //         email: '1dorshtief@gmail.com',
                //         emailHash: 'e04d85ddeb63a1be768010d28c1025e5',
                //         createdAt: createdAt.toISOString(),
                //         text: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.` + "\n" +
                //         `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`
                //     });
                // }
                /* *** *//* *** *//* *** */

                runInAction(() => {
                    this.setState(state => ({
                        hasMoreCommentsToLoad: comments.length === this.topCommentsPageSize,
                        lastSearchTermUsed: state.searchTerm
                    }));

                    if (opts.reset)
                        this.comments = observable([]);

                    this.comments.push(
                        ...comments.map(item => {
                            let newItem = { ...item };
                            this.patchComment(newItem);
                            return newItem;
                        })
                    );

                    window.comments = this.comments;

                    // setTimeout(() => {
                    //     runInAction(() => {
                    //         this.comments[0].text += '_';
                    //     });
                    // }, 1000);
                });
            }
            catch (err) {
                // TODO: Pop a modal with text such as "Couldn't load messages..."
                console.log('err', err);
                console.error("Couldn't get comments:", err);
            }

            this.isLoadingComments = false;
        }


        async loadCommentsOfComment(ofComment, opts={}) {
            runInAction(() => {
                this.isInited = true;
                ofComment.isLoadingReplies = true;
            });

            try {
                let resp = await kmtrApi.query(
                    `query (
                        $replyingToId: ID
                        $skip: Int
                        $limit: Int
                        $sortField: String
                        $sortDirection: String
                    ) {
                        comments: getComments(
                            replyingToId: $replyingToId
                            skip: $skip
                            limit: $limit
                            sortField: $sortField
                            sortDirection: $sortDirection
                        ) {
                            _id createdAt text replyCount replyingToId
                            poster {
                                _id email emailHash
                            }
                        }
                    }`,
                    ofComment._id,
                    opts.reset ? 0 : ofComment.replies.length,
                    this.nestedCommentsPageSize,
                    'createdAt',
                    'desc'
                );

                let comments = resp.data.comments;

                comments = comments.map(item => {
                    let newItem = { ...item };
                    this.patchComment(newItem);
                    return newItem;
                });

                runInAction(() => {
                    if (opts.reset) {
                        ofComment.replies = [];
                    }
                    ofComment.replies.push(...comments);
                    ofComment.isLoadingReplies = false;
                });
            }
            catch (err) {
                // TODO: Pop a modal with text such as "Couldn't load messages..."
                console.error(err);
            }

            ofComment.isLoadingReplies = false;
        }


        async authenticateIfNotAllready() {
            if (this.props.store.me)
                return this.props.store.me;

            this.props.store.showAuthModal = true;

            let un1, un2;

            try {
                return await new Promise((resolve, reject) => {
                    un1 = observe(this.props.store, 'me', ({ newValue }) => {
                        resolve(newValue);
                    });
                    un2 = observe(this.props.store, 'showAuthModal', ({ newValue }) => {
                        if (!newValue) {
                            reject(new Error('Dismissed dialog'));
                        }
                    });
                });
            }
            finally {
                un1();
                un2();
                this.props.store.showAuthModal = false;
            }
        }


        async onNewCommentType(text) {
            if (!this.isComposing && !text) {
                return;
            }
            this.isComposing = true;
            this.setComposingState(true);
            this.debounceComposingStateReset();
        }


        async saveComment(email, text, targetComment=null) {
            // if (!this.props.store.me) {
            //     alert('Must be logged-in!');
            // } else {
            //     console.log('this.props.store.me', this.props.store.me);
            //     alert('Ok...');
            // }
            // return;
            //
            // if (!this.props.store.me) {
            //     //
            // }
            //
            await this.authenticateIfNotAllready();

            let newComment;

            try {
                let { data } = await kmtrApi.mutate(
                    `mutation ( $posterId: ID, $email: String, $text: String, $replyingToId: ID ) {
                        newComment: postComment (
                            posterId: $posterId
                            email: $email
                            text: $text
                            replyingToId: $replyingToId
                        ) {
                            _id text replyCount createdAt replyingToId
                            poster {
                                _id email emailHash
                            }
                        }
                    }`,
                    this.props.store.me._id,
                    email,
                    text.trim(),
                    targetComment ? targetComment._id : null
                );

                newComment = data.newComment;
            }
            catch (err) {
                // TODO: Pop a modal with text such as "Unfortunately, couldn't save the new message..."
                throw err;
            }

            this.debounceComposingStateReset.flush();

            this.patchComment(newComment);

            if (targetComment) {
                targetComment.replies.push(newComment);
            } else {
                this.comments.unshift(newComment);
            }
        }


        async updateComment(comment, newText) {
            // console.log(comment, newText);
            console.log('COMMENT', comment);

            await kmtrApi.mutate(
                `mutation ( $id: ID!, $text: String! ) {
                    editComment(
                        id: $id
                        text: $text
                    ) {
                        _id text
                    }
                }`,
                comment._id,
                newText
            );

            comment.text = newText;
        }


        async resolveFriendRequest({ userId1, userId2 }, status) {
            let { data: { resolvedFriendship } } = await kmtrApi.mutate(
                `mutation ( $id1: ID!, $id2: ID!, $status: FriendshipStatus) {
                    resolvedFriendship: updateFriendship (
                        id1: $id1
                        id2: $id2
                        newStatus: $status
                    ) {
                        status
                    }
                }`,
                userId1, userId2, status
            );
            this.setState(state => {
                let friendRequests = state.friendRequests.filter(item => item.userId1 !== userId1 || item.userId2 !== userId2);
                return { friendRequests };
            });
        }


        render() {
            return (
                <div className="app-component">

                    <ul>
                        <FlipMove {...this.flipMoveProps}>
                            {this.items.map(item =>
                                <li key={item.name}>
                                    {item.name}
                                </li>
                            )}
                        </FlipMove>
                    </ul>

                    {!!this.state.friendRequests.length && (
                        <ul>
                            <h5>Pending Friend Requests:</h5>
                            {this.state.friendRequests.map(item =>
                                <li key={`${item.userId1}_${item.userId2}`}>
                                    {item.user2.email}
                                    <button className=""
                                            onClick={async () => {
                                                console.log(`Accepting friend request from "${item.user2.email}" (ID "${item.user2._id}")...`);
                                                await this.resolveFriendRequest(item, 'accepted');
                                                console.log(`Accepted friend request from "${item.user2.email}" (ID "${item.user2._id}")!`);
                                            }}>
                                        Accept
                                    </button>
                                    <button className=""
                                            onClick={async () => {
                                                console.log(`Rejecting friend request from "${item.user2.email}" (ID "${item.user2._id}")...`);
                                                await this.resolveFriendRequest(item, 'rejected');
                                                console.log(`Rejected friend request from "${item.user2.email}" (ID "${item.user2._id}")!`);
                                            }}>
                                        Reject
                                    </button>
                                </li>
                            )}
                        </ul>
                    )}

                    <div className="current-user-section">
                        {this.props.store.me && (
                            <div className="my-image"
                                 style={{backgroundImage: 'url('+gravatarUrl(this.props.store.me.emailHash)+')'}}></div>
                        )}
                    </div>

                    <CommentForm className="comment-form padding-sides"
                                 onEmailChange={email => this.setState({ newCommentEmail: email })}
                                 onTextChange={text => {
                                     this.setState(state => ({ newCommentText: text }));
                                     this.onNewCommentType(text);
                                 }}
                                 onSubmit={(email, text) => this.saveComment(email, text)}></CommentForm>

                    <div className="comments-wrapper padding-sides">
                        <div className="comment-search-wrapper">
                            <div className="comment-search-icon"></div>

                            <Input className="comment-search-field"
                                   placeholder="Filter (at least 2 chars)"
                                   value={this.state.searchTerm}
                                   onInput={e => {
                                       this.setState({searchTerm: e.target.value});
                                       if (
                                           e.target.value !== this.state.lastSearchTermUsed &&
                                           !(e.target.value.length < 2 && this.state.lastSearchTermUsed.length < 2)
                                       ) {
                                           this.loadCommentsDebounced({reset: true});
                                       }
                                   }} />
                        </div>

                        <div style={{marginBottom: '12px'}}>
                            {/*<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
                                <path d="M 395.947 125.821 L 491.869 291.963 L 300.025 291.963 L 395.947 125.821 Z"
                                      style={{fill: 'rgb(216, 216, 216)'}} transform="matrix(0, -1, 1, 0, 1.642935, 621.577209)" />
                            </svg>*/}

                            {this.props.store.me ? (
                                <Fragment>
                                    <div>Logged in as {this.props.store.me.name}</div>
                                    <div style={{fontSize: '11px'}}>{JSON.stringify(this.props.store.me)}</div>
                                    <button onClick={() => auth.signOut()}>
                                        Logout
                                    </button>
                                </Fragment>
                            ) : (
                                <Fragment>
                                    {['1dorshtief@gmail.com', 'dorshtaif@gmail.com'].map(email =>
                                        <Fragment key={email}>
                                            <button onClick={() => auth.signIn(email, '12345')}>
                                                Sign In As {email}
                                            </button>
                                            <br/><br/>
                                        </Fragment>
                                    )}
                                    {/*<button onClick={async () => {
                                                await auth.signUp('1dorshtief@gmail.com', '12345');
                                            }}>
                                        Sign Up
                                    </button>*/}
                                </Fragment>
                            )}
                        </div>

                        <div className="comment-list"
                             ref={elem => this.commentListRef = elem}>
                            <FlipMove typeName={null}
                                      duration={200}
                                      enterAnimation={{
                                          from: { opacity: 0, transform: 'scale(0.5)' },
                                          to: { opacity: 1, transform: 'scale(1.0)' }
                                      }}
                                      leaveAnimation={{
                                          from: { opacity: 1, transform: 'scale(1.0)' },
                                          to: { opacity: 0, transform: 'scale(0.5)' }
                                      }}>
                                {this.isLoadingComments && (
                                    <MdLoader className={classNames({
                                                  'top-level-loader': true,
                                                  'loading-first-page': this.state.isAtFirstPage
                                              })}
                                              style={{top: this.state.loaderTopPos===null? undefined : this.state.loaderTopPos+'px'}}
                                              key="loader-key" />
                                )}
                            </FlipMove>

                            <InfiniteScroll initialLoad={false}
                                            threshold={5}
                                            useCapture={false}
                                            useWindow={true}
                                            hasMore={this.state.hasMoreCommentsToLoad && !this.isLoadingComments && this.comments.length > 0}
                                            loadMore={() => this.loadComments()}>

                                <FlipMove {...this.flipMoveProps}
                                          staggerDelayBy={(() => {
                                              if (this.comments.length === 0 && !this.isLoadingComments && this.isInited && this.state.lastSearchTermUsed === '') {
                                                  return 250;
                                              } else {
                                                  return this.flipMoveProps.staggerDelayBy || 0;
                                              }
                                          })()}>
                                    {!this.comments.length ? (
                                        this.comments.length === 0 && !this.isLoadingComments && this.isInited && (
                                                this.state.lastSearchTermUsed === '' ? [
                                                    <div className="no-comments"
                                                         key="no-comments">
                                                        <div>No comments yet...</div>
                                                        <div>Go ahead - be the first <span className="kommentyr">Kommentyr</span>!</div>
                                                    </div>,
                                                    <div className="no-comments-image-container">
                                                        <img className="no-comments-image"
                                                             src="/favicon.png" />
                                                    </div>
                                                ] : [
                                                    <div className="no-comments"
                                                         key="no-comments">
                                                         No matchings for
                                                         &quot;<span className="unmatched-term">{ this.state.lastSearchTermUsed }</span>&quot;...
                                                    </div>
                                                ]
                                        )
                                    ) : ([
                                        (this.usersComposing.length ? (
                                            <div className="comment-container"
                                                 key={'comment-container-user-composing'}>
                                                <MessageBubble className="users-currently-composing"
                                                               key="comment-item-user-composing"
                                                               leftPartTemplate={() => {
                                                                   return (
                                                                       <FlipMove {...this.flipMoveProps}>
                                                                           {this.usersComposing.map(user =>
                                                                               <div className="user-image"
                                                                                    key={user._id}
                                                                                    style={{backgroundImage: 'url('+gravatarUrl(user.emailHash)+')'}}></div>
                                                                            )}
                                                                       </FlipMove>
                                                                   );
                                                                }}>
                                                    <span className="dot"></span>
                                                    <span className="dot"></span>
                                                    <span className="dot"></span>
                                                </MessageBubble>
                                            </div>
                                        ) : <span key="comment-container-user-composing-none"></span>),

                                        (function recurse(comments, depth=0) {
                                            return comments.map((comment, k) => {
                                                let depthMarginStep = 30;
                                                let isExpanded = this.state.commentsWithRepliesExpanded.includes(comment);

                                                return [
                                                    <div className={`comment-container level-${depth}`}
                                                         key={'comment-container-'+comment._id}
                                                         style={{marginLeft: (depth * depthMarginStep)+'px'}}>
                                                        <Comment className={classNames({'comment-item': true, 'nested': !!depth})}
                                                                 key={'comment-item-'+comment._id}
                                                                 comment={comment}
                                                                 imageUrl={gravatarUrl(comment.poster.emailHash, this.state.userImageThumbSize)}
                                                                 imageOnClick={e => {
                                                                     e.stopPropagation();
                                                                     this.openUserDetails(comment.poster.email, comment.poster.emailHash);
                                                                 }}
                                                                 onClick={() => {
                                                                     // this.openReplyModalFor(comment);
                                                                     // this.comments.splice(this.comments.indexOf(comment), 1);
                                                                     // let newText = prompt();
                                                                     this.updateComment(comment, `__${comment.text}__`);
                                                                 }} />

                                                        <FlipMove {...this.flipMoveProps}>
                                                            {!isExpanded && comment.replyCount > 0 && (
                                                                comment.isLoadingReplies ? (
                                                                    <MdLoader className={classNames({
                                                                                  'nested-loader': true,
                                                                                  'loading-first-page': this.state.isAtFirstPage
                                                                              })}
                                                                              key={comment._id+'-nested-loader'} />
                                                                ) : (
                                                                    <div className="show-replies-butt"
                                                                         style={{marginLeft: depthMarginStep+'px'}}
                                                                         key={comment._id+'-show-replies'}
                                                                         onClick={async () => {
                                                                             await this.loadCommentsOfComment(comment, {reset: true});
                                                                             this.setState(state => ({
                                                                                 commentsWithRepliesExpanded: [ comment, ...state.commentsWithRepliesExpanded ]
                                                                             }));
                                                                         }}>
                                                                        Show {comment.replyCount} {comment.replyCount > 1 ? 'replies' : 'reply'}
                                                                    </div>
                                                                )
                                                            )}
                                                        </FlipMove>
                                                    </div>,

                                                    isExpanded && comment.replies && comment.replies.length && (
                                                        recurse.call(this, comment.replies, depth + 1)
                                                    )
                                                ];
                                            });
                                        }).call(this, this.comments)
                                    ])}
                                </FlipMove>

                            </InfiniteScroll>
                        </div>

                    </div>



                    <ReplyModal isOpen={this.state.replyModal.isOpen}
                                targetComment={this.state.replyModal.targetComment}
                                onEmailChange={email => this.setState(state => ({ replyModal: { ...state.replyModal, email } }))}
                                onTextChange={text => this.setState(state => ({ replyModal: { ...state.replyModal, text } }))}
                                onSubmit={async (email, text) => {
                                    await this.saveComment(email, text, this.state.replyModal.targetComment);
                                    this.setState(({ replyModal }) => ({
                                        replyModal: { ...replyModal, isOpen: false }
                                    }));
                                }}></ReplyModal>



                    <AuthModal isOpen={this.props.store.showAuthModal}></AuthModal>



                    <Modal className="user-details-modal"
                           isOpen={this.state.userDetailsModal.isOpen}
                           centered={true}>
                        <ModalBody>
                            <div className="wrapper">
                                <button className="close-butt"
                                        onClick={() => this.closeUserDetails()}>
                                    <span className="x">×</span>
                                </button>

                                <div className="preview-bg abs"
                                     style={{backgroundColor: this.state.userDetailsModal.previewBgColor}}>
                                </div>

                                <div className={classNames(
                                        'user-image abs',
                                        {ready: this.state.userDetailsModal.highResReady}
                                     )}
                                     style={{backgroundImage: `url(`+gravatarUrl(this.state.userDetailsModal.emailHash, this.state.userImageHighResSize)+`)`}}>
                                </div>

                                <div className="dark-area abs"></div>

                                <div className="text lt abs"
                                     onClick={() => {
                                         this.closeUserDetails();
                                         this.setState(
                                             {searchTerm: this.state.userDetailsModal.email},
                                             () => this.loadComments({reset: true})
                                         );
                                     }}>
                                    {this.state.userDetailsModal.email}
                                </div>

                                <div className="text rt abs">
                                    <div className="last-active-label">Last active:</div>
                                    <div className="last-active-value">
                                        {this.state.userDetailsModal.lastComment && (
                                            <ReactTimeAgo>
                                                {this.state.userDetailsModal.lastComment.createdAt}
                                            </ReactTimeAgo>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ModalBody>
                    </Modal>

                </div>
            );
        }
    }
);








// import React, { Component } from 'react';
// import { extendObservable } from 'mobx';
// import { observer }  from 'mobx-react';
//
// export default observer(
//     class App extends Component {
//         constructor() {
//             super();
//             extendObservable(this, {
//                 counter: 0,
//             });
//             setTimeout(() => {
//                 this.counter++;
//             }, 2000);
//         }
//
//         increment() {
//             this.counter++;
//         }
//
//         decrement() {
//             this.counter--;
//         }
//
//         render() {
//             return (
//                 <div>
//                     {this.counter}
//
//                     <button onClick={() => this.increment()} type="button">Increment</button>
//                     <button onClick={() => this.decrement()} type="button">Decrement</button>
//                 </div>
//             );
//         }
//     }
// );
