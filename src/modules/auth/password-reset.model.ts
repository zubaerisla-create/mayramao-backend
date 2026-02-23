import { Schema, model, Document } from "mongoose";

export interface IPasswordReset extends Document {
  email: string;
  otp: string;
  otpExpires: Date;
  createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete expired records after 15 minutes
passwordResetSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = model<IPasswordReset>("PasswordReset", passwordResetSchema);
