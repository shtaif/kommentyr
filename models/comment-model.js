const mongoose = require('mongoose');

module.exports = mongoose.model(
    'Comment',
    new mongoose.Schema(
        {
            email: {
                type: String,
                index: true
            },
            emailHash: {
                type: String
            },
            text: {
                type: String
            },
            replyingToId: {
                type: String,
                index: true
            },
            posterId: {
                type: String,
                index: true
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
