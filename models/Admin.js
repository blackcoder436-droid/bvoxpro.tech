const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  id: { type: String, index: true },
  fullname: { type: String },
  username: { type: String },
  email: { type: String },
  password: { type: String },
  telegram: { type: String },
  wallets: { type: Object, default: {} },
  status: { type: String, default: 'active' },
  lastLogin: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
