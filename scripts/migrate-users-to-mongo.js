const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvoxpro';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✓ Connected to MongoDB');
    migrateUsers();
  })
  .catch(err => {
    console.error('✗ Connection failed:', err.message);
    process.exit(1);
  });

// User schema
const userSchema = new mongoose.Schema({
  id: { type: String, index: true },
  username: { type: String },
  email: { type: String },
  password: { type: String },
  balance: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  meta: { type: Object, default: {} }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function migrateUsers() {
  try {
    const usersFile = path.join(__dirname, '..', 'users.json');
    if (!fs.existsSync(usersFile)) {
      console.warn('⚠ users.json not found');
      process.exit(0);
    }

    const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    console.log(`📋 Found ${usersData.length} users to migrate`);

    let count = 0;
    for (const user of usersData) {
      await User.updateOne(
        { id: user.id },
        { $set: user },
        { upsert: true }
      );
      count++;
      console.log(`✓ Migrated user: ${user.id} (${user.username || 'unknown'})`);
    }

    console.log(`\n✅ Migration complete: ${count} users imported`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}
