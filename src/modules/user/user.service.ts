import { UserProfile } from "./user.model";

import { Auth } from "../auth/auth.model";
import { Types } from "mongoose";
import { IUserProfile } from "./user.interface";

const getProfile = async (userId: string) => {
  // ensure referenced user exists
  const user = await Auth.findById(userId).lean();
  if (!user) throw new Error("Referenced user not found");

  // Match whether userId was stored as a string or ObjectId
  const oid = new Types.ObjectId(userId);
  const profile = await UserProfile.findOne({ $or: [{ userId }, { userId: oid }] }).lean();
  return profile;
};

const upsertProfile = async (userId: string, data: Partial<IUserProfile>) => {
  // verify user exists before creating profile
  const user = await Auth.findById(userId).lean();
  if (!user) throw new Error("Referenced user not found");

  const oid = new Types.ObjectId(userId);
  const filter = { $or: [{ userId }, { userId: oid }] } as any;
  const update = { $set: data };
  const options = { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true } as any;
  console.log('upsertProfile update:', JSON.stringify(update), 'filter:', JSON.stringify(filter));
  const result = await UserProfile.findOneAndUpdate(filter, update, options);
  console.log('upsertProfile result:', JSON.stringify(result));
  return result;
};

const patchProfile = async (userId: string, data: Partial<IUserProfile>) => {
  // verify user exists before updating profile
  const user = await Auth.findById(userId).lean();
  if (!user) throw new Error("Referenced user not found");

  const oid = new Types.ObjectId(userId);
  const filter = { $or: [{ userId }, { userId: oid }] } as any;
  const set: any = {};

  // Personal info fields - including profileImage
  if (typeof data.fullName !== 'undefined') set['fullName'] = data.fullName;
  if (typeof data.email !== 'undefined') set['email'] = data.email;
  if (typeof data.dateOfBirth !== 'undefined') set['dateOfBirth'] = data.dateOfBirth;
  if (typeof data.gender !== 'undefined') set['gender'] = data.gender;
  if (typeof data.profileImage !== 'undefined') set['profileImage'] = data.profileImage; // ✅ Added this line

  // Top-level simple fields
  if (typeof data.monthlyIncome !== 'undefined') set['monthlyIncome'] = data.monthlyIncome;
  if (typeof data.existingLoans !== 'undefined') set['existingLoans'] = data.existingLoans;
  if (typeof data.fixedExpenses !== 'undefined') set['fixedExpenses'] = data.fixedExpenses;
  if (typeof data.variableExpenses !== 'undefined') set['variableExpenses'] = data.variableExpenses;
  if (typeof data.totalMonthlyLoanPayments !== 'undefined') set['totalMonthlyLoanPayments'] = data.totalMonthlyLoanPayments;
  if (typeof data.currentSavings !== 'undefined') set['currentSavings'] = data.currentSavings;
  if (typeof data.dependents !== 'undefined') set['dependents'] = data.dependents;
  if (typeof data.householdResponsibilityLevel !== 'undefined') set['householdResponsibilityLevel'] = data.householdResponsibilityLevel;
  if (typeof data.incomeStability !== 'undefined') set['incomeStability'] = data.incomeStability;
  if (typeof data.riskTolerance !== 'undefined') set['riskTolerance'] = data.riskTolerance;

  // Goal section fields
  if (typeof data.planName !== 'undefined') set['planName'] = data.planName;
  if (typeof data.targetAmount !== 'undefined') set['targetAmount'] = data.targetAmount;
  if (typeof data.targetDate !== 'undefined') set['targetDate'] = data.targetDate;
  if (typeof data.goalDescription !== 'undefined') set['goalDescription'] = data.goalDescription;

  // contact/support objects
  if (typeof data.contact !== 'undefined') set['contact'] = data.contact;

  // subscription object updates
  if (typeof (data as any).subscription !== 'undefined') {
    set['subscription'] = (data as any).subscription;
    // also sync top‑level planName when subscription updated
    if ((data as any).subscription?.planName) {
      set['planName'] = (data as any).subscription.planName;
    }
  }

  if (Object.keys(set).length === 0) {
    // nothing to update
    return await UserProfile.findOne({ userId });
  }

  const update = { $set: set };
  const options = { returnDocument: 'after' } as any;
  console.log('patchProfile update set:', JSON.stringify(set), 'filter:', JSON.stringify(filter));
  const result = await UserProfile.findOneAndUpdate(filter, update, options);
  console.log('patchProfile result:', JSON.stringify(result));
  return result;
};

export const UserService = { getProfile, upsertProfile, patchProfile };