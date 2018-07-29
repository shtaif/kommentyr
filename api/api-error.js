module.exports = class ApiError extends Error {
    constructor() {
        let errorCode = 'ERR_UNKOWN';
        let message = '';
        let statusCode = 500;

        if (arguments.length === 3) {
            [ errorCode, message, statusCode ] = arguments;
        } else if (arguments.length === 2) {
            [ errorCode, statusCode ] = arguments;
        } else if (arguments.length === 1) {
            if (arguments[0] instanceof Object) {
                errorCode = arguments[0].errorCode;
                message = arguments[0].message;
                statusCode = arguments[0].statusCode;
            } else {
                statusCode = arguments[0];
            }
        }

        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
    }
};
