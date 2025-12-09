const mongoose = require('mongoose');

const miningSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  package_id: { type: String },
  amount: { type: Number, required: true },
  daily_reward: { type: Number },
  total_earned: { type: Number, default: 0 },
  status: { type: String, default: 'active', enum: ['active', 'completed', 'cancelled'] },
  start_date: { type: Date },
  end_date: { type: Date },
  last_claim: { type: Date },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Mining || mongoose.model('Mining', miningSchema);
