/**
 * Migration Script: Import JSON data to MongoDB
 * This script reads all JSON files and inserts them into MongoDB collections
 * Usage: node scripts/migrate-json-to-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Models
const User = require('../models/User');
const Admin = require('../models/Admin');
const Topup = require('../models/Topup');
const Withdrawal = require('../models/Withdrawal');
const ExchangeRecord = require('../models/ExchangeRecord');
const Trade = require('../models/Trade');
const Mining = require('../models/Mining');
const Loan = require('../models/Loan');
const Wallet = require('../models/Wallet');
const KYC = require('../models/KYC');
const ArbitrageProduct = require('../models/ArbitrageProduct');
const ArbitrageSubscription = require('../models/ArbitrageSubscription');
const Notification = require('../models/Notification');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bvoxpro';

async function readJsonFile(filename) {
    try {
        const filePath = path.join(__dirname, '..', `${filename}.json`);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  File not found: ${filename}.json`);
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data) || [];
    } catch (e) {
        console.error(`❌ Error reading ${filename}.json:`, e.message);
        return [];
    }
}

async function migrateUsers() {
    console.log('🔄 Migrating users...');
    const users = await readJsonFile('users');
    
    if (users.length === 0) {
        console.log('⏭️  No users to migrate');
        return;
    }

    try {
        const existingCount = await User.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} users already exist. Skipping...`);
            return;
        }

        await User.insertMany(users, { ordered: false });
        console.log(`✅ Migrated ${users.length} users`);
    } catch (e) {
        console.error('❌ Error migrating users:', e.message);
    }
}

async function migrateAdmins() {
    console.log('🔄 Migrating admins...');
    const admins = await readJsonFile('admins');
    
    if (admins.length === 0) {
        console.log('⏭️  No admins to migrate');
        return;
    }

    try {
        const existingCount = await Admin.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} admins already exist. Skipping...`);
            return;
        }

        await Admin.insertMany(admins, { ordered: false });
        console.log(`✅ Migrated ${admins.length} admins`);
    } catch (e) {
        console.error('❌ Error migrating admins:', e.message);
    }
}

async function migrateTopups() {
    console.log('🔄 Migrating topup records...');
    const topups = await readJsonFile('topup_records');
    
    if (topups.length === 0) {
        console.log('⏭️  No topup records to migrate');
        return;
    }

    try {
        const existingCount = await Topup.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} topup records already exist. Skipping...`);
            return;
        }

        await Topup.insertMany(topups, { ordered: false });
        console.log(`✅ Migrated ${topups.length} topup records`);
    } catch (e) {
        console.error('❌ Error migrating topup records:', e.message);
    }
}

async function migrateWithdrawals() {
    console.log('🔄 Migrating withdrawal records...');
    const withdrawals = await readJsonFile('withdrawals_records');
    
    if (withdrawals.length === 0) {
        console.log('⏭️  No withdrawal records to migrate');
        return;
    }

    try {
        const existingCount = await Withdrawal.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} withdrawal records already exist. Skipping...`);
            return;
        }

        await Withdrawal.insertMany(withdrawals, { ordered: false });
        console.log(`✅ Migrated ${withdrawals.length} withdrawal records`);
    } catch (e) {
        console.error('❌ Error migrating withdrawal records:', e.message);
    }
}

async function migrateExchangeRecords() {
    console.log('🔄 Migrating exchange records...');
    const records = await readJsonFile('exchange_records');
    
    if (records.length === 0) {
        console.log('⏭️  No exchange records to migrate');
        return;
    }

    try {
        const existingCount = await ExchangeRecord.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} exchange records already exist. Skipping...`);
            return;
        }

        await ExchangeRecord.insertMany(records, { ordered: false });
        console.log(`✅ Migrated ${records.length} exchange records`);
    } catch (e) {
        console.error('❌ Error migrating exchange records:', e.message);
    }
}

async function migrateTradeRecords() {
    console.log('🔄 Migrating trade records...');
    const trades = await readJsonFile('trades_records');
    
    if (trades.length === 0) {
        console.log('⏭️  No trade records to migrate');
        return;
    }

    try {
        const existingCount = await Trade.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} trade records already exist. Skipping...`);
            return;
        }

        await Trade.insertMany(trades, { ordered: false });
        console.log(`✅ Migrated ${trades.length} trade records`);
    } catch (e) {
        console.error('❌ Error migrating trade records:', e.message);
    }
}

async function migrateMiningRecords() {
    console.log('🔄 Migrating mining records...');
    const mining = await readJsonFile('mining_records');
    
    if (mining.length === 0) {
        console.log('⏭️  No mining records to migrate');
        return;
    }

    try {
        const existingCount = await Mining.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} mining records already exist. Skipping...`);
            return;
        }

        await Mining.insertMany(mining, { ordered: false });
        console.log(`✅ Migrated ${mining.length} mining records`);
    } catch (e) {
        console.error('❌ Error migrating mining records:', e.message);
    }
}

async function migrateLoans() {
    console.log('🔄 Migrating loan records...');
    const loans = await readJsonFile('loans_records');
    
    if (loans.length === 0) {
        console.log('⏭️  No loan records to migrate');
        return;
    }

    try {
        const existingCount = await Loan.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} loan records already exist. Skipping...`);
            return;
        }

        await Loan.insertMany(loans, { ordered: false });
        console.log(`✅ Migrated ${loans.length} loan records`);
    } catch (e) {
        console.error('❌ Error migrating loan records:', e.message);
    }
}

async function migrateWallets() {
    console.log('🔄 Migrating wallet records...');
    const wallets = await readJsonFile('wallets');
    
    if (wallets.length === 0) {
        console.log('⏭️  No wallet records to migrate');
        return;
    }

    try {
        const existingCount = await Wallet.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} wallet records already exist. Skipping...`);
            return;
        }

        await Wallet.insertMany(wallets, { ordered: false });
        console.log(`✅ Migrated ${wallets.length} wallet records`);
    } catch (e) {
        console.error('❌ Error migrating wallet records:', e.message);
    }
}

async function migrateKYCRecords() {
    console.log('🔄 Migrating KYC records...');
    const kyc = await readJsonFile('kyc_records');
    
    if (kyc.length === 0) {
        console.log('⏭️  No KYC records to migrate');
        return;
    }

    try {
        const existingCount = await KYC.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} KYC records already exist. Skipping...`);
            return;
        }

        await KYC.insertMany(kyc, { ordered: false });
        console.log(`✅ Migrated ${kyc.length} KYC records`);
    } catch (e) {
        console.error('❌ Error migrating KYC records:', e.message);
    }
}

async function migrateArbitrageProducts() {
    console.log('🔄 Migrating arbitrage products...');
    const products = await readJsonFile('arbitrage_products');
    
    if (products.length === 0) {
        console.log('⏭️  No arbitrage products to migrate');
        return;
    }

    try {
        const existingCount = await ArbitrageProduct.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} arbitrage products already exist. Skipping...`);
            return;
        }

        await ArbitrageProduct.insertMany(products, { ordered: false });
        console.log(`✅ Migrated ${products.length} arbitrage products`);
    } catch (e) {
        console.error('❌ Error migrating arbitrage products:', e.message);
    }
}

async function migrateArbitrageSubscriptions() {
    console.log('🔄 Migrating arbitrage subscriptions...');
    const subscriptions = await readJsonFile('arbitrage_subscriptions');
    
    if (subscriptions.length === 0) {
        console.log('⏭️  No arbitrage subscriptions to migrate');
        return;
    }

    try {
        const existingCount = await ArbitrageSubscription.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} arbitrage subscriptions already exist. Skipping...`);
            return;
        }

        await ArbitrageSubscription.insertMany(subscriptions, { ordered: false });
        console.log(`✅ Migrated ${subscriptions.length} arbitrage subscriptions`);
    } catch (e) {
        console.error('❌ Error migrating arbitrage subscriptions:', e.message);
    }
}

async function migrateNotifications() {
    console.log('🔄 Migrating notifications...');
    const notifications = await readJsonFile('notifications');
    
    if (notifications.length === 0) {
        console.log('⏭️  No notifications to migrate');
        return;
    }

    try {
        const existingCount = await Notification.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} notifications already exist. Skipping...`);
            return;
        }

        await Notification.insertMany(notifications, { ordered: false });
        console.log(`✅ Migrated ${notifications.length} notifications`);
    } catch (e) {
        console.error('❌ Error migrating notifications:', e.message);
    }
}

async function main() {
    try {
        console.log('📦 Connecting to MongoDB...');
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        console.log('\n📥 Starting migration process...\n');

        await migrateUsers();
        await migrateAdmins();
        await migrateTopups();
        await migrateWithdrawals();
        await migrateExchangeRecords();
        await migrateTradeRecords();
        await migrateMiningRecords();
        await migrateLoans();
        await migrateWallets();
        await migrateKYCRecords();
        await migrateArbitrageProducts();
        await migrateArbitrageSubscriptions();
        await migrateNotifications();

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    }
}

main();
