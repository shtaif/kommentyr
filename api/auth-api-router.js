const
    crypto = require('crypto'),
    bcrypt = require('bcrypt'),
    KoaRouter = require('koa-router'),
    UserModel = require('../models/user-model'),
    { ApiError } = require('./api-errors'),
    config = require('../config');


module.exports = new KoaRouter()

    .post('/signup', async ctx => {
        await UserModel.remove();

        if (!ctx.request.body.email || !ctx.request.body.password) {
            throw new ApiError('ERR_MISSING_PARAMS', 'Missing required parameters', 400);
        }

        let existing = await UserModel.findOne({email: ctx.request.body.email});

        if (existing) {
            console.log('EXISTING', existing);
            throw new ApiError('ERR_EMAIL_EXISTS', 'An account with this email already exists', 400);
        }

        let hashedPassword = await bcrypt.hash(ctx.request.body.password, config.passwordHashSaltRounds);

        let newUser = await new UserModel({
            name: ctx.request.body.name || null,
            email: ctx.request.body.email,
            password: hashedPassword
        })
        .save();

        ctx.body = { data: newUser };
    })

    .put('/signin', async ctx => {
        if (!ctx.request.body.email || !ctx.request.body.password) {
            throw new ApiError('ERR_MISSING_PARAMS', 'Missing required parameters', 400);
        }

        let user;

        try {
            user = await UserModel.findOne({email: ctx.request.body.email});

            if (!user)
                throw new Error;

            let result = await bcrypt.compare(ctx.request.body.password, user.password);

            if (!result)
                throw new Error;
        }
        catch (err) {
            throw new ApiError('ERR_NO_MATCH', "Couldn't match supplied email and password", 400);
        }

        ctx.session.userId = user.id;

        ctx.body = { data: user };
    })

    .put('/signout', async ctx => {
        ctx.session.userId = null;
        ctx.body = { data: true };
    })

    .routes();
