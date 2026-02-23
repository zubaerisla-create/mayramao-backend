import { Request, Response } from "express";
import { UserService } from "./user.service";
import { Types } from "mongoose";
import { AuthRequest } from "../../middleware/authMiddleware";
import { Auth } from "../auth/auth.model";

const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    // pick userId from token (preferred) or URL param
    const tokenId = req.user?.id;
    const paramId = req.params.userId;
    const rawId = tokenId || paramId;
    if (!rawId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid userId format" });
    }
    if (tokenId && tokenId !== id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const profile = await UserService.getProfile(id);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    console.error("getProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const saveProfile = async (req: AuthRequest, res: Response) => {
  try {
    console.log('saveProfile received body:', req.body);
    // user must be authenticated; take id from token to avoid spoofing
    const tokenId = req.user?.id;
    if (!tokenId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!Types.ObjectId.isValid(tokenId)) {
      return res.status(400).json({ success: false, message: "Invalid userId format" });
    }

    // if client still sends a userId in body ensure it matches token
    if (req.body && req.body.userId && req.body.userId !== tokenId) {
      return res.status(403).json({ success: false, message: 'Body userId must match authenticated user' });
    }

    const userId = tokenId;
    const data: any = { ...req.body };
    // If file uploaded, set profileImage to Cloudinary URL
    if (req.file && req.file.path) {
      data.profileImage = req.file.path;
    }
    delete data.userId;
    delete data.email; // email comes from Auth, not from body input

    // fetch the authenticated user to get their email
    const authUser = await Auth.findById(tokenId).lean();
    if (!authUser) {
      return res.status(404).json({ success: false, message: "User not found in Auth" });
    }
    data.email = authUser.email; // set email from authenticated user

    // validate and coerce numeric fields
    ['monthlyIncome','fixedExpenses','existingLoans','totalMonthlyLoanPayments','currentSavings','variableExpenses', 'targetAmount'].forEach(k => {
      if (typeof data[k] !== 'undefined') {
        const n = Number(data[k]);
        if (!Number.isFinite(n)) {
          throw new Error(`${k} must be a valid number`);
        }
        data[k] = n;
      }
    });

    // validate string fields
    if (typeof data.fullName !== 'undefined') {
      data.fullName = String(data.fullName).trim();
    }
    if (typeof data.gender !== 'undefined') {
      data.gender = String(data.gender).trim();
    }
    
    // validate date field
    if (typeof data.dateOfBirth !== 'undefined') {
      const date = new Date(data.dateOfBirth);
      if (isNaN(date.getTime())) {
        throw new Error('dateOfBirth must be a valid date');
      }
      data.dateOfBirth = date;
    }

    // validate target date
    if (typeof data.targetDate !== 'undefined') {
      const date = new Date(data.targetDate);
      if (isNaN(date.getTime())) {
        throw new Error('targetDate must be a valid date');
      }
      data.targetDate = date;
    }

    // add goal section
    if (typeof data.planName !== 'undefined') {
      data.planName = String(data.planName);
    }
    
    if (typeof data.goalDescription !== 'undefined') {
      data.goalDescription = String(data.goalDescription);
    }

    // if no fields provided we shouldn't silently upsert an empty document
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No profile fields provided' });
    }

    console.log('saveProfile sanitized data:', data);
    const profile = await UserService.upsertProfile(userId, data);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    console.error("saveProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const patchProfile = async (req: AuthRequest, res: Response) => {
  try {
    console.log('patchProfile received body:', req.body);
    // id from token takes precedence; optional param/body must match
    const tokenId = req.user?.id;
    const paramUserId = (req.params && req.params.userId) as string | undefined;
    const rawBodyId = ((req.body && req.body.userId) as string | string[] | undefined);
    const rawUserId = tokenId || paramUserId || rawBodyId;
    if (!rawUserId) return res.status(400).json({ success: false, message: "userId is required" });
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!(/^[0-9a-fA-F]{24}$/.test(userId))) {
      return res.status(400).json({ success: false, message: "Invalid userId format" });
    }
    if (tokenId && tokenId !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const allowed: any = {};
    const body = { ...req.body };
    // If file uploaded, set profileImage to Cloudinary URL
    if (req.file && req.file.path) {
      allowed.profileImage = req.file.path;
    }
    delete body.userId;
    delete body.email; // email comes from Auth, not from body input

    console.log('patchProfile body keys:', Object.keys(body), 'body:', JSON.stringify(body));

    // fetch the authenticated user to get their email
    const authUser = await Auth.findById(tokenId).lean();
    if (!authUser) {
      return res.status(404).json({ success: false, message: "User not found in Auth" });
    }
    allowed.email = authUser.email; // set email from authenticated user

    // helper to coerce to number and ensure it's valid
    const toNum = (val: any, field: string) => {
      const n = Number(val);
      if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
      return n;
    };

    

    // handle string fields: fullName, gender
    if (typeof body.fullName !== 'undefined') {
      console.log('setting fullName:', body.fullName);
      allowed.fullName = String(body.fullName).trim();
    }
    if (typeof body.gender !== 'undefined') {
      console.log('setting gender:', body.gender);
      allowed.gender = String(body.gender).trim();
    }
    if (typeof body.dateOfBirth !== 'undefined') {
      console.log('setting dateOfBirth:', body.dateOfBirth);
      const date = new Date(body.dateOfBirth);
      if (isNaN(date.getTime())) throw new Error('dateOfBirth must be a valid date');
      allowed.dateOfBirth = date;
    }

    // handle target date
    if (typeof body.targetDate !== 'undefined') {
      console.log('setting targetDate:', body.targetDate);
      const date = new Date(body.targetDate);
      if (isNaN(date.getTime())) throw new Error('targetDate must be a valid date');
      allowed.targetDate = date;
    }

    // accept top‑level numeric values
    if (typeof body.monthlyIncome !== 'undefined') {
      console.log('setting monthlyIncome:', body.monthlyIncome);
      allowed.monthlyIncome = toNum(body.monthlyIncome, 'monthlyIncome');
    }
    if (typeof body.fixedExpenses !== 'undefined') {
      console.log('setting fixedExpenses:', body.fixedExpenses);
      allowed.fixedExpenses = toNum(body.fixedExpenses, 'fixedExpenses');
    }
    if (typeof body.existingLoans !== 'undefined') {
      console.log('setting existingLoans:', body.existingLoans);
      allowed.existingLoans = toNum(body.existingLoans, 'existingLoans');
    }
    if (typeof body.totalMonthlyLoanPayments !== 'undefined') {
      console.log('setting totalMonthlyLoanPayments:', body.totalMonthlyLoanPayments);
      allowed.totalMonthlyLoanPayments = toNum(body.totalMonthlyLoanPayments, 'totalMonthlyLoanPayments');
    }
    if (typeof body.currentSavings !== 'undefined') {
      console.log('setting currentSavings:', body.currentSavings);
      allowed.currentSavings = toNum(body.currentSavings, 'currentSavings');
    }
    if (typeof body.variableExpenses !== 'undefined') {
      console.log('setting variableExpenses:', body.variableExpenses);
      allowed.variableExpenses = toNum(body.variableExpenses, 'variableExpenses');
    }
    if (typeof body.targetAmount !== 'undefined') {
      console.log('setting targetAmount:', body.targetAmount);
      allowed.targetAmount = toNum(body.targetAmount, 'targetAmount');
    }

    // handle string fields for goal section
    if (typeof body.planName !== 'undefined') {
      console.log('setting planName:', body.planName);
      allowed.planName = String(body.planName);
    }
    if (typeof body.goalDescription !== 'undefined') {
      console.log('setting goalDescription:', body.goalDescription);
      allowed.goalDescription = String(body.goalDescription);
    }

    console.log('patchProfile final allowed update:', allowed, 'tokenId:', tokenId, 'using userId:', userId);

    if (Object.keys(allowed).length === 0) {
      // nothing to change
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    const profile = await UserService.patchProfile(userId, allowed);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    console.error("patchProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const UserController = { getProfile, saveProfile, patchProfile };