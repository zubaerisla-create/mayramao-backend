import { Schema, model, Document } from "mongoose";
import { IUserProfile } from "./user.interface";

export interface IUserProfileDocument extends IUserProfile, Document {}

const userProfileSchema = new Schema<IUserProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "Auth", unique: true },
    email: { type: String, default: "" },
    fullName: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: "" },
    monthlyIncome: { type: Number, default: 0 },
    fixedExpenses: { type: Number, default: 0 },
    variableExpenses: { type: Number, default: 0 },
    existingLoans: { type: Number, default: 0 },
    totalMonthlyLoanPayments: { type: Number, default: 0 },
    currentSavings: { type: Number, default: 0 },
    dependents: { type: [String], default: [] },
    householdResponsibilityLevel: { type: String, default: "" },
    incomeStability: { type: String, default: "" },
    riskTolerance: { type: String, default: "" },
  
    
    planName: { type: String, default: "" },
    targetAmount: { type: Number, default: 0 }, // Fixed: was String, now Number
    targetDate: { type: Date, default: null },
    goalDescription: { type: String, default: "" },

    // contact and support objects
    contact: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      description: { type: String, default: "" },
    },

    // subscription details (populated after successful purchase)
    subscription: {
      planId: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
      planName: { type: String, default: "" },
      startedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      stripePaymentIntentId: { type: String, default: "" },
      stripeChargeId: { type: String, default: "" },
      isActive: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const UserProfile = model<IUserProfileDocument>("UserProfile", userProfileSchema);