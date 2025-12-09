/**
 * Direct MongoDB Test - Check Database Contents
 */

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testDatabase() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        console.log('URI:', process.env.MONGODB_URI.split('@')[0] + '@[REDACTED]');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });
        
        console.log('✅ Connected to MongoDB!');
        
        // Test 1: Count users
        const userCount = await User.countDocuments();
        console.log(`\n📊 Total users in database: ${userCount}`);
        
        // Test 2: List first 5 users
        console.log('\n📋 First 5 users:');
        const users = await User.find().limit(5);
        users.forEach((user, i) => {
            console.log(`\n  User ${i + 1}:`);
            console.log(`    - _id: ${user._id}`);
            console.log(`    - userid: ${user.userid}`);
            console.log(`    - uid: ${user.uid}`);
            console.log(`    - id: ${user.id}`);
            console.log(`    - username: ${user.username}`);
            console.log(`    - email: ${user.email}`);
            console.log(`    - balance: ${user.balance}`);
        });
        
        // Test 3: Search for user 342016
        console.log('\n\n🔍 Searching for user 342016...');
        const foundUser = await User.findOne({
            $or: [
                { userid: 342016 },
                { userid: '342016' },
                { uid: 342016 },
                { uid: '342016' },
                { id: 342016 },
                { id: '342016' }
            ]
        });
        
        if (foundUser) {
            console.log('✅ Found user:');
            console.log(JSON.stringify(foundUser, null, 2));
        } else {
            console.log('❌ User 342016 not found!');
            
            // List all userid values
            console.log('\n📋 All userid values in database:');
            const allUsers = await User.find({}, { userid: 1, uid: 1, id: 1, username: 1 });
            allUsers.forEach(u => {
                console.log(`  userid: ${u.userid} | uid: ${u.uid} | id: ${u.id} | username: ${u.username}`);
            });
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Test completed successfully!');
        
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

testDatabase();
