const http = require('http');

function post(path, body) {
  return new Promise((resolve) => {
    const json = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': json.length }
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(json);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

(async () => {
  console.log('\n=== ADMIN API E2E TEST ===\n');
  
  // Register
  console.log('1. POST /api/admin/register');
  const reg = await post('/api/admin/register', {
    fullname: 'E2E Test',
    username: 'e2etest' + Date.now(),
    email: 'e2e' + Date.now() + '@test.com',
    password: 'Test123'
  });
  console.log(`   Status: ${reg.status}`);
  console.log(`   Success: ${reg.body.success}`);
  
  if (reg.status === 201) {
    // Login
    const loginUser = reg.body.admin ? reg.body.admin.username : 'e2etest' + Date.now();
    console.log(`\n2. POST /api/admin/login (${loginUser})`);
    const login = await post('/api/admin/login', {
      username: loginUser,
      password: 'Test123'
    });
    console.log(`   Status: ${login.status}`);
    console.log(`   Got token: ${!!login.body.token}`);
    
    if (login.body.token) {
      const token = login.body.token;
      
      // Get me
      console.log(`\n3. GET /api/admin/me`);
      const me = await get('/api/admin/me', token);
      console.log(`   Status: ${me.status}`);
      console.log(`   Admin: ${me.body.admin ? me.body.admin.username : 'N/A'}`);
      
      // List
      console.log(`\n4. GET /api/admin/list`);
      const list = await get('/api/admin/list', token);
      console.log(`   Status: ${list.status}`);
      console.log(`   Count: ${list.body.admins ? list.body.admins.length : 0}`);
    }
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
  process.exit(0);
})();
