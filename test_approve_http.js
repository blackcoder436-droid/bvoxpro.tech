const https = require('https');

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

const http = require('http');

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

const token = 'eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9';

async function test() {
    try {
        console.log('Fetching topup records...');
        const records = await makeRequest('GET', '/api/admin/topup-records', null, token);
        
        console.log('Found', records.records.length, 'records\n');
        
        const topup = records.records[0];
        console.log('Test topup:');
        console.log('  ID:', topup._id);
        console.log('  User ID:', topup.user_id);
        console.log('  Coin:', topup.coin);
        console.log('  Amount:', topup.amount);
        console.log('  Status:', topup.status);
        
        console.log('\nApproving topup...');
        const result = await makeRequest('PUT', '/api/admin/topup/approve-mongo', { id: topup._id }, token);
        
        console.log('\nApprove Response:');
        console.log('  Success:', result.success);
        console.log('  New Status:', result.record?.status);
        console.log('  Updated User:', result.updatedUser ? 'YES ✅' : 'NO ❌');
        
        if (result.updatedUser) {
            console.log('\n✅ SUCCESS! User balance was updated:');
            console.log('  User ID:', result.updatedUser.userid);
            console.log('  Balances:', JSON.stringify(result.updatedUser.balances, null, 4));
        } else {
            console.log('\n❌ ERROR: User was not updated (updatedUser is null)');
        }
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
