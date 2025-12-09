const mongoose = require('mongoose');

const nonceSchema = new mongoose.Schema({
  wallet_address: { type: String, required: true, unique: true, index: true },
  nonce: { type: String, required: true },
  created_at: { type: Date, default: Date.now, expires: 600 } // 10 minutes TTL
}, { timestamps: true });

module.exports = mongoose.models.Nonce || mongoose.model('Nonce', nonceSchema);
