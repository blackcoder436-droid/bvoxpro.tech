const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvoxpro';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✓ Connected to MongoDB');
    migrateAdmins();
  })
  .catch(err => {
    console.error('✗ Connection failed:', err.message);
    process.exit(1);
  });

// Admin schema
const adminSchema = new mongoose.Schema({
  id: { type: String, index: true },
  fullname: { type: String },
  username: { type: String },
  email: { type: String },
  password: { type: String },
  telegram: { type: String },
  wallets: { type: Object, default: {} },
  status: { type: String, default: 'active' },
  lastLogin: { type: Date },
  created_at: { type: Date }
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function migrateAdmins() {
  try {
    const adminsFile = path.join(__dirname, '..', 'admins.json');
    if (!fs.existsSync(adminsFile)) {
      console.warn('⚠ admins.json not found');
      process.exit(0);
    }

    const adminsData = JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
    console.log(`📋 Found ${adminsData.length} admins to migrate`);

    let count = 0;
    for (const admin of adminsData) {
      await Admin.updateOne(
        { id: admin.id },
        { $set: admin },
        { upsert: true }
      );
      count++;
      console.log(`✓ Migrated admin: ${admin.id} (${admin.username})`);
    }

    console.log(`\n✅ Migration complete: ${count} admins imported`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}
