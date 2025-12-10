const http = require('http');

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        });
        
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function test() {
    try {
        // Test 1: Login
        console.log('Testing admin login...');
        const loginBody = JSON.stringify({ username: 'admin', password: 'Admin@123' });
        const loginRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginBody)
            }
        }, loginBody);
        
        console.log('Login response status:', loginRes.status);
        const loginData = JSON.parse(loginRes.data);
        console.log('Login response:', loginRes.data);
        console.log('Login data:', loginData);
        
        if (!loginData.token) {
            console.error('No token received');
            return;
        }
        
        const token = loginData.token;
        console.log('\n✓ Got token:', token.substring(0, 30) + '...');
        
        // Test 2: Get all topup records
        console.log('\nTesting /api/admin/topup-records...');
        const recordsRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/topup-records',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        console.log('Records response status:', recordsRes.status);
        const recordsData = JSON.parse(recordsRes.data);
        console.log('Records data:', JSON.stringify(recordsData, null, 2));
        
        if (recordsData.success) {
            console.log(`\n✓ SUCCESS! Found ${recordsData.records.length} topup records`);
        } else {
            console.error('Error:', recordsData.error);
        }
    } catch (e) {
        console.error('Test error:', e);
        console.error('Error stack:', e.stack);
    }
}

setTimeout(test, 1000);
