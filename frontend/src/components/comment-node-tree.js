import React, { Component } from 'react';
import FlipMove from 'react-flip-move';
import classNames from 'classnames';
import './comment-node-tree.css';


class CommentNodeTree extends Component {
    state = {
        commentsWithRepliesExpanded: []
    };


    constructor(props) {
        super(props);
    }


    render() {
        let {
            comments = [],
            itemTemplate = () => '',
            emptyTemplate = () => '',
            className = '',
            flipMoveProps = {},
            ...otherProps
        } = this.props;

        return (
            <FlipMove {...flipMoveProps}>
                {comments && comments.length? (
                    (function recurse(comments, depth=0) {
                        return (
                            comments.map((comment, k) => {
                                let isExpanded = this.state.commentsWithRepliesExpanded.includes(comment);

                                return [
                                    <div className={classNames(
                                             'comment-container',
                                             `level-${depth}`,
                                             {'top-level': depth === 0}
                                         )}
                                         key={'comment-container-'+comment._id}
                                         style={{marginLeft: (depth * 30)+'px'}}>
                                        {itemTemplate.call(comment, comment, k)}

                                        {!isExpanded && comment.replyCount && (
                                            <div className="show-replies-butt"
                                                 key={comment._id+'-show-replies'}
                                                 onClick={() => {
                                                     this.setState(state => ({
                                                         commentsWithRepliesExpanded: [ comment, ...state.commentsWithRepliesExpanded ]
                                                     }));
                                                 }}>
                                                Show replies ({comment.replyCount})
                                            </div>
                                        )}
                                    </div>,

                                    isExpanded && comment.replies && comment.replies.length && (
                                        recurse.call(this, comment.replies, depth + 1)
                                    )
                                ];
                            })
                        );
                    }).call(this, comments)
                ) : (
                    emptyTemplate()
                )}
            </FlipMove>
        );
    }


    render___() {
        let {
            comments = [],
            itemTemplate = () => {},
            depth = 0,
            className = '',
            ...otherProps
        } = this.props;

        // return (
        //     <FlipMove typeName={null}
        //               maintainContainerHeight={false}
        //               staggerDelayBy={25}
        //               enterAnimation={{
        //                   from: { opacity: 0, transform: 'scale(0.5)' },
        //                   to: { opacity: 1, transform: 'scale(1.0)' }
        //               }}
        //               leaveAnimation={{
        //                   from: { opacity: 1, transform: 'scale(1.0)' },
        //                   to: { opacity: 0, transform: 'scale(0.5)' }
        //               }}>
        //
        //         {comments.map((comment, k) =>
        //             <div {...otherProps}
        //                  className={`comment-node ${className}`}
        //                  key={comment._id}>
        //
        //                 {itemTemplate.call(comment, comment, k)}
        //
        //                 {depth > 0 && (
        //                     <input className="new-sub-comment-field"
        //                            key={comment._id+'_reply_field'}
        //                            placeholder="Write your reply"
        //                            type="text" />
        //                 )}
        //
        //                 {(() => {
        //                     if (this.state.commentsWithRepliesExpanded.includes(comment)) {
        //                         return (
        //                             <CommentNodeTree comments={comment.replies}
        //                                              depth={depth + 1}
        //                                              itemTemplate={itemTemplate} />
        //                         );
        //                     } else if (comment.replies.length) {
        //                         return (
        //                             <div className="show-replies-butt"
        //                                 key={comment._id+'_show_replies'}
        //                                  onClick={() => {
        //                                      this.setState(({ commentsWithRepliesExpanded }) => {
        //                                          commentsWithRepliesExpanded.push(comment);
        //                                          return { commentsWithRepliesExpanded: [...commentsWithRepliesExpanded] };
        //                                      });
        //                                  }}>
        //                                 Show replies ({comment.replies.length})
        //                             </div>
        //                         );
        //                     }
        //                 })()}
        //
        //             </div>
        //         )}
        //
        //     </FlipMove>
        // );

        // return comments.map((comment, k) =>
        //     <div {...otherProps}
        //          className={`comment-node ${className}`}
        //          key={comment._id}>
        //
        //         {itemTemplate.call(comment, comment, k)}
        //
        //         {depth > 0 && (
        //             <input className="new-sub-comment-field"
        //                    key={comment._id+'_reply_field'}
        //                    placeholder="Write your reply"
        //                    type="text" />
        //         )}
        //
        //         {(() => {
        //             if (this.state.commentsWithRepliesExpanded.includes(comment)) {
        //                 return (
        //                     <CommentNodeTree comments={comment.replies}
        //                                      depth={depth + 1}
        //                                      itemTemplate={itemTemplate} />
        //                 );
        //             } else if (comment.replies.length) {
        //                 return (
        //                     <div className="show-replies-butt"
        //                         key={comment._id+'_show_replies'}
        //                          onClick={() => {
        //                              this.setState(({ commentsWithRepliesExpanded }) => {
        //                                  commentsWithRepliesExpanded.push(comment);
        //                                  return { commentsWithRepliesExpanded: [...commentsWithRepliesExpanded] };
        //                              });
        //                          }}>
        //                         Show replies ({comment.replies.length})
        //                     </div>
        //                 );
        //             }
        //         })()}
        //
        //     </div>
        // );
    }
}


export default CommentNodeTree;
