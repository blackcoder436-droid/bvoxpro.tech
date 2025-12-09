const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, index: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  balance: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  meta: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
