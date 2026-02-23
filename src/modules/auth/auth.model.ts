import { Schema, model, Document } from "mongoose";

export interface IAuth {
  name: string;
  email: string;
  password: string;
  verified: boolean;
}

// Document interface extends Mongoose Document
export interface IAuthDocument extends IAuth, Document {}

const authSchema = new Schema<IAuthDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: true }, // Always true after OTP verification
});

export const Auth = model<IAuthDocument>("Auth", authSchema);