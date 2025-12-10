const axios = require('axios');

async function test() {
    try {
        // Get all topups
        const response = await axios.get('http://localhost:3000/api/admin/topup-records', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9'
            }
        });
        
        const records = response.data.records;
        console.log('Found', records.length, 'topup records');
        
        if (records.length > 0) {
            const topup = records[0];
            console.log('\nTest topup:', {
                id: topup._id,
                user_id: topup.user_id,
                coin: topup.coin,
                amount: topup.amount,
                status: topup.status
            });
            
            // Approve
            console.log('\nApproving...');
            const approveRes = await axios.put(
                'http://localhost:3000/api/admin/topup/approve-mongo',
                { id: topup._id },
                {
                    headers: {
                        'Authorization': 'Bearer eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9'
                    }
                }
            );
            
            console.log('\nApprove Response:');
            console.log('  Success:', approveRes.data.success);
            console.log('  Record status:', approveRes.data.record?.status);
            console.log('  Updated user:', approveRes.data.updatedUser ? 'YES' : 'NO');
            
            if (approveRes.data.updatedUser) {
                console.log('\n✅ USER BALANCE UPDATED!');
                console.log('  User ID:', approveRes.data.updatedUser.userid);
                console.log('  Balances:', JSON.stringify(approveRes.data.updatedUser.balances, null, 2));
            } else {
                console.log('\n❌ User was NOT updated!');
            }
        }
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

test();
