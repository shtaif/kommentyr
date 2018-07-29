import React, { Component } from 'react';
import './comment2.css';


class Comment2 extends Component {
    render() {
        let { className='', comment, imageUrl, imageOnClick, ...otherProps } = this.props;
        return [
            <div {...otherProps}
                 className={`comment-component ${className}`}>
                <div className="image"
                     onClick={imageOnClick}
                     style={{backgroundImage: `url(${imageUrl})`}}></div>
                 <div className="textuals">
                    <div className="email">{comment.email}</div>
                    <div className="text">{comment.text}</div>
                </div>
            </div>,

            <div>
                {comment.replies && (
                    comment.replies.map((comment, k) =>
                        <Comment2 className="comment-item"
                                  key={'comment-item-'+comment._id}
                                  comment={comment}
                                  imageUrl={''}
                                  imageOnClick={() => { /* ... */ }} />
                    )
                )}
            </div>
        ];
    }
}


export default Comment2;
