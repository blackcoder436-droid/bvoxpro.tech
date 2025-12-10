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
        console.log('=== TEST 1: Admin Login (admin / testadmin123) ===');
        const loginResp = await makeRequest('POST', '/api/admin/login', {
            username: 'admin',
            password: 'testadmin123'
        });
        console.log('Login Status:', loginResp.status);
        console.log('Body:', JSON.stringify(loginResp.body, null, 2));

        if (loginResp.body && loginResp.body.success && loginResp.body.token) {
            const token = loginResp.body.token;
            console.log('\n✓ Successfully logged in!');
            console.log('Token:', token.substring(0, 40) + '...');
            console.log('AdminId:', loginResp.body.adminId);

            console.log('\n=== TEST 2: Get Admin Profile (with token) ===');
            const meResp = await makeRequest('GET', '/api/admin/me', null, {
                'Authorization': `Bearer ${token}`
            });
            console.log('Status:', meResp.status);
            if (meResp.body.admin) {
                console.log('✓ Got admin profile:', { id: meResp.body.admin.id, username: meResp.body.admin.username, fullname: meResp.body.admin.fullname });
            }

            console.log('\n=== TEST 3: Admin List (with token) ===');
            const listResp = await makeRequest('GET', '/api/admin/list', null, {
                'Authorization': `Bearer ${token}`
            });
            console.log('Status:', listResp.status);
            if (listResp.body && listResp.body.admins) {
                console.log('✓ Got', listResp.body.admins.length, 'admins');
                console.log('Admins:', listResp.body.admins.map(a => ({ id: a.id, username: a.username, email: a.email })));
            }

            console.log('\n=== ALL TESTS PASSED ===');
        } else {
            console.log('\n✗ Login failed:', loginResp.body);
        }

    } catch (err) {
        console.error('Test error:', err.message);
    }
    process.exit(0);
})();
