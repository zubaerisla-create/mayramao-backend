import { Schema, model, Document } from "mongoose";
import { IAuth } from "./auth.interface";

// Document interface extends Mongoose Document
export interface IAuthDocument extends IAuth, Document {}

const authSchema = new Schema<IAuthDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: true }, // Always true after OTP verification
  isActive: { type: Boolean, default: true },
});

export const Auth = model<IAuthDocument>("Auth", authSchema);