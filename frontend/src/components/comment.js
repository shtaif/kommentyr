import React, { Component } from 'react';
// import JsTimeAgo from 'javascript-time-ago';
// import en from 'javascript-time-ago/locale/en';
import ReactTimeAgo from 'react-time-ago';
import './comment.css';


// JsTimeAgo.locale(en);


export default class Comment extends Component {
    render() {
        let { className='', comment, imageUrl, imageOnClick, ...otherProps } = this.props;
        let now = new Date;

        return (
            <div {...otherProps}
                 className={`comment-component ${className}`}>
                <div className="image-container">
                    <div className="image"
                         onClick={imageOnClick}
                         style={{backgroundImage: `url(${imageUrl})`}}></div>
                    <div className="arrow"></div>
                </div>
                <div className="textuals">
                    <div className="email-and-time">
                        <span className="email">
                            {comment.email}
                        </span>
                        <span> - </span>
                        <span className="time">
                            <ReactTimeAgo>{comment.createdAt}</ReactTimeAgo>
                        </span>
                    </div>
                    <div className="text">
                        {comment.text}
                    </div>
                </div>
            </div>
        );
    }
};
