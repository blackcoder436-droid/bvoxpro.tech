const http = require('http');

const token = 'eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9';

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;
        const opts = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        };
        
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Parse error:', e.message);
                    console.error('Raw data:', data);
                    resolve({ error: data, parseError: e.message });
                }
            });
        });
        
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function test() {
    try {
        console.log('Getting topups...\n');
        const topups = await request('GET', '/api/admin/topup-records');
        
        if (topups.error || !topups.records) {
            console.log('Error getting topups:', topups);
            return;
        }
        
        const topup = topups.records[0];
        console.log('Found topup:', topup._id);
        console.log('User ID:', topup.user_id);
        console.log('Amount:', topup.amount);
        console.log('Coin:', topup.coin);
        console.log('Status:', topup.status);
        
        console.log('\nApproving...\n');
        const result = await request('PUT', '/api/admin/topup/approve-mongo', { id: topup._id });
        
        console.log('Response:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.updatedUser) {
            console.log('\n✅ SUCCESS!');
            console.log('User balances after approval:');
            console.log(JSON.stringify(result.updatedUser.balances, null, 2));
        } else {
            console.log('\n❌ User was not updated');
        }
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
