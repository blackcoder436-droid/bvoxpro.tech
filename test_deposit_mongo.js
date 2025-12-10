#!/usr/bin/env node
/**
 * Test script for deposit.html MongoDB integration
 */

const http = require('http');

// Test getting all topup records
function testGetTopupRecords(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/topup-records',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                console.log('\n=== GET /api/admin/topup-records ===');
                console.log('Status:', res.statusCode);
                try {
                    const response = JSON.parse(data);
                    console.log('Success:', response.success);
                    console.log('Records count:', response.records?.length || 0);
                    if (response.records?.length > 0) {
                        console.log('First record:', JSON.stringify(response.records[0], null, 2));
                    }
                } catch(e) {
                    console.log('Response:', data);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e);
            reject(e);
        });
        req.end();
    });
}

// First, get admin token
function loginAdmin() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                console.log('\n=== Admin Login ===');
                console.log('Status:', res.statusCode);
                try {
                    const response = JSON.parse(data);
                    console.log('Success:', response.success);
                    if (response.token) {
                        console.log('Token received:', response.token.substring(0, 20) + '...');
                        resolve(response.token);
                    } else {
                        console.log('No token in response');
                        resolve(null);
                    }
                } catch(e) {
                    console.log('Response:', data);
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.error('Login error:', e);
            reject(e);
        });

        req.write(loginData);
        req.end();
    });
}

// Main test
async function runTests() {
    try {
        const token = await loginAdmin();
        if (token) {
            await testGetTopupRecords(token);
        } else {
            console.log('Failed to get token, cannot test topup records');
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
    
    process.exit(0);
}

// Wait a moment for server to be ready
setTimeout(runTests, 1000);
