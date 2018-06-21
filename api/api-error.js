module.exports = class ApiError extends Error {
    constructor(message, statusCode=500) {
        super(message);
        this.statusCode = statusCode;
    }
};
