const fs = require('fs');
const path = require('path');

// Data file paths
const usersFile = path.join(__dirname, 'users.json');
const topupFile = path.join(__dirname, 'topup_records.json');
const withdrawalFile = path.join(__dirname, 'withdrawals_records.json');
const exchangeFile = path.join(__dirname, 'exchange_records.json');

// MongoDB support
let mongoose;
let User;
try {
    mongoose = require('mongoose');
    User = require('./models/User');
} catch (e) {
    mongoose = null;
    User = null;
}

/**
 * Get all users
 */
async function getAllUsers() {
    // Try MongoDB first if available
    if (mongoose && User && mongoose.connection.readyState === 1) {
        try {
            const users = await User.find({});
            if (users && users.length > 0) {
                console.log(`[getAllUsers] Found ${users.length} users in MongoDB`);
                return users;
            }
        } catch (dbErr) {
            console.error('[getAllUsers] DB error, falling back to JSON:', dbErr.message);
        }
    }
    
    // Fallback to JSON
    try {
        if (!fs.existsSync(usersFile)) {
            return [];
        }
        const data = fs.readFileSync(usersFile, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading users:', e);
        return [];
    }
}

/**
 * Get user by ID (supports both userid and uid fields)
 */
async function getUserById(userId) {
    // Try MongoDB first if available
    if (mongoose && User && mongoose.connection.readyState === 1) {
        try {
            const user = await User.findOne({
                $or: [
                    { userid: String(userId) },
                    { uid: String(userId) },
                    { id: String(userId) }
                ]
            });
            if (user) {
                console.log(`[getUserById] Found in MongoDB: ${userId}`);
                return user;
            }
        } catch (dbErr) {
            console.error('[getUserById] DB error, falling back to JSON:', dbErr.message);
        }
    }
    
    // Fallback to JSON
    try {
        if (!fs.existsSync(usersFile)) {
            return null;
        }
        const data = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(data);
        return users.find(u => String(u.userid) === String(userId) || String(u.uid) === String(userId));
    } catch (e) {
        console.error('[getUserById] JSON fallback error:', e);
        return null;
    }
}

/**
 * Update user balance
 */
async function updateUserBalance(userId, coin, amount) {
    // Try MongoDB first if available
    if (mongoose && User && mongoose.connection.readyState === 1) {
        try {
            const user = await User.findOneAndUpdate(
                {
                    $or: [
                        { userid: String(userId) },
                        { uid: String(userId) },
                        { id: String(userId) }
                    ]
                },
                {
                    $set: {
                        [`balances.${coin.toLowerCase()}`]: parseFloat(amount)
                    }
                },
                { new: true }
            );
            if (user) {
                console.log(`[updateUserBalance] Updated in MongoDB: ${userId}`);
                return user;
            }
        } catch (dbErr) {
            console.error('[updateUserBalance] DB error, falling back to JSON:', dbErr.message);
        }
    }
    
    // Fallback to JSON
    try {
        if (!fs.existsSync(usersFile)) {
            return null;
        }
        const data = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(data);
        const user = users.find(u => u.userid === userId);
        
        if (!user) {
            return null;
        }

        if (!user.balances) {
            user.balances = {};
        }

        const coins = ['usdt', 'btc', 'eth', 'usdc', 'pyusd', 'sol'];
        coins.forEach(c => {
            if (!user.balances[c]) {
                user.balances[c] = 0;
            }
        });

        user.balances[coin.toLowerCase()] = parseFloat(amount);

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        return user;
    } catch (e) {
        console.error('[updateUserBalance] JSON fallback error:', e);
        return null;
    }
}

/**
 * Get user statistics
 */
function getUserStats(userId) {
    let topupTotal = 0;
    let withdrawalTotal = 0;
    let exchangeCount = 0;

    try {
        if (fs.existsSync(topupFile)) {
            const topups = JSON.parse(fs.readFileSync(topupFile, 'utf8'));
            const userTopups = topups.filter(t => t.user_id === userId);
            topupTotal = userTopups.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        }
    } catch (e) {
        console.error('Error reading topups:', e);
    }

    try {
        if (fs.existsSync(withdrawalFile)) {
            const withdrawals = JSON.parse(fs.readFileSync(withdrawalFile, 'utf8'));
            const userWithdrawals = withdrawals.filter(w => w.user_id === userId);
            withdrawalTotal = userWithdrawals.reduce((sum, w) => sum + parseFloat(w.quantity || 0), 0);
        }
    } catch (e) {
        console.error('Error reading withdrawals:', e);
    }

    try {
        if (fs.existsSync(exchangeFile)) {
            const exchanges = JSON.parse(fs.readFileSync(exchangeFile, 'utf8'));
            exchangeCount = exchanges.filter(e => e.user_id === userId).length;
        }
    } catch (e) {
        console.error('Error reading exchanges:', e);
    }

    return {
        topupTotal,
        withdrawalTotal,
        exchangeCount,
        totalTransactions: topupTotal + withdrawalTotal + exchangeCount
    };
}

/**
 * Add topup record for user
 */
function addTopupRecord(userId, coin, amount) {
    let records = [];
    try {
        if (fs.existsSync(topupFile)) {
            records = JSON.parse(fs.readFileSync(topupFile, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading topup records:', e);
    }

    const record = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        coin: coin.toUpperCase(),
        amount: parseFloat(amount),
        created_at: new Date().toISOString(),
        timestamp: Date.now()
    };

    records.push(record);
    fs.writeFileSync(topupFile, JSON.stringify(records, null, 2));

    return record;
}

/**
 * Add withdrawal record for user
 */
function addWithdrawalRecord(userId, coin, address, quantity) {
    let records = [];
    try {
        if (fs.existsSync(withdrawalFile)) {
            records = JSON.parse(fs.readFileSync(withdrawalFile, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading withdrawal records:', e);
    }

    const record = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        coin: coin.toUpperCase(),
        address: address,
        quantity: parseFloat(quantity),
        status: 'pending',
        created_at: new Date().toISOString(),
        timestamp: Date.now()
    };

    records.push(record);
    fs.writeFileSync(withdrawalFile, JSON.stringify(records, null, 2));

    return record;
}

/**
 * Delete user transaction
 */
function deleteTransaction(transactionType, transactionId) {
    let fileToUpdate = '';
    
    if (transactionType === 'topup') {
        fileToUpdate = topupFile;
    } else if (transactionType === 'withdrawal') {
        fileToUpdate = withdrawalFile;
    } else if (transactionType === 'exchange') {
        fileToUpdate = exchangeFile;
    } else {
        return false;
    }

    try {
        if (!fs.existsSync(fileToUpdate)) {
            return false;
        }

        let records = JSON.parse(fs.readFileSync(fileToUpdate, 'utf8'));
        records = records.filter(r => r.id !== transactionId);
        fs.writeFileSync(fileToUpdate, JSON.stringify(records, null, 2));
        return true;
    } catch (e) {
        console.error('Error deleting transaction:', e);
        return false;
    }
}

/**
 * Set arbitrary flag on a user record and persist
 */
function setUserFlag(userId, flagKey, flagValue) {
    try {
        let users = [];
        if (fs.existsSync(usersFile)) {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        }

        const idx = users.findIndex(u => String(u.userid) === String(userId) || String(u.uid) === String(userId));
        if (idx === -1) return null;

        users[idx][flagKey] = flagValue;
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        console.error('[setUserFlag] Updated user', userId, flagKey, flagValue);
        return users[idx];
    } catch (e) {
        console.error('Error setting user flag:', e);
        return null;
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    updateUserBalance,
    getUserStats,
    addTopupRecord,
    addWithdrawalRecord,
    deleteTransaction
    ,setUserFlag
};
