// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    username: { type: String, unique: true },
    password: String,
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);