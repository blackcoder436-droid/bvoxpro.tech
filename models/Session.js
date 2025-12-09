const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, index: true, unique: true },
  userId: { type: String, index: true },
  userType: { type: String }, // user, admin
  token: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  expiresAt: { type: Date },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
