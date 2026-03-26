const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Subscription } = require('./src/modules/subscription/subscription.model');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    const subs = await Subscription.find();
    console.log('--- SUBSCRIPTION PLANS ---');
    console.log(JSON.stringify(subs, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
