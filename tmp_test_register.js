const http = require('http');
const data = JSON.stringify({ fullname: 'Test User Tmp', username: 'testuser_tmp99', email: 'tmp99@example.com', password: 'Pass1234' });
const opts = { hostname: 'localhost', port: 3000, path: '/api/admin/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
const req = http.request(opts, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(b);
  });
});
req.on('error', e => console.error('REQ ERR', e));
req.write(data);
req.end();
