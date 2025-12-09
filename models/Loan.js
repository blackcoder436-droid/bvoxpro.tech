const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  interest_rate: { type: Number, default: 0 },
  duration_days: { type: Number },
  total_repay: { type: Number },
  status: { type: String, default: 'active', enum: ['pending', 'active', 'completed', 'defaulted'] },
  disbursed_date: { type: Date },
  due_date: { type: Date },
  repay_date: { type: Date },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Loan || mongoose.model('Loan', loanSchema);
