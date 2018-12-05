import React, { Component, Fragment } from 'react';
import './message-bubble.css';


export default class CommentBubble extends Component {
    render() {
        let { className='', imageUrl, imageOnClick, leftPartTemplate, children, ...otherProps } = this.props;

        return (
            <div {...otherProps}
                 className={`message-bubble-component ${className}`}>
                <div className="left-part-container">
                    {leftPartTemplate ? (
                        leftPartTemplate()
                    ) : (
                        <div className="image"
                             id="my-tooltip"
                             style={{backgroundImage: `url(${imageUrl})`}}
                             onClick={imageOnClick}></div>
                    )}
                    <div className="arrow"></div>
                </div>
                <div className="textuals">
                    {children}
                </div>
            </div>
        );
    }
};
