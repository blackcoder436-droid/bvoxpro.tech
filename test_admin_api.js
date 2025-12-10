const http = require('http');

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        const data = body ? JSON.stringify(body) : null;
        if (data) {
            defaultHeaders['Content-Length'] = Buffer.byteLength(data);
        }

        const opts = {
            method,
            hostname: '127.0.0.1',
            port: 3000,
            path,
            headers: defaultHeaders
        };

        const req = http.request(opts, (res) => {
            let respData = '';
            res.on('data', chunk => respData += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: respData ? JSON.parse(respData) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: respData
                    });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

(async () => {
    try {
        console.log('=== TEST 1: Admin Login ===');
        const loginResp = await makeRequest('POST', '/api/admin/login', {
            username: 'localadmin2',
            password: 'Password123!'
        });
        console.log('Login Status:', loginResp.status);
        console.log('Login Body:', JSON.stringify(loginResp.body, null, 2));

        if (loginResp.body && loginResp.body.token) {
            const token = loginResp.body.token;
            console.log('✓ Got token:', token.substring(0, 20) + '...');

            console.log('\n=== TEST 2: Get Admin Profile (with token) ===');
            const meResp = await makeRequest('GET', '/api/admin/me', null, {
                'Authorization': `Bearer ${token}`
            });
            console.log('Admin Me Status:', meResp.status);
            console.log('Admin Me Body:', JSON.stringify(meResp.body, null, 2));

            console.log('\n=== TEST 3: Admin List (with token) ===');
            const listResp = await makeRequest('GET', '/api/admin/list', null, {
                'Authorization': `Bearer ${token}`
            });
            console.log('Admin List Status:', listResp.status);
            console.log('Admin List Count:', listResp.body && listResp.body.admins ? listResp.body.admins.length : 'unknown');
        }

        console.log('\n=== TEST 4: Login with existing admin (admin / password) ===');
        const adminLoginResp = await makeRequest('POST', '/api/admin/login', {
            username: 'admin',
            password: 'password'
        });
        console.log('Admin Login Status:', adminLoginResp.status);
        console.log('Admin Login Body:', JSON.stringify(adminLoginResp.body, null, 2));

    } catch (err) {
        console.error('Test error:', err);
    }
    process.exit(0);
})();
