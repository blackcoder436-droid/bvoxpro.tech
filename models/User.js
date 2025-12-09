const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, index: true },
  userid: { type: String, index: true },
  uid: { type: String, index: true },
  username: { type: String, required: true },
  email: { type: String },
  password: { type: String },
  balance: { type: Number, default: 0 },
  balances: { type: Object, default: {} },
  wallet_address: { type: String },
  total_invested: { type: Number, default: 0 },
  total_income: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  meta: { type: Object, default: {} },
  status: { type: String, default: 'active' },
  kycStatus: { type: String, default: 'none' },
  force_trade_win: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
