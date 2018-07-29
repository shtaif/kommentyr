import React, { Component } from 'react';
import { Input } from 'reactstrap';
import TextareaAutosize from 'react-textarea-autosize';
import noop from '../tools/noop';
import './comment-form.css';


export default class CommentForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            email: props.email || '',
            text: props.text || '',
            isBusy: false,
            onEmailChange: props.onEmailChange || noop,
            onTextChange: props.onTextChange || noop,
            onSubmit: props.onSubmit || noop
        };
    }


    async handleOnSubmit() {
        this.setState(state => ({isBusy: true}));

        let failure = null;

        try {
            await this.state.onSubmit(this.state.email, this.state.text);

            this.setState(state => ({
                email: '',
                text: ''
            }));

            this.state.onEmailChange('');
            this.state.onTextChange('');
        }
        catch (err) {
            failure = err;
        }

        this.setState(state => ({isBusy: false}));

        if (failure) {
            throw failure;
        }
    }


    render() {
        return (
            <form className={'comment-form-component '+(this.props.className || '')}
                  onSubmit={async e => {
                      e.preventDefault();
                      await this.handleOnSubmit();
                  }}>
                <fieldset disabled={this.state.isBusy}>

                    <Input className="email-field"
                           type="email"
                           required
                           placeholder="Email"
                           value={this.state.email}
                           onChange={e => {
                               this.setState({email: e.target.value});
                               this.state.onEmailChange(e.target.value);
                           }} />

                    <TextareaAutosize className="text-field"
                                      required
                                      placeholder="Message"
                                      value={this.state.text}
                                      onChange={e => {
                                          this.setState({text: e.target.value});
                                          this.state.onTextChange(e.target.value);
                                      }} />

                    <button className="submit-button btn btn-primary btn-md"
                            type="submit">Submit</button>

                </fieldset>
            </form>
        );
    }
};
