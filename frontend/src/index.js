import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import store from './app-store';
import './index.css';

ReactDOM.render(
    <App store={store} />,
    document.querySelector('#root')
);
