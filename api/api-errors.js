class ApiError extends Error {
    constructor() {
        super();

        this.errorCode = 'ERR_UNKNOWN';
        this.message = 'Some unknown error occured!';
        this.data = null;
        this.internalData = null;
        this.thrownAt = new Date().toISOString();

        if (arguments[0] instanceof Object) {
            for (let k in arguments[0]) {
                if (arguments[0][k]) {
                    this[k] = arguments[0][k];
                }
            }
        } else {
            [ this.errorCode, this.message, this.data, this.internalData ] = arguments;
        }

        Error.captureStackTrace(this, this.constructor);
    }
}

class UnknownError extends ApiError {
    constructor() {
        super({
            errorCode: 'ERR_UNKNOWN',
            message: 'Some unknown error occured!',
            data: arguments[0],
            internalData: arguments[1]
        });
    }
}

class UnauthenticatedError extends ApiError {
    constructor() {
        super({
            errorCode: 'ERR_UNAUTHENTICATED',
            message: 'You must be authenticated to perform this',
            data: arguments[0],
            internalData: arguments[1]
        });
    }
}

class InvalidParamsError extends ApiError {
    constructor(info) {
        super({
            message: 'supplied invalid parameters',
            ...info,
            errorCode: 'ERR_INVALID_PARAMS'
        });
    }
}

module.exports.ApiError = ApiError;
module.exports.UnknownError = UnknownError;
module.exports.UnauthenticatedError = UnauthenticatedError;
module.exports.InvalidParamsError = InvalidParamsError;
