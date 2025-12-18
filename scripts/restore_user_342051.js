#!/usr/bin/env node
// Restore user 342051 data (topups, wallets, trades, exchangerecords, users)
// Usage:
// 1) Install deps: `npm install bson mongodb`
// 2) Run locally or on server after `git pull`:
//    node scripts/restore_user_342051.js --uri "mongodb://user:pass@127.0.0.1:27017/bvoxpro?authSource=bvoxpro" --dataDir /root

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

function argv(key) {
  const idx = process.argv.indexOf(key);
  if (idx === -1) return null;
  return process.argv[idx + 1];
}

function readEjsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const txt = fs.readFileSync(filePath, 'utf8');
  return txt.split(/\r?\n/).filter(Boolean).map(line => EJSON.parse(line));
}

function upsertKeyFor(doc) {
  if (!doc) return null;
  if (doc.id) return { id: doc.id };
  if (doc.user_id) return { user_id: doc.user_id };
  if (doc.userid) return { userid: doc.userid };
  if (doc.userid === undefined && doc.userId) return { userId: doc.userId };
  if (doc._id) return { _id: doc._id };
  return null;
}

(async function main(){
  const uri = argv('--uri') || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvoxpro';
  const dataDir = argv('--dataDir') || process.env.DATA_DIR || '/root';
  console.log('Using URI:', uri);
  console.log('Using dataDir:', dataDir);

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db('bvoxpro');

  const files = [
    { file: path.join(dataDir, 'topups_342051.json'), coll: 'topups' },
    { file: path.join(dataDir, 'wallets_342051.json'), coll: 'wallets' },
    { file: path.join(dataDir, 'trades_342051.json'), coll: 'trades' },
    { file: path.join(dataDir, 'exchangerecords_342051.json'), coll: 'exchangerecords' },
    { file: path.join(dataDir, 'user_doc_342051.json'), coll: 'users' }
  ];

  for (const f of files) {
    if (!fs.existsSync(f.file)) {
      console.log('Skipping missing file', f.file);
      continue;
    }
    console.log('Reading', f.file);
    const docs = readEjsonLines(f.file);
    console.log('Parsed', docs.length, 'docs from', f.file);
    if (docs.length === 0) continue;

    const coll = db.collection(f.coll);

    for (const doc of docs) {
      const filter = upsertKeyFor(doc) || (doc.userid ? { userid: doc.userid } : null);
      if (!filter) {
        console.log('No upsert key found for doc, inserting as new:', JSON.stringify(Object.keys(doc).slice(0,5)));
        try { await coll.insertOne(EJSON.deserialize(EJSON.serialize(doc))); } catch(e){ console.error('insert error', e); }
        continue;
      }

      // If filter contains _id with $oid wrapper, convert
      if (filter._id && filter._id.$oid) {
        const { ObjectId } = require('mongodb');
        filter._id = ObjectId(filter._id.$oid);
      }

      // Convert doc via EJSON to get Date/ObjectId types
      const clean = EJSON.deserialize(EJSON.serialize(doc));

      try {
        await coll.updateOne(filter, { $set: clean }, { upsert: true });
        console.log('Upserted into', f.coll, 'filter=', filter);
      } catch (err) {
        console.error('Upsert failed for', f.coll, filter, err);
      }
    }
  }

  console.log('Done.');
  await client.close();
})().catch(err=>{ console.error(err); process.exit(1); });
