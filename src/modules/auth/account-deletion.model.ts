import { Schema, model, Document } from "mongoose";

export interface IAccountDeletion extends Document {
  email: string;
  otp: string;
  otpExpires: Date;
  createdAt: Date;
}

const accountDeletionSchema = new Schema<IAccountDeletion>(
  {
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete expired records after 10 minutes
accountDeletionSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export const AccountDeletion = model<IAccountDeletion>("AccountDeletion", accountDeletionSchema);
