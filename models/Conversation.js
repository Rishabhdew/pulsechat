const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({

    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    },

    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    groupName: {
        type: String,
        default: ''
    },

    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    lastMessage: {
        type: String,
        default: ''
    }

}, { timestamps: true });

module.exports = mongoose.model(
    'Conversation',
    conversationSchema
);
