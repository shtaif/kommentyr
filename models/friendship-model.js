const mongoose = require('mongoose');

module.exports = mongoose.model(
    'Friendship',
    new mongoose.Schema(
        {
            userId1: {
                // type: mongoose.Schema.Types.ObjectId,
                type: String,
                required: true,
                index: true
            },
            userId2: {
                // type: mongoose.Schema.Types.ObjectId,
                type: String,
                required: true,
                index: true
            },
            sentAt: {
                type: Date,
                default: () => new Date
            },
            acceptedAt: {
                type: Date,
                default: null
            },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'rejected'],
                default: 'pending'
            }
        },
        {}
    )
);
