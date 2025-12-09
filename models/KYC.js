const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String, required: true, index: true },
  full_name: { type: String },
  date_of_birth: { type: Date },
  nationality: { type: String },
  document_type: { type: String }, // passport, license, etc.
  document_number: { type: String },
  document_image_url: { type: String },
  selfie_url: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
  verification_date: { type: Date },
  rejection_reason: { type: String },
  timestamp: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.KYC || mongoose.model('KYC', kycSchema);
