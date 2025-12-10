const http = require('http');

// First, get all topups to find one to test
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/topup-records',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('Topup records:', response.records?.length);
            
            if (response.records && response.records.length > 0) {
                const topup = response.records[0];
                console.log('\nTesting topup:', {
                    id: topup._id,
                    user_id: topup.user_id,
                    coin: topup.coin,
                    amount: topup.amount,
                    current_status: topup.status
                });
                
                // Now test approve
                testApprove(topup._id);
            }
        } catch (e) {
            console.error('Error parsing response:', e.message);
        }
    });
});

req.on('error', (e) => console.error('Error:', e));
req.end();

function testApprove(topupId) {
    console.log(`\nApproving topup ${topupId}...`);
    
    const approveOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/topup/approve-mongo',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9'
        }
    };
    
    const appReq = http.request(approveOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('\nApprove response:', {
                    success: response.success,
                    record_status: response.record?.status,
                    updated_user: response.updatedUser ? 'YES' : 'NO'
                });
                
                if (response.updatedUser) {
                    console.log('\nUser balance updated:');
                    console.log('  userid:', response.updatedUser.userid);
                    console.log('  balances:', response.updatedUser.balances);
                } else {
                    console.log('\n⚠️  User NOT updated! updatedUser is null');
                }
            } catch (e) {
                console.error('Error parsing approve response:', e.message, data);
            }
        });
    });
    
    appReq.on('error', (e) => console.error('Error:', e));
    appReq.write(JSON.stringify({ id: topupId }));
    appReq.end();
}
