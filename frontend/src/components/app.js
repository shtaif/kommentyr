import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { action, extendObservable } from 'mobx';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import debounce from 'lodash.debounce';
import gql from 'graphql-tag';
import lockr from 'lockr';
import JsTimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import ReactTimeAgo from 'react-time-ago';
import InfiniteScroll from 'react-infinite-scroller';
import FlipMove from 'react-flip-move';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import TextareaAutosize from 'react-textarea-autosize';
import CommentForm from './comment-form';
import Comment from './comment';
import Comment2 from './comment2';
import CommentNodeTree from './comment-node-tree';
import AuthModal from './auth-modal';
import ReplyModal from './reply-modal';
import MdLoader from './md-loader';
import userLoadedAction from '../actions/user-loaded';
import userSignInAction from '../actions/user-sign-in';
import userSignOutAction from '../actions/user-sign-out';
import userSignUpAction from '../actions/user-sign-up';
import apiClient from '../tools/api-client';
import apollo from '../tools/apollo-instance';
import preload from '../tools/preload-images';
import getImageColorforPreview from '../tools/get-image-color-for-preview';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';



let gravatarUrl = (emailHash, size='') => {
    return `https://www.gravatar.com/avatar/${emailHash}.jpg?s=${size}`;
};


export default observer(
    connect(
        store => ({
            me: store.me
        })
    ) (
        class App extends Component {
            state = {
                comments: [],
                commentsWithRepliesExpanded: [],
                searchTerm: '',
                lastSearchTermUsed: '',
                userImageThumbSize: 70,
                userImageHighResSize: 500,
                newCommentEmail: '',
                newCommentText: '',
                isLoadingComments: false,
                isAtFirstPage: true,
                isInited: false,
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
                showAuthModal: false
            };
            commentListRef = null;
            topCommentsPageSize = 10;
            nestedCommentsPageSize = 4;
            loadCommentsDebounced = (() => {
                let debounced = debounce(this.loadComments, 250);
                return opts => {
                    this.setState({ isLoadingComments: true });
                    debounced.call(this, opts);
                };
            })();

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
                // apiClient.setApiBaseUrl(window.location.origin+'/api');
                apiClient.setApiBaseUrl('https://localhost:4443/api');
                JsTimeAgo.locale(en);

                extendObservable(this, {
                    counter: 0
                });

                setTimeout(() => {
                    this.counter++;
                }, 2000);
            }


            async componentDidMount() {
                await this.loadComments({reset: true});
                setTimeout(() => {
                    // console.log('this.props.appStore', this.props.appStore);
                    action(() => {
                        this.props.appStore.num += 3;
                    })();
                }, 1000);
            }


            /*
            * Opens the User Details Dialog and kick-off additional async preparations for it.
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
                        let result = await apollo.query({
                            query: gql`
                                query ( $emailContains: String ) {
                                    lastComment: getComment (
                                        emailContains: $emailContains
                                        sortField: "createdAt"
                                        sortDirection: "desc"
                                    ) {
                                        _id
                                        createdAt
                                        text
                                        replyCount
                                        replyingToId
                                        poster {
                                            email
                                            emailHash
                                        }
                                    }
                                }
                            `,
                            variables: { emailContains: email }
                        });
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
            // async loadComments(opts={}) {
            //     this.setState(state => ({
            //         isInited: true,
            //         isLoadingComments: true,
            //         hasMoreCommentsToLoad: opts.reset ? true : state.hasMoreCommentsToLoad,
            //         loaderTopPos: opts.reset ? null : this.commentListRef.offsetHeight - 10,
            //         isAtFirstPage: opts.reset
            //     }));
            //
            //     try {
            //         let comments = await apiClient.fetch('comments', {
            //             emailContains: this.state.searchTerm.length < 2? '' : this.state.searchTerm,
            //             replyingToId: null,
            //             skip: opts.reset ? 0 : this.state.comments.length,
            //             limit: this.topCommentsPageSize,
            //             sortField: 'createdAt',
            //             sortDirection: 'desc'
            //         });
            //
            //         comments.forEach(comment => this.patchComment(comment));
            //
            //         this.setState(state => ({
            //             comments: [ ...(opts.reset? [] : state.comments), ...comments ],
            //             hasMoreCommentsToLoad: comments.length === this.topCommentsPageSize,
            //             lastSearchTermUsed: state.searchTerm
            //         }));
            //     }
            //     catch (err) {
            //         // TODO: Pop a modal with text such as "Couldn't load messages..."
            //         console.error(err);
            //     }
            //
            //     this.setState(state => ({ isLoadingComments: false }));
            // }


            async loadComments(opts={}) {
                this.setState(state => ({
                    isInited: true,
                    isLoadingComments: true,
                    hasMoreCommentsToLoad: opts.reset ? true : state.hasMoreCommentsToLoad,
                    loaderTopPos: opts.reset ? null : this.commentListRef.offsetHeight - 10,
                    isAtFirstPage: opts.reset
                }));

                try {
                    let resp = await apollo.query({
                        query: gql`
                            query (
                                $emailContains: String
                                $replyingToId: ID
                                $skip: Int
                                $limit: Int
                                $sortField: String
                                $sortDirection: String
                            ) {
                                comments: getComments(
                                    emailContains: $emailContains
                                    replyingToId: $replyingToId
                                    skip: $skip
                                    limit: $limit
                                    sortField: $sortField
                                    sortDirection: $sortDirection
                                ) {
                                    _id
                                    createdAt
                                    text
                                    replyCount
                                    replyingToId
                                    poster {
                                        email
                                        emailHash
                                    }
                                }
                            }
                        `,
                        variables: {
                            emailContains: this.state.searchTerm.length < 2 ? '' : this.state.searchTerm,
                            replyingToId: null,
                            skip: opts.reset ? 0 : this.state.comments.length,
                            limit: this.topCommentsPageSize,
                            sortField: 'createdAt',
                            sortDirection: 'desc'
                        }
                    });

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


                    comments = comments.map(item => {
                        let newItem = { ...item };
                        this.patchComment(newItem);
                        return newItem;
                    });

                    this.setState(state => ({
                        comments: [ ...(opts.reset? [] : state.comments), ...comments ],
                        hasMoreCommentsToLoad: comments.length === this.topCommentsPageSize,
                        lastSearchTermUsed: state.searchTerm
                    }));
                }
                catch (err) {
                    // TODO: Pop a modal with text such as "Couldn't load messages..."
                    console.error(err);
                }

                this.setState(state => ({ isLoadingComments: false }));
            }




            async loadCommentsOfComment(ofComment, opts={}) {
                this.setState(state => {
                    ofComment.isLoadingReplies = true;
                    return {
                        comments: [ ...state.comments ],
                        isInited: true,
                        // isLoadingComments: true
                    };
                });

                try {
                    let resp = await apollo.query({
                        query: gql`
                            query (
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
                                    _id
                                    createdAt
                                    text
                                    replyCount
                                    replyingToId
                                    poster {
                                        email
                                        emailHash
                                    }
                                }
                            }
                        `,
                        variables: {
                            replyingToId: ofComment._id,
                            skip: opts.reset ? 0 : ofComment.replies.length,
                            limit: this.nestedCommentsPageSize,
                            sortField: 'createdAt',
                            sortDirection: 'desc'
                        }
                    });

                    let comments = resp.data.comments;

                    comments = comments.map(item => {
                        let newItem = { ...item };
                        this.patchComment(newItem);
                        return newItem;
                    });

                    this.setState(state => {
                        ofComment.replies = [ ...(opts.reset ? [] : ofComment.replies), ...comments ];
                        ofComment.isLoadingReplies = false;
                        return {
                            comments: [ ...state.comments ],
                            // hasMoreCommentsToLoad: comments.length === this.topCommentsPageSize
                        };
                    });
                }
                catch (err) {
                    // TODO: Pop a modal with text such as "Couldn't load messages..."
                    console.error(err);
                }

                // this.setState(state => ({ isLoadingComments: false }));
            }


            async authenticateIfNotAllready() {
                if (this.props.me)
                    return;

                this.setState(state => ({ showAuthModal: true }));
            }


            async saveComment(email, text, targetComment=null) {
                if (!this.props.me) {
                    alert('Must be logged-in!');
                } else {
                    console.log('this.props.me', this.props.me);
                    alert('Ok...');
                }
                return;

                if (!this.props.me) {
                    //
                }

                let newComment;

                try {
                    let { data } = await apollo.mutate({
                        mutation: gql`
                            mutation ( $posterId: ID, $email: String, $text: String, $replyingToId: ID ) {
                                newComment: postComment (
                                    posterId: $posterId
                                    email: $email
                                    text: $text
                                    replyingToId: $replyingToId
                                ) {
                                    _id
                                    text
                                    replyCount
                                    createdAt
                                    replyingToId
                                    poster {
                                        email
                                        emailHash
                                    }
                                }
                            }
                        `,
                        variables: {
                            posterId: this.props.me._id,
                            email: email,
                            text: text.trim(),
                            replyingToId: targetComment ? targetComment._id : null
                        }
                    });

                    newComment = data.newComment;
                }
                catch (err) {
                    // TODO: Pop a modal with text such as "Unfortunately, couldn't save the new message..."
                    throw err;
                }

                this.patchComment(newComment);

                this.setState(state => {
                    if (targetComment) {
                        targetComment.replies.push(newComment);
                    } else {
                        state.comments.unshift(newComment);
                    }
                    return { comments: [ ...state.comments ] };
                });
            }


            render() {
                return (
                    <div className="app-component">

                        {/*{JSON.stringify(this.props.appStore)}*/}
                        {this.counter}

                        <div className="current-user-section">
                            {this.props.me && (
                                <div className="my-image"
                                     style={{backgroundImage: 'url('+gravatarUrl(this.props.me.emailHash)+')'}}></div>
                            )}
                        </div>

                        <CommentForm className="comment-form padding-sides"
                                     onEmailChange={email => this.setState({ newCommentEmail: email })}
                                     onTextChange={text => this.setState({ newCommentText: text })}
                                     onSubmit___={(email, text) => this.saveComment(email, text)}
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

                            <div>
                                {this.props.me ? (
                                    <Fragment>
                                        <div>Logged in as {this.props.me.name}</div>
                                        <div style={{fontSize: '11px'}}>{JSON.stringify(this.props.me)}</div>
                                        <button onClick={() => this.props.dispatch(userSignOutAction())}>Logout</button>
                                    </Fragment>
                                ) : (
                                    <Fragment>
                                        <button onClick={() => this.props.dispatch(userSignInAction('1dorshtief@gmail.com', '12345'))}>Sign In</button>
                                        <button onClick={async () => {
                                                    await this.props.dispatch(userSignUpAction('1dorshtief@gmail.com', '12345'));
                                                }}>
                                            Sign Up
                                        </button>
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
                                    {this.state.isLoadingComments && (
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
                                                hasMore={this.state.hasMoreCommentsToLoad && !this.state.isLoadingComments && this.state.comments.length > 0}
                                                loadMore={() => this.loadComments()}>

                                    <FlipMove {...this.flipMoveProps}
                                              staggerDelayBy={(() => {
                                                  if (this.state.comments.length === 0 && !this.state.isLoadingComments && this.state.isInited && this.state.lastSearchTermUsed === '') {
                                                      return 250;
                                                  } else {
                                                      return this.flipMoveProps.staggerDelayBy || 0;
                                                  }
                                              })()}>
                                        {!this.state.comments.length ? (
                                            this.state.comments.length === 0 && !this.state.isLoadingComments && this.state.isInited && (
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
                                        ) : (
                                            (function recurse(comments, depth=0) {
                                                return comments.map((comment, k) => {
                                                    let depthMarginStep = 30;
                                                    let isExpanded = this.state.commentsWithRepliesExpanded.includes(comment);

                                                    return [
                                                        <div className={classNames(
                                                                 'comment-container',
                                                                 `level-${depth}`
                                                             )}
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
                                                                         this.setState(({ replyModal }) => ({
                                                                             replyModal: {
                                                                                 ...replyModal,
                                                                                 isOpen: true,
                                                                                 targetComment: comment
                                                                             }
                                                                         }));
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
                                            }).call(this, this.state.comments)
                                        )}
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



                        <AuthModal isOpen={this.state.showAuthModal}></AuthModal>



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
    )
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
