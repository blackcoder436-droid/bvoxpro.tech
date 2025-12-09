const mongoose = require('mongoose');

const arbitrageProductSchema = new mongoose.Schema({
  id: { type: String, index: true },
  name: { type: String, required: true },
  description: { type: String },
  min_amount: { type: Number, required: true },
  max_amount: { type: Number },
  daily_return: { type: Number, required: true },
  duration_days: { type: Number, required: true },
  total_return: { type: Number },
  status: { type: String, default: 'active', enum: ['active', 'inactive', 'closed'] },
  image_url: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.ArbitrageProduct || mongoose.model('ArbitrageProduct', arbitrageProductSchema);
