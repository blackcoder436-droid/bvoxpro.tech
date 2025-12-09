const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  coin: { type: String, required: true },
  address: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'complete', 'failed'] },
  txhash: { type: String },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Withdrawal || mongoose.model('Withdrawal', withdrawalSchema);
