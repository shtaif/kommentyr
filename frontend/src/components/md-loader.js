import React, { Component } from 'react';
import './md-loader.css';


class MdLoader extends Component {
    render() {
        return (
            <div {...this.props}
                 className={`md-loader-component ${this.props.className}`}>
                <svg viewBox="25 25 50 50">
                    <circle cx="50"
                            cy="50"
                            r="20"
                            fill="none"
                            strokeWidth="4"
                            strokeMiterlimit="10" />
                </svg>
            </div>
        );
    }
}


export default MdLoader;
