const mongoose = require('mongoose');

async function test() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/bvoxpro');
        
        const User = require('./models/User');
        
        // Get all users and find the max user ID
        const allUsers = await User.find({}, { userid: 1 }).sort({ _id: -1 }).limit(10);
        
        console.log('\n=== USER ID VERIFICATION ===\n');
        console.log('Last 10 users (sorted by _id DESC):');
        allUsers.forEach((u, i) => {
            const id = parseInt(u.userid || '0', 10);
            console.log(`${i+1}. userid: ${u.userid} (numeric: ${id})`);
        });
        
        if (allUsers.length > 0) {
            const maxId = parseInt(allUsers[0].userid || '342019', 10);
            const nextId = maxId + 1;
            console.log(`\n✅ Next user ID to be generated: ${nextId}`);
            
            if (nextId > 342019) {
                console.log('✅ User ID format is 6-digit starting from 342020 onwards');
            }
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

test();
