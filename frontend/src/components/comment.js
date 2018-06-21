import React, { Component } from 'react';
import './comment.css';


class Comment extends Component {
    render() {
        let { comment, imageUrl, imageOnClick, ...otherProps } = this.props;
        return (
            <div {...otherProps} className={`comment-component ${this.props.className}`}>
                <div className="image"
                     onClick={imageOnClick}
                     style={{backgroundImage: `url(${imageUrl})`}}></div>
                 <div className="textuals">
                    <div className="email">{comment.email}</div>
                    <div className="text">{comment.text}</div>
                </div>
            </div>
        );
    }
}


export default Comment;
