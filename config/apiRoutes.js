/**
 * API Routes for Database Operations
 * Handles all HTTP endpoints for database access
 */

const express = require('express');
const router = express.Router();
const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');
const ethers = require('ethers');

// Use authModel for admin auth (supports DB-first, JSON fallback)
const auth = require('../authModel');

async function verifyAdminToken(req) {
    const header = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (!header) return null;
    const parts = header.split(' ');
    if (parts.length !== 2) return null;
    const token = parts[1];
    // verify token signature and expiry via authModel
    const payload = auth.verifyToken(token);
    if (!payload || !payload.adminId) return null;
    // fetch admin using authModel (which will fallback to JSON file if needed)
    const admin = await auth.getAdminById(payload.adminId);
    return admin;
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
try { if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { console.warn('Could not create uploads dir:', e.message); }

// ============= PROXY ROUTES =============

// Proxy for /api/Trade/gettradlist to remote API (note: remote URL has 'e' in gettradelist)
const REMOTE_TRADE_LIST_URL = 'https://api.bvoxf.com/api/Trade/gettradelist';
router.post(['/api/Trade/gettradlist', '/api/trade/gettradlist'], (req, res) => {
    try {
        // Convert body to URL-encoded form (matching what old server.js does)
        let bodyStr = '';
        const body = req.body || {};
        if (typeof body === 'string') {
            bodyStr = body;
        } else if (typeof body === 'object') {
            // Convert JSON body to URL-encoded format: key1=value1&key2=value2
            bodyStr = Object.keys(body)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(body[key])}`)
                .join('&');
        }
        
        const urlObj = new URL(REMOTE_TRADE_LIST_URL);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };
        const proxyReq = https.request(options, proxyRes => {
            let data = '';
            proxyRes.on('data', chunk => { data += chunk; });
            proxyRes.on('end', () => {
                res.status(proxyRes.statusCode).set(proxyRes.headers).send(data);
            });
        });
        proxyReq.on('error', err => {
            console.error('[proxy] /api/Trade/gettradlist error:', err.message);
            res.status(502).json({ error: 'Proxy error', detail: err.message });
        });
        proxyReq.write(bodyStr);
        proxyReq.end();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= USER ENDPOINTS =============

router.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await db.getUserById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/users', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const skip = parseInt(req.query.skip) || 0;
        const users = await db.getAllUsers(limit, skip);
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/users/:userId/balance', async (req, res) => {
    try {
        const { balance } = req.body;
        const updated = await db.updateUserBalance(req.params.userId, balance);
        if (!updated) return res.status(404).json({ error: 'User not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/users/:userId/balances', async (req, res) => {
    try {
        const { balances } = req.body;
        const updated = await db.updateUserBalances(req.params.userId, balances);
        if (!updated) return res.status(404).json({ error: 'User not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= ADMIN AUTH & MANAGEMENT =============

// POST /api/admin/login
router.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ success: false, error: 'Missing username/password' });
        // Use authModel which supports DB-first and JSON fallback and password hashing
        try {
            const result = await auth.loginAdmin(username, password);
            // result includes token and adminId
            return res.json({ success: true, token: result.token, adminId: result.adminId });
        } catch (authErr) {
            return res.status(401).json({ success: false, error: authErr.message || 'Invalid credentials' });
        }
    } catch (e) {
        console.error('[admin/login] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/admin/register
router.post('/api/admin/register', async (req, res) => {
    try {
        const { username, password, fullname, email } = req.body || {};
        if (!username || !password) return res.status(400).json({ success: false, error: 'Missing required fields' });
        try {
            const created = await auth.registerAdmin(fullname || '', username, email || '', password);
            return res.json({ success: true, admin: created });
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }
    } catch (e) {
        console.error('[admin/register] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/admin/me
router.get('/api/admin/me', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        return res.json({ success: true, admin: admin });
    } catch (e) {
        console.error('[admin/me] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/admin/list
router.get('/api/admin/list', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const admins = await auth.getAllAdmins();
        return res.json({ success: true, admins });
    } catch (e) {
        console.error('[admin/list] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/admin/update-profile
router.post('/api/admin/update-profile', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const { fullname, email, telegram, wallets } = req.body || {};
        const updates = {};
        if (fullname) updates.fullname = fullname;
        if (email) updates.email = email;
        if (telegram) updates.telegram = telegram;
        if (wallets && typeof wallets === 'object') updates.wallets = wallets;
        const updated = await auth.updateAdminProfile(admin.id || admin._id || admin.id, updates);
        return res.json({ success: true, admin: updated });
    } catch (e) {
        console.error('[admin/update-profile] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/admin/users - returns users list for admin pages
router.get('/api/admin/users', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const limit = parseInt(req.query.limit) || 200;
        const users = await db.getAllUsers(limit, 0);
        return res.json({ success: true, users });
    } catch (e) {
        console.error('[admin/users] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/admin/set-user-flag
router.post('/api/admin/set-user-flag', async (req, res) => {
    try {
        // legacy frontends may send urlencoded body
        const admin = await verifyAdminToken(req).catch(()=>null);
        // Allow this endpoint without auth for local dev admin tools (optional)
        const user_id = req.body.user_id || req.body.userid || req.body.uid;
        const flag = req.body.flag;
        const value = req.body.value === 'true' || req.body.value === true || req.body.value === 1 || req.body.value === '1';
        if (!user_id || !flag) return res.status(400).json({ success: false, error: 'Missing user_id or flag' });
        const updated = await db.updateUserFlags(user_id, { [flag]: value });
        if (!updated) return res.status(500).json({ success: false, error: 'Failed to update user' });
        return res.json({ success: true, user: updated });
    } catch (e) {
        console.error('[admin/set-user-flag] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/admin/update-balance
router.post('/api/admin/update-balance', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const user_id = req.body.user_id || req.body.userid || req.body.uid;
        const balance = Number(req.body.balance || req.body.amount || 0);
        if (!user_id) return res.status(400).json({ success: false, error: 'Missing user_id' });
        const updated = await db.updateUserBalance(user_id, balance);
        if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, user: updated });
    } catch (e) {
        console.error('[admin/update-balance] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/admin/topup-records - Get all topup records (MongoDB)
router.get('/api/admin/topup-records', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        
        const records = await db.getAllTopups();
        return res.json({ success: true, records });
    } catch (e) {
        console.error('[admin/topup-records] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/admin/add-topup
router.post('/api/admin/add-topup', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const body = req.body || {};
        const topupData = {
            id: body.id || `topup_${Date.now()}`,
            user_id: body.user_id || body.userid,
            coin: body.coin || body.currency || 'USDT',
            address: body.address || '',
            photo_url: body.photo_url || body.photo || '',
            amount: Number(body.amount || 0) || 0,
            status: body.status || 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const created = await db.createTopup(topupData);
        if (!created) return res.status(500).json({ success: false, error: 'Failed to create topup' });
        return res.json({ success: true, data: created });
    } catch (e) {
        console.error('[admin/add-topup] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/admin/add-withdrawal
router.post('/api/admin/add-withdrawal', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const body = req.body || {};
        const withdrawalData = {
            id: body.id || `withdrawal_${Date.now()}`,
            user_id: body.user_id || body.userid,
            coin: body.coin || 'USDT',
            address: body.address || '',
            amount: Number(body.amount || body.quantity || 0) || 0,
            status: body.status || 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const created = await db.createWithdrawal(withdrawalData);
        if (!created) return res.status(500).json({ success: false, error: 'Failed to create withdrawal' });
        return res.json({ success: true, data: created });
    } catch (e) {
        console.error('[admin/add-withdrawal] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ============= TOPUP ENDPOINTS =============

// GET /api/admin/topup-records - Get all topup records for admin dashboard
router.get('/api/admin/topup-records', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const limit = parseInt(req.query.limit) || 100;
        const skip = parseInt(req.query.skip) || 0;
        const records = await db.getAllTopups(limit, skip);
        return res.json({ success: true, records });
    } catch (e) {
        console.error('[admin/topup-records] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// PUT /api/admin/topup/approve-mongo - Approve topup and add to user balance
router.put('/api/admin/topup/approve-mongo', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'Missing topup ID' });
        
        // Get the topup record
        const Topup = require('../models/Topup');
        const topup = await Topup.findByIdAndUpdate(
            id,
            { status: 'complete', updated_at: new Date() },
            { new: true }
        );
        
        if (!topup) return res.status(404).json({ success: false, error: 'Topup record not found' });
        
        // Update user balance - search by userid field (string), not _id
        const User = require('../models/User');
        const coinKey = `balances.${topup.coin.toLowerCase()}`;
        const updated = await User.findOneAndUpdate(
            { userid: topup.user_id },  // Search by userid field which matches topup.user_id
            { $inc: { [coinKey]: topup.amount } },
            { new: true }
        );
        
        if (!updated) {
            console.warn(`[admin/topup/approve-mongo] User not found for user_id: ${topup.user_id}`);
        }
        
        console.log(`[admin/topup/approve-mongo] Approved topup ${id} for user ${topup.user_id}: +${topup.amount} ${topup.coin}`);
        return res.json({ success: true, record: topup, updatedUser: updated });
    } catch (e) {
        console.error('[admin/topup/approve-mongo] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// PUT /api/admin/topup/reject-mongo - Reject topup record
router.put('/api/admin/topup/reject-mongo', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'Missing topup ID' });
        
        // Update topup status to rejected
        const Topup = require('../models/Topup');
        const topup = await Topup.findByIdAndUpdate(
            id,
            { status: 'rejected', updated_at: new Date() },
            { new: true }
        );
        
        if (!topup) return res.status(404).json({ success: false, error: 'Topup record not found' });
        
        console.log(`[admin/topup/reject-mongo] Rejected topup ${id} for user ${topup.user_id}`);
        return res.json({ success: true, record: topup });
    } catch (e) {
        console.error('[admin/topup/reject-mongo] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/admin/topup/delete - Delete topup record
router.delete('/api/admin/topup/delete', async (req, res) => {
    try {
        const admin = await verifyAdminToken(req);
        if (!admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
        
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'Missing topup ID' });
        
        // Delete topup record
        const Topup = require('../models/Topup');
        const deleted = await Topup.findByIdAndDelete(id);
        
        if (!deleted) return res.status(404).json({ success: false, error: 'Topup record not found' });
        
        console.log(`[admin/topup/delete] Deleted topup ${id}`);
        return res.json({ success: true, message: 'Record deleted successfully' });
    } catch (e) {
        console.error('[admin/topup/delete] error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/api/topup', async (req, res) => {
    try {
        const topupData = {
            id: req.body.id || `topup_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            coin: req.body.coin,
            address: req.body.address,
            photo_url: req.body.photo_url,
            amount: req.body.amount,
            status: req.body.status || 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const topup = await db.createTopup(topupData);
        res.status(201).json(topup);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/topup/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const records = await db.getUserTopupRecords(req.params.userId, limit);
        res.json(records);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Legacy endpoint: GET /api/topup-records?user_id=...  (some frontends call this)
router.get(['/api/topup-records', '/api/topup-records/'], async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userid || req.query.uid;
        if (!userId) return res.status(400).json({ code: 0, data: [], message: 'Missing user_id' });
        const limit = parseInt(req.query.limit) || 100;
        console.log(`[api] GET /api/topup-records user_id=${userId} limit=${limit}`);
        const records = await db.getUserTopupRecords(userId, limit);
        console.log(`[api] /api/topup-records -> returning ${records.length} records for user_id=${userId}`);
        // Return legacy-friendly shape used by frontends
        return res.json({ success: true, records: records });
    } catch (e) {
        console.error('[legacy topup-records] error:', e && e.message);
        return res.status(500).json({ code: 0, data: [], success: false, records: [], message: e.message });
    }
});

router.put('/api/topup/:topupId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await db.updateTopupStatus(req.params.topupId, status);
        if (!updated) return res.status(404).json({ error: 'Topup not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= WITHDRAWAL ENDPOINTS =============

router.post('/api/withdrawal', async (req, res) => {
    try {
        const withdrawalData = {
            id: req.body.id || `withdrawal_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            coin: req.body.coin,
            address: req.body.address,
            amount: req.body.amount,
            status: req.body.status || 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const withdrawal = await db.createWithdrawal(withdrawalData);
        res.status(201).json(withdrawal);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/withdrawal/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const records = await db.getUserWithdrawalRecords(req.params.userId, limit);
        res.json(records);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Legacy endpoint: POST /api/withdrawal-record (older frontends expect this)
router.post(['/api/withdrawal-record', '/api/withdrawal-record/'], async (req, res) => {
    try {
        const body = req.body || {};
        const user_id = body.user_id || body.userid || body.uid;
        const coin = body.coin || body.currency || (body.coin && body.coin.toLowerCase ? body.coin.toUpperCase() : 'USDT');
        const address = body.address || body.addr || '';
        // legacy frontends send `quantity` instead of `amount`
        const amount = Number(body.amount || body.quantity || 0) || 0;

        if (!user_id || !amount || !address) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const withdrawalData = {
            id: body.id || `withdrawal_${Date.now()}_${uuidv4().substring(0,8)}`,
            user_id: user_id,
            coin: coin,
            address: address,
            amount: amount,
            status: body.status || 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };

        const created = await db.createWithdrawal(withdrawalData);
        if (!created) return res.status(500).json({ success: false, error: 'Failed to save withdrawal' });
        return res.json({ success: true, data: created });
    } catch (e) {
        console.error('[api] /api/withdrawal-record error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// Legacy endpoint: GET /api/withdrawal-records?user_id=...  (returns legacy shape)
router.get(['/api/withdrawal-records', '/api/withdrawal-records/'], async (req, res) => {
    try {
        const userId = req.query.user_id || req.query.userid || req.query.uid;
        if (!userId) return res.status(400).json({ success: false, records: [], message: 'Missing user_id' });
        const limit = parseInt(req.query.limit) || 100;
        console.log(`[api] GET /api/withdrawal-records user_id=${userId} limit=${limit}`);
        const records = await db.getUserWithdrawalRecords(userId, limit);
        console.log(`[api] /api/withdrawal-records -> returning ${records.length} records for user_id=${userId}`);
        return res.json({ success: true, records: records });
    } catch (e) {
        console.error('[legacy withdrawal-records] error:', e && e.message);
        return res.status(500).json({ success: false, records: [], code: 0, data: [], message: e.message });
    }
});

router.put('/api/withdrawal/:withdrawalId/status', async (req, res) => {
    try {
        const { status, txhash } = req.body;
        const updated = await db.updateWithdrawalStatus(req.params.withdrawalId, status, txhash);
        if (!updated) return res.status(404).json({ error: 'Withdrawal not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= EXCHANGE ENDPOINTS =============

router.post('/api/exchange', async (req, res) => {
    try {
        const exchangeData = {
            id: req.body.id || `exchange_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            from_coin: req.body.from_coin,
            to_coin: req.body.to_coin,
            from_amount: req.body.from_amount,
            to_amount: req.body.to_amount,
            rate: req.body.rate || 0,
            status: req.body.status || 'completed',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const exchange = await db.createExchangeRecord(exchangeData);
        // After saving the exchange record, update user's balances in DB
        try {
            if (exchange && exchange.user_id) {
                const user = await db.getUserById(exchange.user_id);
                if (user) {
                    const balances = Object.assign({}, user.balances || {});
                    const fromKey = (exchange.from_coin || '').toLowerCase();
                    const toKey = (exchange.to_coin || '').toLowerCase();
                    const fromAmount = Number(exchange.from_amount) || 0;
                    const toAmount = Number(exchange.to_amount) || 0;

                    // Ensure keys exist
                    const keys = ['usdt','btc','eth','usdc','pyusd','sol'];
                    keys.forEach(k => { if (balances[k] === undefined || balances[k] === null) balances[k] = Number(user.balances && user.balances[k] ? user.balances[k] : (user[k] || 0)) || 0; });

                    balances[fromKey] = Math.max(0, (Number(balances[fromKey]) || 0) - fromAmount);
                    balances[toKey] = (Number(balances[toKey]) || 0) + toAmount;

                    await db.updateUserBalances(exchange.user_id, balances);
                    console.log(`[api] /api/exchange - updated balances for user ${exchange.user_id}: -${fromAmount} ${fromKey} +${toAmount} ${toKey}`);
                }
            }
        } catch (balErr) {
            console.error('[api] /api/exchange - failed to update balances:', balErr && balErr.message);
        }

        res.status(201).json(exchange);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/exchange/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const records = await db.getUserExchangeRecords(req.params.userId, limit);
        res.json(records);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Legacy POST route used by older frontend: /api/exchange-record
router.post('/api/exchange-record', async (req, res) => {
    try {
        const exchangeData = {
            id: req.body.id || `exchange_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            from_coin: req.body.from_coin,
            to_coin: req.body.to_coin,
            from_amount: req.body.from_amount,
            to_amount: req.body.to_amount,
            rate: req.body.rate || 0,
            status: req.body.status || 'completed',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };

        const exchange = await db.createExchangeRecord(exchangeData);
        if (!exchange) return res.status(500).json({ success: false, error: 'Failed to save record' });
        // Update user's balances (legacy handler)
        try {
            if (exchange && exchange.user_id) {
                const user = await db.getUserById(exchange.user_id);
                if (user) {
                    const balances = Object.assign({}, user.balances || {});
                    const fromKey = (exchange.from_coin || '').toLowerCase();
                    const toKey = (exchange.to_coin || '').toLowerCase();
                    const fromAmount = Number(exchange.from_amount) || 0;
                    const toAmount = Number(exchange.to_amount) || 0;
                    const keys = ['usdt','btc','eth','usdc','pyusd','sol'];
                    keys.forEach(k => { if (balances[k] === undefined || balances[k] === null) balances[k] = Number(user.balances && user.balances[k] ? user.balances[k] : (user[k] || 0)) || 0; });
                    balances[fromKey] = Math.max(0, (Number(balances[fromKey]) || 0) - fromAmount);
                    balances[toKey] = (Number(balances[toKey]) || 0) + toAmount;
                    await db.updateUserBalances(exchange.user_id, balances);
                    console.log(`[api] /api/exchange-record - updated balances for user ${exchange.user_id}: -${fromAmount} ${fromKey} +${toAmount} ${toKey}`);
                }
            }
        } catch (balErr) {
            console.error('[api] /api/exchange-record - failed to update balances:', balErr && balErr.message);
        }

        return res.json({ success: true, record: exchange });
    } catch (e) {
        console.error('[api] /api/exchange-record error:', e && e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// Legacy route used by some frontend pages: /api/exchange-records?user_id=123
router.get('/api/exchange-records', async (req, res) => {
    try {
        const user_id = req.query.user_id || req.query.userid || req.query.userId;
        if (!user_id) return res.status(400).json({ error: 'Missing user_id parameter' });
        const limit = parseInt(req.query.limit) || 50;
        const records = await db.getUserExchangeRecords(user_id, limit);
        return res.json({ success: true, records });
    } catch (e) {
        console.error('[api] /api/exchange-records error:', e && e.message);
        return res.status(500).json({ success: false, records: [], error: e.message });
    }
});

// ============= TRADE ENDPOINTS =============

router.post('/api/trade', async (req, res) => {
    try {
        const tradeData = {
            id: req.body.id || `trade_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            pair: req.body.pair,
            type: req.body.type,
            entry_price: req.body.entry_price,
            amount: req.body.amount,
            leverage: req.body.leverage || 1,
            status: req.body.status || 'open',
            entry_time: new Date(),
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const trade = await db.createTrade(tradeData);
        res.status(201).json(trade);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/trade/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const status = req.query.status || null;
        const trades = await db.getUserTrades(req.params.userId, limit, status);
        res.json(trades);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/trade/:tradeId/close', async (req, res) => {
    try {
        const { exit_price, pnl } = req.body;
        const updated = await db.closeTrade(req.params.tradeId, exit_price, pnl);
        if (!updated) return res.status(404).json({ error: 'Trade not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= MINING ENDPOINTS =============

router.post('/api/mining', async (req, res) => {
    try {
        const miningData = {
            id: req.body.id || `mining_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            package_id: req.body.package_id,
            amount: req.body.amount,
            daily_reward: req.body.daily_reward,
            status: req.body.status || 'active',
            start_date: new Date(),
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const mining = await db.createMining(miningData);
        res.status(201).json(mining);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/mining/:userId', async (req, res) => {
    try {
        const records = await db.getUserMiningRecords(req.params.userId);
        res.json(records);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/mining/:miningId/claim', async (req, res) => {
    try {
        const { earned, total_earned } = req.body;
        const updated = await db.updateMiningEarnings(req.params.miningId, earned, total_earned);
        if (!updated) return res.status(404).json({ error: 'Mining record not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= LOAN ENDPOINTS =============

router.post('/api/loan', async (req, res) => {
    try {
        const loanData = {
            id: req.body.id || `loan_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            amount: req.body.amount,
            interest_rate: req.body.interest_rate || 0,
            duration_days: req.body.duration_days,
            total_repay: req.body.total_repay,
            status: req.body.status || 'pending',
            disbursed_date: new Date(),
            due_date: new Date(Date.now() + (req.body.duration_days * 24 * 60 * 60 * 1000)),
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const loan = await db.createLoan(loanData);
        res.status(201).json(loan);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/loan/:userId', async (req, res) => {
    try {
        const loans = await db.getUserLoans(req.params.userId);
        res.json(loans);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= WALLET ENDPOINTS =============

router.post('/api/wallet', async (req, res) => {
    try {
        const walletData = {
            id: req.body.id || uuidv4(),
            user_id: req.body.user_id,
            address: req.body.address.toLowerCase(),
            chain: req.body.chain,
            balance: req.body.balance || 0,
            balances: req.body.balances || {},
            is_primary: req.body.is_primary || false,
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const wallet = await db.createWallet(walletData);
        res.status(201).json(wallet);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/wallet/:userId', async (req, res) => {
    try {
        const wallets = await db.getUserWallets(req.params.userId);
        res.json(wallets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/wallet/address/:address', async (req, res) => {
    try {
        const wallet = await db.getWalletByAddress(req.params.address);
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
        res.json(wallet);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST get balance by user_id or address
async function handleGetBalance(req, res) {

    try {
        console.log('[api] POST /api/wallet/getbalance called with body:', req.body);
        const remoteAddr = req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || req.ip || 'unknown';
        console.log(`[api] /api/wallet/getbalance request from ${remoteAddr}`);
        // Accept legacy param names from older frontends: userid, user_id, uid
        const body = req.body || {};
        const address = body.address || body.addr || null;
        const user_id = body.user_id || body.userid || body.uid || body.userId || null;

        if (!user_id && !address) {
            return res.status(400).json({ error: 'Provide user_id/(userid/uid) or address in request body' });
        }

        // If both user_id and address are present, prefer user_id (db user balances take precedence)
        if (address && !user_id) {
            const wallet = await db.getWalletByAddress(address);
            if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
            const walletBalances = wallet.balances || {};
            const payload = Object.assign({}, walletBalances, { total_balance: Number(wallet.balance) || 0, wallets: [wallet] });
            return res.json({ code: 1, data: payload });
        }

        // PRIORITY: Check User record's balances first (these are updated by topup approvals)
        const userRecord = await db.getUserById(user_id);
        if (userRecord && userRecord.balances && Object.keys(userRecord.balances).length > 0) {
            // User has balances stored on their record - use these (they're updated by admin topup approvals)
            const userBalances = userRecord.balances;
            const totalFromUser = Object.keys(userBalances).reduce((acc, k) => acc + (Number(userBalances[k]) || 0), 0);
            console.log('[api] /api/wallet/getbalance - returning User record balances:', userBalances);
            return res.json({ code: 1, data: Object.assign({}, userBalances, { total_balance: totalFromUser, wallets: [] }) });
        }

        // FALLBACK: Aggregate wallets for user if no user balances exist
        const wallets = await db.getUserWallets(user_id);
        if (!wallets || wallets.length === 0) {
            // No wallet documents and no user balances - return empty structured response
            return res.json({ code: 1, data: { usdt: 0, btc: 0, eth: 0, usdc: 0, pyusd: 0, sol: 0, total_balance: 0, wallets: [] } });
        }

        // sum numeric balances from wallet documents
        let totalBalance = 0;
        const aggregated = {};
        wallets.forEach(w => {
            const b = Number(w.balance) || 0;
            totalBalance += b;
            if (w.balances && typeof w.balances === 'object') {
                Object.keys(w.balances).forEach(k => {
                    aggregated[k] = (aggregated[k] || 0) + (Number(w.balances[k]) || 0);
                });
            }
        });

        // Return flat balance keys so assets.html can read them as `res.data` or `res`
        const normalized = Object.assign({ usdt: 0, btc: 0, eth: 0, usdc: 0, pyusd: 0, sol: 0 }, aggregated, { total_balance: totalBalance, wallets });
        res.json({ code: 1, data: normalized });
    } catch (e) {
        console.error('[api] /api/wallet/getbalance error:', e);
        res.status(500).json({ error: e.message });
    }
}

router.post('/api/wallet/getbalance', handleGetBalance);
router.post('/api/Wallet/getbalance', handleGetBalance);

// ============= GET COIN DATA ENDPOINTS =============

// GET /api/Wallet/getcoin_all_data - Fetch all coin price data from external API or fallback
router.post(['/api/Wallet/getcoin_all_data', '/api/wallet/getcoin_all_data'], (req, res) => {
    try {
        const externalApiUrls = [
            'https://api.bvoxf.com/api/Wallet/getcoin_all_data'
            //'https://api.bitcryptoforest.com/api/kline/getAllProduct'
        ];

        const tryProxy = (index) => {
            if (index >= externalApiUrls.length) {
                // External APIs unavailable — return a small local fallback dataset with realistic prices
                const sampleData = [
                    { symbol: 'btcusdt', close: 95000 },      // BTC ~$95,000
                    { symbol: 'ethusdt', close: 3500 },       // ETH ~$3,500
                    { symbol: 'usdcusdt', close: 1.00 },      // USDC = $1.00
                    { symbol: 'pyusdusdt', close: 1.00 },     // PYUSD = $1.00
                    { symbol: 'solusdt', close: 180 }         // SOL ~$180
                ];

                const fallback = {
                    code: 1,
                    data: {
                        data: sampleData
                    }
                };

                console.warn('[getcoin_all_data] External APIs down — returning local fallback prices');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(fallback));
                return;
            }

            const externalApiUrl = externalApiUrls[index];
            
            const externalReq = https.request(externalApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': 0
                }
            }, (externalRes) => {
                let responseData = '';
                externalRes.on('data', chunk => { responseData += chunk; });
                externalRes.on('end', () => {
                    // If external returns 200, forward it; otherwise try next
                    if (externalRes.statusCode >= 200 && externalRes.statusCode < 300) {
                        res.writeHead(externalRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(responseData);
                    } else {
                        // Only log non-200 responses
                        try {
                            const snippet = responseData ? responseData.substring(0, 300) : '';
                            console.error('[getcoin_all_data] External response error from', externalApiUrl, 'status=', externalRes.statusCode, 'bodySnippet=', snippet.replace(/\n/g, '\\n'));
                        } catch (logErr) {
                            console.error('[getcoin_all_data] Error logging external response:', logErr.message);
                        }
                        tryProxy(index + 1);
                    }
                });
            });

            externalReq.on('error', (err) => {
                console.error('[getcoin_all_data] External request error for', externalApiUrl, ':', err.message);
                tryProxy(index + 1);
            });

            externalReq.end();
        };

        tryProxy(0);
    } catch (e) {
        console.error('[getcoin_all_data] Error:', e.message);
        res.status(400).json({ code: 0, data: e.message });
    }
});

// ============= KYC ENDPOINTS =============

router.post('/api/kyc', async (req, res) => {
    try {
        const kycData = {
            id: req.body.id || `kyc_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            full_name: req.body.full_name,
            date_of_birth: req.body.date_of_birth,
            nationality: req.body.nationality,
            document_type: req.body.document_type,
            document_number: req.body.document_number,
            document_image_url: req.body.document_image_url,
            selfie_url: req.body.selfie_url,
            status: req.body.status || 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const kyc = await db.createKYCRecord(kycData);
        res.status(201).json(kyc);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/kyc/:userId', async (req, res) => {
    try {
        const kyc = await db.getUserKYCRecord(req.params.userId);
        if (!kyc) return res.status(404).json({ error: 'KYC record not found' });
        res.json(kyc);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/kyc/:userId/verify', async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const updated = await db.updateKYCStatus(req.params.userId, status, rejectionReason);
        if (!updated) return res.status(404).json({ error: 'KYC record not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= ARBITRAGE ENDPOINTS =============

router.get('/api/arbitrage/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const products = await db.getAllArbitrageProducts(limit);
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/api/arbitrage/subscribe', async (req, res) => {
    try {
        const subscriptionData = {
            id: req.body.id || `arb_sub_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            product_id: req.body.product_id,
            amount: req.body.amount,
            daily_return: req.body.daily_return,
            total_return: req.body.total_return,
            status: req.body.status || 'active',
            start_date: new Date(),
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const subscription = await db.createArbitrageSubscription(subscriptionData);
        res.status(201).json(subscription);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/arbitrage/:userId', async (req, res) => {
    try {
        const subscriptions = await db.getUserArbitrageSubscriptions(req.params.userId);
        res.json(subscriptions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/arbitrage/:subscriptionId/payout', async (req, res) => {
    try {
        const { earned } = req.body;
        const updated = await db.updateSubscriptionPayout(req.params.subscriptionId, earned);
        if (!updated) return res.status(404).json({ error: 'Subscription not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============= NOTIFICATION ENDPOINTS =============

router.post('/api/notification', async (req, res) => {
    try {
        const notificationData = {
            id: req.body.id || `notif_${Date.now()}_${uuidv4().substring(0, 9)}`,
            user_id: req.body.user_id,
            title: req.body.title,
            message: req.body.message,
            type: req.body.type,
            read: req.body.read || false,
            link: req.body.link,
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };
        const notification = await db.createNotification(notificationData);
        res.status(201).json(notification);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/notification/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const notifications = await db.getUserNotifications(req.params.userId, limit);
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/api/notification/:notificationId/read', async (req, res) => {
    try {
        const updated = await db.markNotificationAsRead(req.params.notificationId);
        if (!updated) return res.status(404).json({ error: 'Notification not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

// === Legacy compatibility endpoints below ===

// Helper: proxy POST to external API
async function proxyPostExternal(externalUrl, req, res) {
    try {
        // Build body: if original content-type was json, send json; otherwise send form-urlencoded
        let bodyString = '';
        const contentType = (req.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('application/json')) {
            bodyString = JSON.stringify(req.body || {});
        } else {
            // urlencoded
            bodyString = Object.keys(req.body || {}).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(req.body[k])).join('&');
        }

        const parsed = new URL(externalUrl);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + (parsed.search || ''),
            method: 'POST',
            headers: {
                'Content-Type': contentType.includes('application/json') ? 'application/json' : 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(bodyString)
            }
        };

        const extReq = https.request(options, (extRes) => {
            let responseData = '';
            extRes.on('data', chunk => responseData += chunk);
            extRes.on('end', () => {
                res.status(extRes.statusCode).type('application/json').send(responseData);
            });
        });

        extReq.on('error', (err) => {
            console.error('[proxyPostExternal] error:', err.message);
            res.status(503).json({ code: 0, data: 'External API unavailable' });
        });

        extReq.write(bodyString);
        extReq.end();
    } catch (e) {
        console.error('[proxyPostExternal] exception:', e.message);
        res.status(500).json({ code: 0, data: e.message });
    }
}

// GET /api/user/get_nonce?address=...
router.get(['/api/user/get_nonce', '/api/user/get-nonce'], (req, res) => {
    try {
        const address = (req.query.address || req.query.addr || '').toString().toLowerCase();
        if (!address) return res.status(400).json({ code: 0, info: 'Missing address parameter' });

        const noncesFile = path.join(__dirname, '..', 'nonces.json');
        let nonces = {};
        try { if (fs.existsSync(noncesFile)) nonces = JSON.parse(fs.readFileSync(noncesFile, 'utf8') || '{}'); } catch (e) { nonces = {}; }

        const nonce = Math.floor(100000 + Math.random() * 900000).toString();
        nonces[address] = { nonce: nonce, expiresAt: Date.now() + 5 * 60 * 1000 };
        try { fs.writeFileSync(noncesFile, JSON.stringify(nonces, null, 2)); } catch (e) { console.error('Failed to write nonces.json', e.message); }

        res.json({ code: 1, data: nonce });
    } catch (e) {
        res.status(500).json({ code: 0, info: e.message });
    }
});

// POST /api/User/getsfxtz - check if user exists (legacy)
router.post(['/api/User/getsfxtz', '/api/user/getsfxtz'], async (req, res) => {
    try {
        const userId = req.body.userid || req.body.user_id || req.body.uid || req.body.id;
        if (!userId) return res.json({ code: 1, data: 0 });
        const user = await db.getUserById(userId);
        res.json({ code: 1, data: user ? 1 : 0 });
    } catch (e) {
        res.status(500).json({ code: 0, info: e.message });
    }
});

// POST /api/Trade/getcoin_data and /api/Trade/gettradlist proxy to external API
router.post(['/api/Trade/getcoin_data', '/api/trade/getcoin_data'], (req, res) => {
    const external = 'https://api.bvoxf.com/api/Trade/getcoin_data';
    proxyPostExternal(external, req, res);
});

router.post(['/api/Trade/gettradlist', '/api/trade/gettradlist'], (req, res) => {
    const external = 'https://api.bvoxf.com/api/Trade/gettradlist';
    proxyPostExternal(external, req, res);
});

// POST /api/Record/getcontract - return trades for user (legacy shape)
router.post(['/api/Record/getcontract', '/api/record/getcontract'], async (req, res) => {
    try {
        const userid = req.body.userid || req.body.user_id || req.body.uid;
        const page = Number(req.body.page || 1) || 1;
        const pageSize = 10;
        if (!userid) return res.status(400).json({ code: 0, data: [], message: 'Missing userid' });

        // Prefer DB trades if available
        const trades = await db.getUserTrades(userid, 1000);
        // Map to legacy shape
        const mapped = (trades || []).map(trade => {
            const num = Number(trade.num) || 0;
            const status = (trade.status || '').toString().toLowerCase();
            let fangxiang = 2;
            if (String(trade.fangxiang).toLowerCase() === 'up' || String(trade.fangxiang).toLowerCase() === 'upward' || String(trade.fangxiang) === '1') fangxiang = 1;
            if (String(trade.fangxiang) === '2' || String(trade.fangxiang).toLowerCase() === 'down' || String(trade.fangxiang).toLowerCase() === 'downward') fangxiang = 2;
            const zhuangtai = (status === 'pending' || status === '1') ? 1 : 0;
            const zuizhong = (status === 'win' || status === 'success' || status === '2') ? 1 : 0;
            const isloss = (status === 'loss' || status === '3') ? 1 : 0;
            let ying = num;
            if (isloss === 1) ying = -num;
            else if (zuizhong === 1) ying = Number(trade.payout || trade.settled_amount || num + (trade.profit || 0));
            const buytime = trade.created_at ? Math.floor(new Date(trade.created_at).getTime() / 1000) : (trade.buytime || 0);
            return {
                id: trade.id || trade._id,
                biming: trade.biming || trade.coin || '',
                num: num,
                fangxiang: fangxiang,
                miaoshu: trade.miaoshu || trade.duration || '',
                buytime: buytime,
                zhuangtai: zhuangtai,
                zuizhong: zuizhong,
                ying: ying
            };
        });

        // sort by buytime desc
        mapped.sort((a, b) => (b.buytime || 0) - (a.buytime || 0));
        const start = (page - 1) * pageSize;
        const pageTrades = mapped.slice(start, start + pageSize);
        res.json({ code: 1, data: pageTrades });
    } catch (e) {
        console.error('[legacy record/getcontract] error:', e.message);
        res.status(500).json({ code: 0, data: [], message: e.message });
    }
});

// POST /api/trade/buy - create trade (legacy frontends call this)
router.post(['/api/trade/buy', '/api/Trade/buy'], async (req, res) => {
    try {
        const data = req.body || {};
        const userid = data.userid || data.user_id || data.uid;
        const username = data.username || data.name || 'user_' + userid;
        const biming = data.biming || data.coin || data.biming;
        const num = Number(data.num || data.amount || 0) || 0;
        const buyprice = data.buyprice || data.price || 0;
        const syl = Number(data.syl || 40) || 40;
        const fangxiang = (data.fangxiang == 1 || data.fangxiang == '1' || String(data.fangxiang).toLowerCase() === 'up') ? 1 : 2;

        if (!userid || !biming || !num || !buyprice) return res.status(400).json({ code: 0, data: 'Missing required fields' });

        const tradeData = {
            id: Date.now().toString(),
            user_id: userid,
            userid: userid,
            username: username,
            biming: biming,
            fangxiang: fangxiang,
            miaoshu: data.miaoshu || data.duration || '',
            num: num,
            buyprice: buyprice,
            syl: syl,
            zengjia: data.zengjia,
            jianshao: data.jianshao,
            status: 'pending',
            created_at: new Date()
        };

        const created = await db.createTrade(tradeData);
        res.json({ code: 1, data: created });
    } catch (e) {
        console.error('[legacy trade/buy] error:', e.message);
        res.status(500).json({ code: 0, data: e.message });
    }
});

// POST /api/upload-image - accept JSON { filename, data: dataUrl or base64 }
router.post('/api/upload-image', async (req, res) => {
    try {
        const { filename, data } = req.body || {};
        if (!data) return res.status(400).json({ code: 0, data: 'Missing image data' });

        // data may be a data URL like: data:image/png;base64,AAAA
        let matches = String(data).match(/^data:(image\/[^;]+);base64,(.+)$/);
        let mime = 'image/png';
        let b64 = '';
        if (matches) {
            mime = matches[1];
            b64 = matches[2];
        } else {
            // assume plain base64
            b64 = String(data).replace(/^data:.*;base64,/, '');
        }

        const ext = (mime && mime.split('/')[1]) ? mime.split('/')[1].split('+')[0] : 'png';
        const safeName = (filename || `upload_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const outName = `${Date.now()}_${safeName}.${ext}`.replace(/\.+$/, '');
        const outPath = path.join(UPLOADS_DIR, outName);

        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));

        // Return a relative URL to the uploaded file
        const publicUrl = `/uploads/${outName}`;
        res.json({ code: 1, data: publicUrl });
    } catch (e) {
        console.error('[api] /api/upload-image error:', e && e.message);
        res.status(500).json({ code: 0, data: e.message });
    }
});

// POST /api/topup-record - create topup record from frontend
router.post('/api/topup-record', async (req, res) => {
    try {
        const body = req.body || {};
        // Accept both user_id and userid
        const user_id = body.user_id || body.userid || body.uid;
        const coin = body.coin || 'usdt';
        const address = body.address || body.addr || '';
        const photo_url = body.photo_url || body.photo || '';
        const amount = Number(body.amount || 0) || 0;

        if (!user_id || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const topupData = {
            id: body.id || `topup_${Date.now()}_${uuidv4().substring(0,8)}`,
            user_id: user_id,
            coin: coin,
            address: address,
            photo_url: photo_url,
            amount: amount,
            status: 'pending',
            timestamp: Date.now(),
            created_at: new Date(),
            updated_at: new Date()
        };

        const created = await db.createTopup(topupData);
        if (!created) return res.status(500).json({ error: 'Failed to save topup record' });

        res.json({ success: true, data: created });
    } catch (e) {
        console.error('[api] /api/topup-record error:', e && e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/user/getuserid - wallet login (legacy)
router.post(['/api/user/getuserid', '/api/User/getuserid'], async (req, res) => {
    try {
        const addressRaw = req.body.address || req.body.addr || req.body.address_raw;
        const signature = req.body.signature || req.body.sig || req.body.sign;
        const msg = req.body.msg || req.body.message || req.body.nonce || '';
        const address = (addressRaw || '').toString().toLowerCase();

        if (!address) return res.status(400).json({ code: 0, data: 'Missing address' });

        // Optional: verify signature if provided and ethers available
        let verified = false;
        try {
            if (signature && msg) {
                const message = typeof msg === 'string' && msg.startsWith('Login code:') ? msg : `Login code: ${msg}`;
                const recovered = ethers.verifyMessage(message, signature);
                verified = recovered && recovered.toLowerCase() === address;
            }
        } catch (e) {
            console.warn('[getuserid] signature verification failed:', e && e.message);
        }

        // Try to find a wallet linked to this address
        const wallet = await db.getWalletByAddress(address);
        let user = null;
        if (wallet && wallet.user_id) {
            user = await db.getUserById(wallet.user_id);
        }

        // If not found, try find User by wallet_address field
        if (!user) {
            const UserModel = require('../models/User');
            user = await UserModel.findOne({ wallet_address: address });
        }

        // If still not found, create a new user
        if (!user) {
            // Generate next 6-digit user ID starting from 342020
            const UserModel = require('../models/User');
            const allUsers = await UserModel.find({}, { userid: 1 }).sort({ _id: -1 }).limit(1);
            const maxId = allUsers.length > 0 ? parseInt(allUsers[0].userid || '342019', 10) : 342019;
            const nextUserId = String(maxId + 1);
            
            const newUser = {
                userid: nextUserId,
                uid: nextUserId,
                username: `user_${nextUserId}`,
                wallet_address: address,
                balance: 0,
                balances: { usdt: 0, btc: 0, eth: 0, usdc: 0, pyusd: 0, sol: 0 }
            };
            user = await db.createUser(newUser);
        }

        // Create or update a wallet document to ensure mapping
        try {
            const WalletModel = require('../models/Wallet');
            const existing = await WalletModel.findOne({ address: address.toLowerCase() });
            if (!existing) {
                const w = new WalletModel({ id: `w_${Date.now()}`, user_id: user.userid || user.uid || user._id, address: address.toLowerCase(), balance: 0, balances: {} });
                await w.save();
            }
        } catch (e) {
            console.warn('[getuserid] wallet creation skipped:', e && e.message);
        }

        // Return a legacy-shaped response: { data: { userid, token, sid } }
        const token = (Math.random().toString(36).substring(2, 12));
        const sid = (Math.random().toString(36).substring(2, 12));

        res.json({ code: 1, data: { userid: user.userid || user.uid || String(user._id), token, sid } });
    } catch (e) {
        console.error('[getuserid] error:', e && e.message);
        res.status(500).json({ code: 0, data: e.message });
    }
});

// POST /api/Wallet/getuserzt - return KYC/status info (legacy)
router.post(['/api/Wallet/getuserzt', '/api/wallet/getuserzt'], async (req, res) => {
    try {
        const userId = req.body.userid || req.body.user_id || req.body.uid || req.body.id || req.body.address;
        if (!userId) return res.status(400).json({ code: 0, info: 'Missing userid' });

        let user = null;
        // if looks like address
        if (String(userId).toLowerCase().startsWith('0x')) {
            // find by wallet or user.wallet_address
            const wallet = await db.getWalletByAddress(userId);
            if (wallet && wallet.user_id) user = await db.getUserById(wallet.user_id);
            if (!user) {
                const UserModel = require('../models/User');
                user = await UserModel.findOne({ wallet_address: String(userId).toLowerCase() });
            }
        } else {
            user = await db.getUserById(userId);
        }

        if (!user) return res.json({ code: 0, info: 'User not found' });

        const kycMap = { none: 0, basic: 1, advanced: 2 };
        const renzhengzhuangtai = kycMap[user.kycStatus] || 0;
        const xinyongfen = user.creditScore || 0;

        res.json({ code: 1, data: { renzhengzhuangtai, xinyongfen, balance: user.balance || 0, status: user.status || 'active' } });
    } catch (e) {
        console.error('[getuserzt] error:', e && e.message);
        res.status(500).json({ code: 0, info: e.message });
    }
});
