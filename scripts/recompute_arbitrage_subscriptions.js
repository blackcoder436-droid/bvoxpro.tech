#!/usr/bin/env node
(require('dotenv').config());
const { connectDB } = require('../config/db');
(async function(){
  try {
    const mongoose = await connectDB();
    if (!mongoose) { console.error('No DB connection. Set MONGODB_URI.'); process.exit(1); }
    const ArbitrageSubscription = require('../models/ArbitrageSubscription');
    const ArbitrageProduct = require('../models/ArbitrageProduct');

    const seedProducts = {
      '1': { id: '1', name: 'Smart Plan A', min_amount: 500, max_amount: 5000, duration_days: 1, daily_return_min: 1.60, daily_return_max: 1.80 },
      '2': { id: '2', name: 'Smart Plan B', min_amount: 5001, max_amount: 30000, duration_days: 3, daily_return_min: 1.90, daily_return_max: 2.60 },
      '3': { id: '3', name: 'Smart Plan C', min_amount: 30001, max_amount: 100000, duration_days: 7, daily_return_min: 2.80, daily_return_max: 3.20 },
      '4': { id: '4', name: 'Smart Plan D', min_amount: 100001, max_amount: 500000, duration_days: 15, daily_return_min: 3.50, daily_return_max: 5.30 },
      '5': { id: '5', name: 'Smart Plan VIP', min_amount: 500001, max_amount: 1000000, duration_days: 30, daily_return_min: 5.80, daily_return_max: 6.30 }
    };

    const subs = await ArbitrageSubscription.find({});
    console.log('Found', subs.length, 'subscriptions');
    let updated = 0;
    for (const sub of subs) {
      try {
        let product = await ArbitrageProduct.findOne({ $or:[{ id: sub.product_id }, { _id: sub.product_id }] }).lean().catch(()=>null);
        if (!product) product = seedProducts[String(sub.product_id)];
        const amount = Number(sub.amount||0);
        const dailyMin = product ? Number(product.daily_return_min||0) : Number(sub.daily_return_min||0);
        const dailyMax = product ? Number(product.daily_return_max||0) : Number(sub.daily_return_max||0);
        const minAmt = product ? Number(product.min_amount||0) : 0;
        const maxAmt = product ? Number(product.max_amount||minAmt) : minAmt;
        let dailyReturn = (typeof sub.daily_return === 'number' && sub.daily_return>0) ? sub.daily_return : ((dailyMin+dailyMax)/2);
        if (amount <= minAmt) dailyReturn = dailyMin;
        else if (amount >= maxAmt) dailyReturn = dailyMax;
        else if (maxAmt>minAmt) {
          const ratio = (amount - minAmt) / (maxAmt - minAmt);
          dailyReturn = dailyMin + ratio * (dailyMax - dailyMin);
        }
        dailyReturn = Number(dailyReturn.toFixed(4));
        const durationDays = sub.end_date && sub.start_date ? Math.max(1, Math.round((new Date(sub.end_date) - new Date(sub.start_date)) / (24*60*60*1000))) : (product ? (product.duration_days||1) : (sub.duration_days||1));
        // store daily percent in total_return_percent, compute total income using days
        const totalReturnPercent = Number(dailyReturn.toFixed(4));
        const totalIncome = Number(((amount * (dailyReturn/100) * durationDays)).toFixed(4));
        const needUpdate = Math.abs((sub.total_return_percent||0)-totalReturnPercent) > 0.0001 || Math.abs((sub.total_income||0)-totalIncome) > 0.0001 || (typeof sub.daily_return!=='number' || Math.abs((sub.daily_return||0)-dailyReturn) > 0.0001);
        if (needUpdate) {
          sub.daily_return = dailyReturn;
          sub.total_return_percent = totalReturnPercent;
          sub.total_income = totalIncome;
          sub.updated_at = new Date();
          await sub.save();
          updated++;
          console.log('Updated', sub._id.toString(), '-> daily', dailyReturn, 'total%', totalReturnPercent, 'income', totalIncome);
        }
      } catch (e) {
        console.warn('Error processing sub', sub._id, e && e.message);
      }
    }
    console.log('Completed. Updated', updated, 'documents');
    process.exit(0);
  } catch (e) {
    console.error('Script failed:', e && e.message);
    process.exit(1);
  }
})();
