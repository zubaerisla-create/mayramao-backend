import Stripe from 'stripe';
import env from 'dotenv';

env.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment');
}

// stripe instance used throughout the app
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

export default stripe;
