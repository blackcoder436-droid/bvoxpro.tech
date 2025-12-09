/**
 * Simple API Test
 */

const http = require('http');

function testAPI(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function runTests() {
    console.log('Testing API endpoints...\n');

    const tests = [
        '/api/health',
        '/api/users/342016',
        '/api/users',
    ];

    for (const path of tests) {
        try {
            console.log(`Testing: ${path}`);
            const result = await testAPI(path);
            console.log(`  Status: ${result.status}`);
            console.log(`  Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
            console.log();
        } catch (e) {
            console.error(`  ❌ Error: ${e.message}`);
            console.log();
        }
    }
}

// Wait for server to be ready
setTimeout(runTests, 2000);
