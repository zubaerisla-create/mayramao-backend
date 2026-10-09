import { Schema, model, Document } from "mongoose";

export interface IRevenueCatWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  appUserId: string;
  productId?: string;
  receivedAt: Date;
  rawPayload?: any;
}

const revenueCatWebhookEventSchema = new Schema<IRevenueCatWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    appUserId: { type: String, default: "" },
    productId: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
    rawPayload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const RevenueCatWebhookEvent = model<IRevenueCatWebhookEvent>(
  "RevenueCatWebhookEvent",
  revenueCatWebhookEventSchema
);
