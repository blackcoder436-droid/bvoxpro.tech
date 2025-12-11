const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Note: this project now uses MongoDB for all admin data. JSON files are deprecated.

// MongoDB support (optional - will gracefully fall back to JSON)
let AdminModel = null;
let UserModel = null;

try {
    // Always load model definitions; operations will guard on connection state
    AdminModel = require('./models/Admin');
    UserModel = require('./models/User');
    console.log('[authModel] Admin/User model definitions loaded');
} catch (e) {
    console.error('[authModel] Failed to load Admin/User models:', e && e.message);
}

/**
 * Check if MongoDB is available (connected)
 */
function isDbAvailable() {
    return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Hash password
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'BVOX_SALT_2024').digest('hex');
}

/**
 * Generate JWT-like token (simple implementation)
 */
function generateToken(adminId) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
        adminId: adminId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    })).toString('base64');
    const signature = crypto.createHmac('sha256', 'BVOX_SECRET_2024')
        .update(`${header}.${payload}`)
        .digest('base64');
    
    return `${header}.${payload}.${signature}`;
}

/**
 * Verify token
 */
function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;
        const expectedSignature = crypto.createHmac('sha256', 'BVOX_SECRET_2024')
            .update(`${header}.${payload}`)
            .digest('base64');

        if (signature !== expectedSignature) return null;

        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        if (decoded.exp < Math.floor(Date.now() / 1000)) return null; // Token expired

        return decoded;
    } catch (e) {
        return null;
    }
}

/**
 * Get all admins (DB-first, JSON fallback)
 */
async function getAllAdmins() {
    // Must use MongoDB for admin data
    if (!isDbAvailable() || !AdminModel) {
        throw new Error('MongoDB is not available - admin data must be stored in MongoDB');
    }

    const admins = await AdminModel.find({}).lean();
    console.log('[authModel] getAllAdmins from MongoDB returned', Array.isArray(admins) ? admins.length : 0, 'admins');
    return admins;
}

/**
 * Generate next admin ID in format Admin-001, Admin-002, ...
 */
async function generateNextAdminId() {
    if (!isDbAvailable() || !AdminModel) throw new Error('MongoDB is not available - cannot generate admin id');
    const admins = await AdminModel.find({}, { id: 1 }).lean();
    let maxNum = 0;
    (admins || []).forEach(a => {
        if (!a || !a.id) return;
        const m = String(a.id).match(/(\d+)$/);
        if (m && m[1]) {
            const n = parseInt(m[1], 10);
            if (Number.isFinite(n) && n > maxNum) maxNum = n;
        }
    });
    const next = maxNum + 1;
    return 'Admin-' + String(next).padStart(3, '0');
}

/**
 * Get admin by username (DB-first, JSON fallback)
 */
async function getAdminByUsername(username) {
    if (!isDbAvailable() || !AdminModel) throw new Error('MongoDB is not available');
    const admin = await AdminModel.findOne({ username }).lean();
    return admin;
}

/**
 * Get admin by ID (DB-first, JSON fallback)
 */
async function getAdminById(adminId) {
    if (!isDbAvailable() || !AdminModel) throw new Error('MongoDB is not available');
    const admin = await AdminModel.findOne({ id: adminId }).lean();
    return admin;
}

/**
 * Register new admin (DB-first, JSON fallback)
 */
async function registerAdmin(fullname, username, email, password) {
    if (!isDbAvailable() || !AdminModel) throw new Error('MongoDB is not available - cannot register admin');

    // Check existing username/email in DB
    const existingUser = await AdminModel.findOne({ $or: [{ username }, { email }] }).lean();
    if (existingUser) {
        if (existingUser.username === username) throw new Error('Username already exists');
        if (existingUser.email === email) throw new Error('Email already registered');
    }

    const newId = await generateNextAdminId();
    const adminDoc = {
        id: newId,
        fullname: fullname,
        username: username,
        email: email,
        password: hashPassword(password),
        created_at: new Date().toISOString(),
        status: 'active',
        lastLogin: null
    };

    const created = await AdminModel.create(adminDoc);
    const out = created.toObject ? created.toObject() : created;
    delete out.password;
    return out;
}

/**
 * Login admin (DB-first, JSON fallback)
 */
