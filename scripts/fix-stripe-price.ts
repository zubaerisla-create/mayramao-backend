import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  try {
    await mongoose.connect(DATABASE_URL);
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB connection failed');

    // The user's example says "db.plans.updateOne", but our model is "Subscription".
    // Mongoose pluralizes "Subscription" to "subscriptions".
    // We also check for "planName" (our schema) and "name" (user's schema example).
    
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Attempt multiple collection names and field names for robustness
    const collectionNames = ['subscriptions', 'plans'];
    const fieldNames = ['planName', 'name'];
    const stripePriceId = 'price_1TF1F9IB2fwnFU2PoeE0T2Og';

    for (const collName of collectionNames) {
      const collection = db.collection(collName);
      
      for (const field of fieldNames) {
        console.log(`Checking collection "${collName}" with field "${field}"...`);
        const query: any = {};
        query[field] = { $regex: /^pro$/i };
        
        const result = await collection.updateOne(
          query,
          { $set: { stripePriceId: stripePriceId } }
        );

        if (result.matchedCount > 0) {
          console.log(`SUCCESS: Linked "Pro" in collection "${collName}" via field "${field}" to Stripe Price ID: ${stripePriceId}`);
          process.exit(0);
        }
      }
    }

    console.log('Plan "Pro" not found in known collections/fields.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
