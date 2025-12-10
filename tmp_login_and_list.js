const http = require('http');
function post(path, data, cb){
  const d = JSON.stringify(data);
  const opts = { hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } };
  const req = http.request(opts, res => { let b=''; res.on('data', c=>b+=c); res.on('end', ()=> cb(null, res.statusCode, b)); });
  req.on('error', e=>cb(e)); req.write(d); req.end();
}
function get(path, token, cb){
  const opts = { hostname: 'localhost', port: 3000, path, method: 'GET', headers: { 'Authorization': token ? ('Bearer '+token) : '' } };
  const req = http.request(opts, res => { let b=''; res.on('data', c=>b+=c); res.on('end', ()=> cb(null, res.statusCode, b)); });
  req.on('error', e=>cb(e)); req.end();
}

// Use existing admin to login
post('/api/admin/login', { username: 'Blackcoder', password: 'P@ssw0rd1' }, (err, status, body)=>{
  if (err) return console.error('login err', err);
  console.log('LOGIN', status, body);
  try{ const j = JSON.parse(body); if (j.token){
    get('/api/admin/list', j.token, (e,s,b)=>{ if (e) return console.error(e); console.log('LIST', s, b); });
  }}catch(e){console.error('parse login', e);} 
});
