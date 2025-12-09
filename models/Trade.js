const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  pair: { type: String, required: true },
  type: { type: String, enum: ['buy', 'sell', 'long', 'short'] },
  entry_price: { type: Number, required: true },
  exit_price: { type: Number },
  amount: { type: Number, required: true },
  leverage: { type: Number, default: 1 },
  pnl: { type: Number, default: 0 },
  status: { type: String, default: 'open', enum: ['open', 'closed', 'cancelled'] },
  entry_time: { type: Date },
  exit_time: { type: Date },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);
