import { Schema, model, Document } from "mongoose";

export interface ISubscription {
  planName: string;
  planType: string; // e.g. "monthly", "yearly" etc.
  price: number;
  duration: number; // in days
  simulationsLimit: number;
  simulationsUnlimited?: boolean;
  features: string[];
  isActive: boolean;
  activePlan?: boolean; // whether this plan is currently selected/active
}

export interface ISubscriptionDocument extends ISubscription, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    planName: { type: String, required: true, unique: true },
    planType: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true },
    simulationsLimit: { type: Number, required: true },
    simulationsUnlimited: { type: Boolean, default: false },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    activePlan: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Subscription = model<ISubscriptionDocument>("Subscription", subscriptionSchema);
