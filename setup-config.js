#!/usr/bin/env node

/**
 * BVOX Finance - Setup Configuration Script
 * Interactive setup for database connection and environment variables
 * 
 * Usage: node setup-db.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const envFile = path.join(__dirname, '.env');

const DEFAULT_CONFIG = {
    MONGODB_URI: 'mongodb://localhost:27017/bvoxpro',
    PORT: '5000',
    NODE_ENV: 'development',
    JWT_SECRET: 'your-secret-key-change-this',
    API_TIMEOUT: '30000'
};

async function main() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   BVOX Finance - Database Setup Wizard        ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Check if .env exists
    if (fs.existsSync(envFile)) {
        const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/n): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('\n✅ Setup cancelled. Using existing .env file.\n');
            rl.close();
            return;
        }
    }

    console.log('\n📋 Database Configuration\n');

    // MongoDB setup
    const dbChoice = await question(
        'Which MongoDB setup do you use?\n' +
        '1. Local MongoDB (default)\n' +
        '2. MongoDB Atlas (Cloud)\n' +
        'Choose (1 or 2): '
    );

    let mongodbUri;

    if (dbChoice === '2') {
        console.log('\n📍 MongoDB Atlas Configuration\n');
        const username = await question('MongoDB username: ');
        const password = await question('MongoDB password: ');
        const cluster = await question('Cluster (e.g., cluster0.abc123.mongodb.net): ');
        const database = await question('Database name (default: bvox_finance): ') || 'bvox_finance';
        
        mongodbUri = `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`;
    } else {
        console.log('\n📍 Local MongoDB Configuration\n');
        const host = await question('MongoDB host (default: localhost): ') || 'localhost';
        const port = await question('MongoDB port (default: 27017): ') || '27017';
        const database = await question('Database name (default: bvox_finance): ') || 'bvox_finance';
        
        mongodbUri = `mongodb://${host}:${port}/${database}`;
    }

    // Server configuration
    console.log('\n🖥️  Server Configuration\n');
    const port = await question('Server port (default: 3000): ') || '3000';
    const nodeEnv = await question('Environment (development/production, default: development): ') || 'development';

    // Security
    console.log('\n🔐 Security Configuration\n');
    const jwtSecret = await question('JWT Secret Key (leave empty to auto-generate): ');
    const finalJwtSecret = jwtSecret || generateSecretKey();

    // Create .env content
    const envContent = `# BVOX Finance Configuration
# Generated: ${new Date().toISOString()}

# MongoDB Connection
MONGODB_URI=${mongodbUri}

# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Security
JWT_SECRET=${finalJwtSecret}

# API Configuration
API_TIMEOUT=30000

# Enable/Disable Features
ENABLE_TRADES=true
ENABLE_MINING=true
ENABLE_ARBITRAGE=true
ENABLE_LOANS=true
ENABLE_KYC=true

# Email (Optional)
# MAIL_HOST=smtp.gmail.com
# MAIL_USER=your-email@gmail.com
# MAIL_PASS=your-password

# Telegram Bot (Optional)
# TELEGRAM_BOT_TOKEN=your-bot-token
# TELEGRAM_CHAT_ID=your-chat-id
`;

    // Save .env file
    fs.writeFileSync(envFile, envContent);
    console.log('\n✅ Configuration saved to .env\n');

    // Display summary
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          Configuration Summary               ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    console.log('MongoDB URI: ' + maskUri(mongodbUri));
    console.log('Server Port: ' + port);
    console.log('Environment: ' + nodeEnv);
    console.log('JWT Secret: ' + (finalJwtSecret === DEFAULT_CONFIG.JWT_SECRET ? 'DEFAULT - CHANGE IN PRODUCTION!' : 'Custom'));

    // Next steps
    console.log('\n📋 Next Steps:\n');
    console.log('1. Install dependencies:');
    console.log('   npm install\n');

    console.log('2. Migrate JSON data to database (first time only):');
    console.log('   node scripts/migrate-json-to-db.js\n');

    console.log('3. Start the server:');
    console.log('   node app-server.js\n');

    console.log('4. Test the integration:');
    console.log('   Open http://localhost:' + port + '/database-integration.html\n');

    console.log('📖 For more information, see DATABASE_SETUP.md\n');

    // Verify MongoDB connection
    console.log('🔍 Verifying MongoDB connection...\n');
    
    try {
        const { connectDB } = require('./config/db');
        process.env.MONGODB_URI = mongodbUri;
        
        connectDB().then(() => {
            console.log('✅ MongoDB connection successful!\n');
            rl.close();
        }).catch(err => {
            console.log('⚠️  MongoDB connection failed. Please verify your credentials.\n');
            console.log('Error: ' + err.message + '\n');
            rl.close();
        });
    } catch (e) {
        console.log('⚠️  Could not verify MongoDB connection.\n');
        rl.close();
    }
}

function maskUri(uri) {
    if (uri.includes('mongodb+srv://')) {
        const [scheme, rest] = uri.split('://');
        const [creds, host] = rest.split('@');
        const [user, pass] = creds.split(':');
        return `${scheme}://${user}:${'*'.repeat(pass.length)}@${host}`;
    }
    return uri;
}

function generateSecretKey() {
    return require('crypto').randomBytes(32).toString('hex');
}

main().catch(err => {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
});
