import React, { Component } from 'react';
import classNames from 'classnames';
import debounce from 'lodash.debounce';
import JsTimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import ReactTimeAgo from 'react-time-ago';
import InfiniteScroll from 'react-infinite-scroller';
import FlipMove from 'react-flip-move';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from 'reactstrap';
import TextareaAutosize from 'react-textarea-autosize';
import CommentForm from './components/comment-form';
import Comment from './components/comment';
import MdLoader from './components/md-loader';
import apiClient from './tools/api-client';
import preload from './tools/preload-images';
import getImageColorforPreview from './tools/get-image-color-for-preview';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';



let gravatarUrl = (emailHash, size='') => {
    return `https://www.gravatar.com/avatar/${emailHash}.jpg?s=${size}`;
};



class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            comments: [],
            searchTerm: '',
            lastSearchTermUsed: '',
            commentListRef: null,
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
            }
        };

        this.loadCommentsDebounced = (() => {
            let debounced = debounce(this.loadComments, 250);
            return opts => {
                this.setState({ isLoadingComments: true });
                debounced.call(this, opts);
            };
        })();

        this.paging = {next: 0, pageSize: 10};

        apiClient.setApiBaseUrl(window.location.origin+'/api');

        JsTimeAgo.locale(en);
    }


    async componentDidMount() {
        await this.loadComments({reset: true});
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
            apiClient.fetchOne('comments', {
                emailContains: email,
                sortField: 'createdAt',
                sortDirection: 'desc'
            }),

            new Promise(resolve => {
                let modalElem = document.querySelector('.user-details-modal');
                modalElem.addEventListener('transitionend', resolve, {once: true});
            }),

            preloadPromise
        ]);

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
                isOpen: false
            }
        });
    }


    /*
    * Loads comments; has to modes based on the `opts.reset` option:
    * either reset comment to the first "page" of comments, or just load the next page and add it to the current comments
     */
    async loadComments(opts={reset: false}) {
        if (opts.reset) {
            this.paging.next = 0;
        }

        this.setState({
            isInited: true,
            isLoadingComments: true,
            hasMoreCommentsToLoad: opts.reset ? true : this.state.hasMoreCommentsToLoad,
            loaderTopPos: opts.reset ? null : this.state.commentListRef.offsetHeight - 10,
            isAtFirstPage: opts.reset
        });

        try {
            let comments = await apiClient.fetch('comments', {
                skip: this.paging.next,
                limit: this.paging.pageSize,
                emailContains: this.state.searchTerm.length < 2? '' : this.state.searchTerm,
                sortField: 'createdAt',
                sortDirection: 'desc'
            });

            this.paging.next += this.paging.pageSize;

            this.setState({
                comments: [ ...(opts.reset? [] : this.state.comments), ...comments ],
                hasMoreCommentsToLoad: comments.length === this.paging.pageSize,
                lastSearchTermUsed: this.state.searchTerm
            });
        }
        catch (err) {
            // TODO: Pop a modal with text such as "Couldn't load messages..."
            console.error(err);
        }

        this.setState({ isLoadingComments: false });
    }


    /*
    * Posts a new comment from the comment-form's fields.
    * Validation is done using HTML5 attribute directives
     */
    async saveComment() {
        try {
            let newComment;

            try {
                newComment = await apiClient.create('comments', {
                    email: this.state.newCommentEmail,
                    text: this.state.newCommentText
                });
            }
            catch (err) {
                // TODO: Pop a modal with text such as "Unfortunately, couldn't save the new message..."
                throw err;
            }

            this.setState({
                comments: [ newComment, ...this.state.comments ],
                newCommentEmail: '',
                newCommentText: ''
            });
        }
        catch (err) {
            console.error(err);
        }
    }


    render() {
        return (
            <div className="app-component">

                <CommentForm className="comment-form padding-sides"
                             onEmailChange={email => this.setState({ newCommentEmail: email })}
                             onTextChange={text => this.setState({ newCommentText: text })}
                             onSubmit={(email, text) => this.saveComment()}></CommentForm>

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

                    <div className="comment-list"
                         ref={elem => this.state.commentListRef = elem}>
                        <MdLoader key="loader-key"
                                  className={classNames(
                                      'loader',
                                      {'shown': this.state.isLoadingComments},
                                      {'loading-first-page': this.state.isAtFirstPage}
                                  )}
                                  style={{top: this.state.loaderTopPos===null? undefined : this.state.loaderTopPos+'px'}} />

                        <InfiniteScroll initialLoad={false}
                                        threshold={20}
                                        useCapture={false}
                                        useWindow={true}
                                        hasMore={this.state.hasMoreCommentsToLoad && !this.state.isLoadingComments}
                                        loadMore={() => this.loadComments()}>

                            <FlipMove maintainContainerHeight={false}
                                      staggerDelayBy={25}
                                      enterAnimation={{
                                          from: { opacity: 0, transform: 'scale(0.5)' },
                                          to: { opacity: 1, transform: 'scale(1.0)' }
                                      }}
                                      leaveAnimation={{
                                          from: { opacity: 1, transform: 'scale(1.0)' },
                                          to: { opacity: 0, transform: 'scale(0.5)' }
                                      }}>

                                {(() => {
                                    if (this.state.comments.length === 0 && !this.state.isLoadingComments && this.state.isInited) {
                                        return (
                                            <div className="no-comments"
                                                 key="no-comments">
                                                { this.state.lastSearchTermUsed === '' ? (
                                                    <span>
                                                        <div>No comments yet...</div>
                                                        <div>Go ahead - be the first <span className="kommentyr">Kommentyr</span>!</div>
                                                        <img src="/favicon.png" />
                                                    </span>
                                                ) : (
                                                    <span>
                                                        No matchings for &quot;<span className="unmatched-term">{ this.state.lastSearchTermUsed }</span>&quot;...
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        return this.state.comments.map(comment =>
                                            <Comment className="comment-item"
                                                     key={comment._id}
                                                     comment={comment}
                                                     imageUrl={gravatarUrl(comment.emailHash, this.state.userImageThumbSize)}
                                                     imageOnClick={() => this.openUserDetails(comment.email, comment.emailHash)} />
                                        );
                                    }
                                })()}

                            </FlipMove>

                        </InfiniteScroll>
                    </div>

                </div>



                <Modal className="user-details-modal"
                       isOpen={!!this.state.userDetailsModal.isOpen}
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
                                    {this.state.userDetailsModal.lastComment &&
                                        <ReactTimeAgo>
                                            {new Date(this.state.userDetailsModal.lastComment.createdAt)}
                                        </ReactTimeAgo>
                                    }
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>

            </div>
        );
    }
}

export default App;
