import { Schema, model, Document, Types } from "mongoose";

export type TransactionType = "INVESTMENT" | "PROFIT" | "SELL" | "SALE" | "EXPENSE" | "WITHDRAWAL";

export interface IInvestmentTransaction {
  userId: Types.ObjectId | string;
  businessId: Types.ObjectId | string;
  type: TransactionType;
  name: string;
  amount: number;
  note?: string;
  transactionDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvestmentTransactionDocument extends IInvestmentTransaction, Document {}

const investmentTransactionSchema = new Schema<IInvestmentTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Auth", required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    type: {
      type: String,
      enum: ["INVESTMENT", "PROFIT", "SELL", "SALE", "EXPENSE", "WITHDRAWAL"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, default: "", trim: true },
    transactionDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const InvestmentTransaction = model<IInvestmentTransactionDocument>(
  "InvestmentTransaction",
  investmentTransactionSchema
);
