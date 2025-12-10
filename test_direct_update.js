// Direct test of MongoDB update using models
const mongoose = require('mongoose');

async function test() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://127.0.0.1:27017/bvoxpro');
        console.log('Connected to MongoDB\n');
        
        const User = require('./models/User');
        const Topup = require('./models/Topup');
        
        // Find a topup record
        const topup = await Topup.findOne().sort({ _id: -1 });
        if (!topup) {
            console.log('No topup records found');
            process.exit(0);
        }
        
        console.log('Found topup:');
        console.log('  ID:', topup._id);
        console.log('  User ID:', topup.user_id);
        console.log('  Coin:', topup.coin);
        console.log('  Amount:', topup.amount);
        console.log('  Status:', topup.status);
        
        // Check if user exists
        const user = await User.findOne({ userid: topup.user_id });
        console.log('\nUser found:');
        console.log('  userid:', user?.userid);
        console.log('  Balance before:', user?.balances);
        
        if (!user) {
            console.log('  ❌ User with userid', topup.user_id, 'not found!');
            process.exit(0);
        }
        
        // Test the update query
        const coinKey = `balances.${topup.coin.toLowerCase()}`;
        console.log('\nTesting update with query:');
        console.log('  Search:', { userid: topup.user_id });
        console.log('  Update:', { $inc: { [coinKey]: topup.amount } });
        
        const updated = await User.findOneAndUpdate(
            { userid: topup.user_id },
            { $inc: { [coinKey]: topup.amount } },
            { new: true }
        );
        
        console.log('\nAfter update:');
        console.log('  Updated:', updated ? 'YES ✅' : 'NO ❌');
        if (updated) {
            console.log('  User ID:', updated.userid);
            console.log('  Balances:', updated.balances);
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

test();
