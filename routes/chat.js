const express = require('express');
const router = express.Router();

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const authMiddleware = require('../auth');


// GET ALL CONVERSATIONS

router.get('/conversations', authMiddleware, async (req, res) => {

    try {

        const userId = req.user.id;

        const conversations = await Conversation.find({
            participants: userId
        })
        .populate('participants', 'username')
        .sort({ updatedAt: -1 });

        res.json(conversations);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


// CREATE GROUP

router.post('/groups/create', authMiddleware, async (req, res) => {

    try {

        const { groupName, members } = req.body;

        const conversation = new Conversation({

            type: 'group',

            groupName,

            groupAdmin: req.user.id,

            participants: [
                req.user.id,
                ...members
            ]

        });

        await conversation.save();

        res.json(conversation);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


module.exports = router;
