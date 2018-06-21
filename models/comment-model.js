const mongoose = require('mongoose');

module.exports = mongoose.model(
    'Comment',
    new mongoose.Schema(
        {
            email: {
                type: String
            },
            emailHash: {
                type: String
            },
            text: {
                type: String
            }
        },
        {
            timestamps: {
                createdAt: true,
                updatedAt: false
            }
        }
    )
);
