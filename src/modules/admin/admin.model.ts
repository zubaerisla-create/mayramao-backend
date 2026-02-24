import { Schema, model, Document } from "mongoose";

export interface IAdmin {
  email: string;
  password: string;
  role: "admin" | "superadmin";
  isActive: boolean;
}

export interface IAdminDocument extends IAdmin, Document {}

const adminSchema = new Schema<IAdminDocument>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Admin = model<IAdminDocument>("Admin", adminSchema);
