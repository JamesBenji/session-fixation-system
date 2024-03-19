// creating user schema/document that will save user data in MongoDB
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSessions = new Schema({
  sessionID: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true
  },
  user: {
    type: Object,
    required: true,
  },
});

module.exports = mongoose.model("userSessions", userSessions);
