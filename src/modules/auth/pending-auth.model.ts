import { Schema, model, Document } from "mongoose";

export interface IPendingAuth extends Document {
  name: string;
  email: string;
  password: string;
  otp: string;
  otpExpires: Date;
  createdAt: Date;
}

const pendingAuthSchema = new Schema<IPendingAuth>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete expired pending records after 15 minutes
pendingAuthSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export const PendingAuth = model<IPendingAuth>("PendingAuth", pendingAuthSchema);
