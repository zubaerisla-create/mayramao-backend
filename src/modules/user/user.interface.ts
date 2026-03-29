import { Types } from "mongoose";

export interface IUserProfile {
  userId: string | Types.ObjectId;
  email?: string;
  fullName?: string;
  profileImage?: string;
  dateOfBirth?: Date;
  gender?: string;
  monthlyIncome?: number;
  // breakdown of fixed monthly costs
  fixedExpenses?: {
    rent?: number;
    utilities?: number;
    subscriptionsInsurance?: number;
  };
  existingLoans?: number;
  totalMonthlyLoanPayments?: number;
  variableExpenses?: number;
  currentSavings?: number;
  dependents?: string[];
  householdResponsibilityLevel?: string;
  incomeStability?: string;
  riskTolerance?: string;
  planName?: string;
  targetAmount?: number;
  targetDate?: Date;
  goalDescription?: string;

  // purchase simulation information (for frontend calculator)
  purchaseSimulation?: {
    planName?: string;
    purchaseAmount?: number;
    paymentType?: "PayInFull" | "Financing";
    loanDuration?: number;       // months, only if Financing
    interestRate?: number;       // percent, only if Financing
  };

  // contact/support requests stored on profile
  contact?: {
    fullName?: string;
    email?: string;
    description?: string;
  };
  
  // subscription information (updated after purchase)
  subscription?: {
    planId?: string | Types.ObjectId;
    planName?: string;
    planType?: string;
    price?: number;
    duration?: number;
    simulationsLimit?: number;
    features?: string[];
    startedAt?: Date;
    expiresAt?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripePaymentIntentId?: string; // kept for legacy one‑time flows
    stripeChargeId?: string;
    isActive?: boolean;
  };
 
} 