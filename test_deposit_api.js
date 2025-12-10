const http = require('http');

// Test admin login and then fetch topup records
function testDepositAPI() {
    // First, login
    console.log('1. Testing admin login...');
    
    const loginData = JSON.stringify({
        username: 'admin',
        password: 'Admin@123'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    const loginReq = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('Login response:', response);
                
                if (response.token) {
                    const token = response.token;
                    console.log('\n2. Testing /api/admin/topup-records endpoint...');
                    
                    // Now fetch topup records with the token
                    const recordsOptions = {
                        hostname: 'localhost',
                        port: 3000,
                        path: '/api/admin/topup-records',
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    };

                    const recordsReq = http.request(recordsOptions, (res2) => {
                        let data2 = '';
                        res2.on('data', chunk => { data2 += chunk; });
                        res2.on('end', () => {
                            try {
                                const response2 = JSON.parse(data2);
                                console.log('Topup records response:');
                                console.log('Success:', response2.success);
                                console.log('Total records:', response2.records?.length || 0);
                                if (response2.records) {
                                    response2.records.forEach((r, idx) => {
                                        console.log(`\n  Record ${idx + 1}:`);
                                        console.log(`    ID: ${r._id}`);
                                        console.log(`    User: ${r.user_id}`);
                                        console.log(`    Coin: ${r.coin}`);
                                        console.log(`    Amount: ${r.amount}`);
                                        console.log(`    Status: ${r.status}`);
                                        console.log(`    Created: ${r.created_at}`);
                                    });
                                }
                            } catch (e) {
                                console.error('Error parsing topup records response:', e.message);
                                console.log('Raw response:', data2);
                            }
                        });
                    });

                    recordsReq.on('error', (e) => {
                        console.error('Error fetching topup records:', e.message);
                    });

                    recordsReq.end();
                } else {
                    console.error('No token received from login');
                }
            } catch (e) {
                console.error('Error parsing login response:', e.message);
                console.log('Raw response:', data);
            }
        });
    });

    loginReq.on('error', (e) => {
        console.error('Error during login:', e.message);
    });

    loginReq.write(loginData);
    loginReq.end();
}

// Wait a moment for server to be ready, then test
setTimeout(() => {
    testDepositAPI();
}, 1000);
