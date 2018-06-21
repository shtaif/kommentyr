const
    crypto = require('crypto'),
    KoaRouter = require('koa-router'),
    CommentModel = require('../models/comment-model'),
    ApiError = require('./api-error');


module.exports = new KoaRouter()

    /*
    * Route to fetch comments.
    * Supported querystring parameters:
    * - `id` to filter for a specific id
    * - `emailContains` to filter based on email
    * - `skip` / `limit` combo for pagination
    * - `sortField` / `sortDirection` combo for sorting
     */
    .get('/', async ctx => {
        let {
            id,
            emailContains,
            skip,
            limit,
            sortField,
            sortDirection
        } = ctx.request.query;

        let conditions = {};
        if (id) {
            conditions.id = id;
        }
        if (emailContains) {
            conditions.email = new RegExp(emailContains, 'i');
        }

        let comments = await CommentModel.find(
            conditions,
            null,
            {
                skip: Number.isInteger(+skip)? +skip : 0,
                limit: limit && Number.isInteger(+limit)? +limit : null,
                sort: {[sortField || 'createdAt']: sortDirection || 'desc'}
            }
        )

        ctx.body = { data: comments };
    })

    /*
    * Route to post a new comment.
    * Accepts a json payload with 2 properties:
    * - `email` - author's email
    * - `text` - comment text content
     */
    .post('/', async ctx => {
        try {
            let { email, text } = ctx.request.body;

            if (!email) {
                throw new ApiError('`email` must not be empty', 400);
            }

            let emailRegEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (!emailRegEx.test(email)) {
                throw new ApiError('`email` does not seem to be a valid email address', 400);
            }

            if (!text) {
                throw new ApiError('`text` must not be empty', 400);
            }

            let result;
            try {
                result = await new CommentModel({
                    email: email,
                    text: text,
                    emailHash: (() => {
                        let normalizedEmail = email.trim().toLowerCase();
                        return crypto.createHash('md5').update(normalizedEmail).digest('hex');
                    })()
                })
                .save();
            }
            catch (err) {
                console.error(err);
                throw new ApiError("Comment couldn't be posted due to an unkown error");
            }

            ctx.body = { data: result };
        }
        catch (err) {
            ctx.response.status = err.statusCode || 500;
            ctx.body = { errorMessage: err.message };
        }
    })

    .routes();