async function loginAdmin(username, password) {
    if (!isDbAvailable() || !AdminModel) throw new Error('MongoDB is not available - cannot login');
    const admin = await AdminModel.findOne({ username });
    if (!admin) throw new Error('Invalid username or password');

    const hashedPassword = hashPassword(password);
    if (admin.password !== hashedPassword) throw new Error('Invalid username or password');
    if (admin.status !== 'active') throw new Error('Account is not active');

    // Update last login
    await AdminModel.updateOne({ id: admin.id }, { lastLogin: new Date().toISOString() });

    const token = generateToken(admin.id);
    return {
        adminId: admin.id,
        username: admin.username,
        fullname: admin.fullname,
        token: token
    };
}

/**
 * Change password (DB-first, JSON fallback)
 */
async function changePassword(adminId, oldPassword, newPassword) {
    const admin = await getAdminById(adminId);

    if (!admin) {
        throw new Error('Admin not found');
    }

    const oldHashedPassword = hashPassword(oldPassword);
    if (admin.password !== oldHashedPassword) {
        throw new Error('Old password is incorrect');
    }

    const newHashedPassword = hashPassword(newPassword);

    // Try DB first
    if (isDbAvailable() && AdminModel) {
        try {
            const updatedAdmin = await AdminModel.findOneAndUpdate(
                { id: adminId },
                { password: newHashedPassword },
                { new: true }
            );
            console.log('[authModel] changePassword updated in MongoDB:', adminId);
            return updatedAdmin;
        } catch (e) {
            console.warn('[authModel] changePassword DB update failed; falling back to JSON:', e.message);
        }
    }

    // JSON fallback
    const admins = await getAllAdmins();
    const adminIndex = admins.findIndex(a => a.id === adminId);
    if (adminIndex === -1) throw new Error('Admin not found');
    
    admins[adminIndex].password = newHashedPassword;
    fs.writeFileSync(adminsFile, JSON.stringify(admins, null, 2));
    return admins[adminIndex];
}

module.exports = {
    registerAdmin,
    loginAdmin,
    getAdminById,
    getAdminByUsername,
    getAllAdmins,
    changePassword,
    generateToken,
    verifyToken,
    isDbAvailable,
    // Update admin profile fields (safe merge) - DB-first, JSON fallback
    updateAdminProfile: async function(adminId, updates) {
        try {
            // Try DB first
            if (isDbAvailable() && AdminModel) {
                try {
                    // Only allow certain fields to be updated
                    const allowed = ['fullname', 'email', 'telegram', 'wallets'];
                    const safeUpdates = {};
                    for (const key of Object.keys(updates || {})) {
                        if (allowed.includes(key)) {
                            safeUpdates[key] = updates[key];
                        }
                    }
                    
                    const updatedAdmin = await AdminModel.findOneAndUpdate(
                        { id: adminId },
                        { $set: safeUpdates },
                        { new: true }
                    );
                    // Also persist a lightweight public JSON for fast client reads (fallback)
                    try {
                        const publicPath = path.join(__dirname, '..', 'public_admin_info.json');
                        const publicObj = {
                            telegram: updatedAdmin.telegram || '',
                            wallets: (updatedAdmin.wallets && typeof updatedAdmin.wallets === 'object') ? updatedAdmin.wallets : {}
                        };
                        fs.writeFileSync(publicPath, JSON.stringify(publicObj, null, 2));
                        console.log('[authModel] public_admin_info.json written');
                    } catch (e) {
                        console.warn('[authModel] failed to write public_admin_info.json', e && e.message);
                    }
                    console.log('[authModel] updateAdminProfile saved to MongoDB:', adminId);
                    return updatedAdmin;
                } catch (e) {
                    console.warn('[authModel] updateAdminProfile DB save failed; falling back to JSON:', e.message);
                }
            }

            // JSON fallback
            const fileToRead = fs.existsSync(adminsFile) ? adminsFile : (fs.existsSync(legacyAdminsFile) ? legacyAdminsFile : null);
            if (!fileToRead) throw new Error('Admins file not found');
            const data = fs.readFileSync(fileToRead, 'utf8') || '[]';
            const admins = JSON.parse(data);
            const idx = admins.findIndex(a => a.id === adminId);
            if (idx === -1) throw new Error('Admin not found');

            // Only allow certain fields to be updated
            const allowed = ['fullname', 'email', 'telegram', 'wallets'];
            for (const key of Object.keys(updates || {})) {
                if (allowed.includes(key)) {
                    admins[idx][key] = updates[key];
                }
            }

            // Persist
            fs.writeFileSync(fileToRead, JSON.stringify(admins, null, 2));
            return admins[idx];
        } catch (e) {
            console.error('[authModel] updateAdminProfile error:', e.message);
            throw e;
        }
    },
    hashPassword
};
