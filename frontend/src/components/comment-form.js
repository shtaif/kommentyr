import React, { Component } from 'react';
import { Input } from 'reactstrap';
import TextareaAutosize from 'react-textarea-autosize';
import noop from '../tools/noop';
import './comment-form.css';


class CommentForm extends Component {
    constructor(props) {
        super();

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
        this.setState({isBusy: true});

        try {
            await this.state.onSubmit(this.state.email, this.state.text);
        }
        catch (err) {/* Swallow error... */}

        this.setState({
            isBusy: false,
            email: '',
            text: ''
        });
    }


    render() {
        return (
            <form className={'comment-form-component '+(this.props.className || '')}
                  onSubmit={e => {
                      e.preventDefault();
                      this.handleOnSubmit();
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

                    {/*a*/}
                    {/*<div>Email is invalid</div>*/}

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
}


export default CommentForm;
