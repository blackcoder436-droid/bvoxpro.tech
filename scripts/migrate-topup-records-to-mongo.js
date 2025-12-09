const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvoxpro';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✓ Connected to MongoDB');
    migrateTopupRecords();
  })
  .catch(err => {
    console.error('✗ Connection failed:', err.message);
    process.exit(1);
  });

// TopupRecord schema
const topupRecordSchema = new mongoose.Schema({
  id: { type: String, index: true },
  user_id: { type: String },
  coin: { type: String },
  address: { type: String },
  amount: { type: Number },
  photo_url: { type: String },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

const TopupRecord = mongoose.models.TopupRecord || mongoose.model('TopupRecord', topupRecordSchema);

async function migrateTopupRecords() {
  try {
    const topupFile = path.join(__dirname, '..', 'topup_records.json');
    if (!fs.existsSync(topupFile)) {
      console.warn('⚠ topup_records.json not found');
      process.exit(0);
    }

    const topupData = JSON.parse(fs.readFileSync(topupFile, 'utf8'));
    console.log(`📋 Found ${topupData.length} topup records to migrate`);

    let count = 0;
    for (const record of topupData) {
      await TopupRecord.updateOne(
        { id: record.id },
        { $set: record },
        { upsert: true }
      );
      count++;
      console.log(`✓ Migrated topup: ${record.id} (user: ${record.user_id}, coin: ${record.coin})`);
    }

    console.log(`\n✅ Migration complete: ${count} topup records imported`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}
