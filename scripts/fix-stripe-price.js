const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const collection = db.collection('subscriptions'); // Matches 'Subscription' model name -> plural 'subscriptions'
    
    console.log('Searching for plan with planName: "Pro"...');
    
    // Check for "Pro" or "Pro Plan" (case insensitive)
    const result = await collection.updateOne(
      { planName: { $regex: /^pro$/i } },
      { $set: { stripePriceId: 'price_1TF1F9IB2fwnFU2PoeE0T2Og' } }
    );
    
    if (result.matchedCount > 0) {
      console.log('Success! Linked "Pro" plan to Stripe Price ID: price_1TF1F9IB2fwnFU2PoeE0T2Og');
    } else {
      console.log('Plan "Pro" not found. Looking for any plans...');
      const allPlans = await collection.find({}).toArray();
      console.log('Current plans:', JSON.stringify(allPlans, null, 2));
    }
    
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
