import { Schema, model, Document, Types } from "mongoose";

export interface IBusiness {
  userId: Types.ObjectId | string;
  name: string;
  description?: string;
  startDate: Date;
  openingBalance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBusinessDocument extends IBusiness, Document {}

const businessSchema = new Schema<IBusinessDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Auth", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    startDate: { type: Date, default: Date.now },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Business = model<IBusinessDocument>("Business", businessSchema);
