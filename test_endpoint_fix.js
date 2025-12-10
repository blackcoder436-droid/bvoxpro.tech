const mongoose = require('mongoose');

async function testEndpoint() {
    try {
        // Connect
        await mongoose.connect('mongodb://127.0.0.1:27017/bvoxpro');
        
        const User = require('./models/User');
        
        // Get user
        const user = await User.findOne({ userid: '1765298563993' });
        console.log('\n=== USER RECORD CHECK ===\n');
        console.log('User found:', user ? 'YES ✅' : 'NO ❌');
        console.log('User ID:', user?.userid);
        console.log('User balances:', JSON.stringify(user?.balances, null, 2));
        console.log('Has pyusd balance:', user?.balances?.pyusd > 0 ? 'YES ✅' : 'NO ❌');
        
        if (user?.balances?.pyusd > 0) {
            console.log('\n✅ SUCCESS! The getbalance endpoint should now return:');
            console.log('   PYUSD: ' + user.balances.pyusd);
        } else {
            console.log('\n❌ PROBLEM: User balances not updated');
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

testEndpoint();
