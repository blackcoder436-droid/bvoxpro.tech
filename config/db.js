const mongoose = require('mongoose');
const debug = require('util').debuglog ? require('util').debuglog('db') : () => {};

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODBURL || null;

async function connectDB() {
    if (!uri) {
        console.warn('[db] No MongoDB URI configured (MONGODB_URI). Skipping DB connect.');
        return null;
    }

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('[db] Connected to MongoDB');
        return mongoose;
    } catch (e) {
        console.error('[db] Failed to connect to MongoDB:', e && e.message ? e.message : e);
        return null;
    }
}

module.exports = {
    connectDB,
    mongoose
};
