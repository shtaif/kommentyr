const mongoose = require('mongoose');

module.exports = mongoose.model(
    'User',
    new mongoose.Schema(
        {
            name: {
                type: String,
                index: true
            },
            email: {
                type: String,
                index: true
            },
            emailHash: {
                type: String
            },
            password: {
                type: String,
                index: true
            }
        },
        {
            timestamps: {
                createdAt: true,
                updatedAt: true
            }
        }
    )
);
