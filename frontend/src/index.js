import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import { Provider } from 'react-redux';
import store from './store';
import appStore from './app-store';
import './index.css';

ReactDOM.render(
    <Provider store={store}>
        <App appStore={appStore} />
    </Provider>,
    document.querySelector('#root')
);
