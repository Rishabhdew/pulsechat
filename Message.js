const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
{
  sender: String,
  receiver: String,
  conversationId: String,
  text: String,
  content: String
},
{ timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);