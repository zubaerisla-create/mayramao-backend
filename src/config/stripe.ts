import Stripe from 'stripe';
import env from 'dotenv';

env.config();

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_initialization_key';
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY is not defined in environment. Stripe features will run in sandbox mode.');
}

// stripe instance used throughout the app
const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15',
});

export default stripe;
