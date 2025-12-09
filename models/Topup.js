const mongoose = require('mongoose');

const topupSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  coin: { type: String, required: true },
  address: { type: String },
  photo_url: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'complete', 'rejected'] },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Topup || mongoose.model('Topup', topupSchema);
