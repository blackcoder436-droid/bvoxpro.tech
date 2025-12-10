const mongoose = require('mongoose');

async function verify() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/bvoxpro');
        
        const User = require('./models/User');
        const Topup = require('./models/Topup');
        
        // Check the specific user and topup
        const user = await User.findOne({ userid: '1765298563993' });
        const topup = await Topup.findOne({ _id: '69389794f40d0c5392856a51' });
        
        console.log('\n=== DATABASE VERIFICATION ===\n');
        
        if (topup) {
            console.log('✅ Topup Found:');
            console.log('   ID:', topup._id);
            console.log('   User ID:', topup.user_id);
            console.log('   Coin:', topup.coin);
            console.log('   Amount:', topup.amount);
            console.log('   Status:', topup.status);
        } else {
            console.log('❌ Topup NOT found');
        }
        
        if (user) {
            console.log('\n✅ User Found:');
            console.log('   User ID:', user.userid);
            console.log('   Balances:', JSON.stringify(user.balances, null, 6));
            
            // Check if the topup amount is in the balance
            const coin = topup.coin.toLowerCase();
            const currentBalance = user.balances[coin];
            
            if (currentBalance >= topup.amount) {
                console.log('\n✅ SUCCESS! User balance includes topup amount!');
                console.log(`   ${coin}: ${currentBalance} (should be >= ${topup.amount})`);
            } else {
                console.log('\n❌ PROBLEM: User balance does NOT include topup amount');
                console.log(`   ${coin}: ${currentBalance} (expected >= ${topup.amount})`);
            }
        } else {
            console.log('❌ User NOT found');
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

verify();
