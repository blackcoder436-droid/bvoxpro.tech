const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bvoxpro';
(async ()=>{
  await mongoose.connect(MONGO, { useNewUrlParser:true, useUnifiedTopology:true });
  const admins = await Admin.find({}).lean();
  console.log('Found admins:', admins.length);
  console.log(admins.slice(-5));
  await mongoose.disconnect();
})();
