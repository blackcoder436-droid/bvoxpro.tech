const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  address: { type: String, required: true, unique: true, index: true },
  chain: { type: String }, // ethereum, polygon, bsc, etc.
  balance: { type: Number, default: 0 },
  balances: { type: Object, default: {} },
  is_primary: { type: Boolean, default: false },
  last_synced: { type: Date },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
