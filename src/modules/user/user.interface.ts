import { Types } from "mongoose";

export interface IUserProfile {
  userId: string | Types.ObjectId;
  email?: string;
  fullName?: string;
  profileImage?: string;
  dateOfBirth?: Date;
  gender?: string;
  monthlyIncome?: number;
  fixedExpenses?: number;
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
    startedAt?: Date;
    expiresAt?: Date;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    isActive?: boolean;
  };
 
} 