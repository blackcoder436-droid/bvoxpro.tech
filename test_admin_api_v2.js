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
        console.log('=== TEST 1: Test with existing admin (admin / admin_password_test) ===');
        const loginResp = await makeRequest('POST', '/api/admin/login', {
            username: 'admin',
            password: 'admin_password_test'
        });
        console.log('Login Status:', loginResp.status);
        console.log('Body:', JSON.stringify(loginResp.body, null, 2));

        if (loginResp.body && loginResp.body.success && loginResp.body.token) {
            const token = loginResp.body.token;
            console.log('\n✓ Successfully logged in! Token:', token.substring(0, 30) + '...');

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
            if (listResp.body && listResp.body.admins) {
                console.log('Admins:', listResp.body.admins.map(a => ({ id: a.id, username: a.username })));
            }
        }

    } catch (err) {
        console.error('Test error:', err.message);
    }
    process.exit(0);
})();
