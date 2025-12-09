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

// Simple in-memory admin token map for session emulation in dev
const adminTokens = new Map();

function base64UrlEncode(obj) {
    const s = JSON.stringify(obj);
    return Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createAdminToken(adminId, expiresInSeconds = 60 * 60 * 24) {
    const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
    const payload = base64UrlEncode({ adminId: String(adminId), exp: Math.floor(Date.now() / 1000) + expiresInSeconds });
    const signature = Math.random().toString(36).substring(2, 10);
    const token = `${header}.${payload}.${signature}`;
    adminTokens.set(token, String(adminId));
    return token;
}

async function verifyAdminToken(req) {
    const header = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (!header) return null;
    const parts = header.split(' ');
    if (parts.length !== 2) return null;
    const token = parts[1];
    const adminId = adminTokens.get(token);
    if (!adminId) return null;
    // check payload expiry if possible
    try {
        const payloadPart = token.split('.')[1];
        if (payloadPart) {
            const payloadJson = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
            if (payloadJson.exp && payloadJson.exp < Math.floor(Date.now() / 1000)) {
                adminTokens.delete(token);
                return null;
            }
        }
    } catch (e) { /* ignore parsing issues */ }
    // fetch admin
    const admin = await db.getAdminById(adminId);
    return admin;
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
try { if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { console.warn('Could not create uploads dir:', e.message); }

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

// ============= TOPUP ENDPOINTS =============

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
        // Accept legacy param names from older frontends: userid, user_id, uid
        const body = req.body || {};
        const address = body.address || body.addr || null;
        const user_id = body.user_id || body.userid || body.uid || body.userId || null;

        if (!user_id && !address) {
            return res.status(400).json({ error: 'Provide user_id/(userid/uid) or address in request body' });
        }

        if (address) {
            const wallet = await db.getWalletByAddress(address);
            if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
            const payload = Object.assign({}, wallet.balances || {}, { total_balance: wallet.balance || 0, wallet });
            return res.json({ code: 1, data: payload });
        }

        // Aggregate wallets for user
        const wallets = await db.getUserWallets(user_id);
        if (!wallets || wallets.length === 0) {
            // If there are no wallet documents, fall back to user's balances stored on the user record
            const userRecord = await db.getUserById(user_id);
            const userBalances = (userRecord && userRecord.balances) ? userRecord.balances : {};
            const totalFromUser = Object.keys(userBalances).reduce((acc, k) => acc + (Number(userBalances[k]) || 0), 0);
            // Return balances in the flat shape the legacy frontend expects (top-level keys like usdt, eth)
            return res.json({ code: 1, data: Object.assign({}, userBalances, { total_balance: totalFromUser, wallets: [] }) });
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
        res.json({ code: 1, data: Object.assign({}, aggregated, { total_balance: totalBalance, wallets }) });
    } catch (e) {
        console.error('[api] /api/wallet/getbalance error:', e);
        res.status(500).json({ error: e.message });
    }
}

router.post('/api/wallet/getbalance', handleGetBalance);
router.post('/api/Wallet/getbalance', handleGetBalance);

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
            const newUser = {
                userid: Date.now().toString(),
                uid: Date.now().toString(),
                username: `user_${Date.now().toString().slice(-6)}`,
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
