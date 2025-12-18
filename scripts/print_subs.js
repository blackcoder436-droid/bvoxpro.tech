require('dotenv').config();
const { connectDB } = require('../config/db');
(async ()=>{
  try{
    const mongoose = await connectDB();
    if(!mongoose){ console.error('No DB'); process.exit(1); }
    const ArbitrageSubscription = require('../models/ArbitrageSubscription');
    const subs = await ArbitrageSubscription.find({ user_id: '1000004' }).lean();
    console.log(JSON.stringify(subs, null, 2));
    process.exit(0);
  }catch(e){ console.error(e); process.exit(1); }
})();