const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },

  messageType: {
    type: String,
    enum: ["text", "image", "audio"],
    default: "text"
  },

  content: {
    type: String,
    default: ""
  },

  mediaUrl: {
    type: String,
    default: ""
  }

}, { timestamps: true });

module.exports = mongoose.model(
  "Message",
  messageSchema
);
