const mongoose = require('mongoose');

const exchangeRecordSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  from_coin: { type: String, required: true },
  to_coin: { type: String, required: true },
  from_amount: { type: Number, required: true },
  to_amount: { type: Number, required: true },
  rate: { type: Number },
  status: { type: String, default: 'completed', enum: ['pending', 'completed', 'failed'] },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.ExchangeRecord || mongoose.model('ExchangeRecord', exchangeRecordSchema);
