import bcrypt from "bcrypt";
import { Admin } from "./admin.model";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwtToken";

// for admin user management
import { Auth } from "../auth/auth.model";
import { UserProfile } from "../user/user.model";
import { Types } from "mongoose";

const adminLogin = async (email: string, password: string) => {
  // Validate input
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Find admin by email
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error("Invalid email or password");
  }

  // Check if admin is active
  if (!admin.isActive) {
    throw new Error("Admin account is inactive");
  }

  // Compare passwords
  const isPasswordMatch = await bcrypt.compare(password, admin.password);
  if (!isPasswordMatch) {
    throw new Error("Invalid email or password");
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
  });

  const refreshToken = generateRefreshToken({
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
  });

  return {
    admin: {
      id: admin._id,
      email: admin.email,
      role: admin.role,
    },
    accessToken,
    refreshToken,
  };
};

const createAdmin = async (email: string, password: string, role: "admin" | "superadmin" = "admin") => {
  // Validate input
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    throw new Error("Admin with this email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin
  const admin = new Admin({
    email,
    password: hashedPassword,
    role,
    isActive: true,
  });

  await admin.save();

  return {
    id: admin._id,
    email: admin.email,
    role: admin.role,
  };
};

const getAdminById = async (adminId: string) => {
  const admin = await Admin.findById(adminId).select("-password");
  if (!admin) {
    throw new Error("Admin not found");
  }
  return admin;
};

const updateAdmin = async (adminId: string, updates: { email?: string; password?: string; isActive?: boolean }) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new Error("Admin not found");
  }

  if (updates.email) {
    admin.email = updates.email;
  }

  if (updates.password) {
    admin.password = await bcrypt.hash(updates.password, 10);
  }

  if (typeof updates.isActive === "boolean") {
    admin.isActive = updates.isActive;
  }

  await admin.save();

  return {
    id: admin._id,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
  };
};

// password reset helpers (reuse PasswordReset model)
import { PasswordReset } from "../auth/password-reset.model";
import { generateOTP } from "../../utils/generateOTP";
import { sendOTPEmail } from "../../config/mailer";

const forgotPassword = async (email: string) => {
  const admin = await Admin.findOne({ email });
  if (!admin) throw new Error("Admin not found");

  await PasswordReset.deleteOne({ email });
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await PasswordReset.create({ email, otp, otpExpires });
  sendOTPEmail(email, otp).catch((err) => console.error(err));
  return { message: "Password reset OTP sent to admin email" };
};

const resendOTP = async (email: string) => {
  const record = await PasswordReset.findOne({ email });
  if (!record) {
    // if no existing reset request, treat as forgot-password
    return forgotPassword(email);
  }

  const newOTP = generateOTP();
  const newExpires = new Date(Date.now() + 10 * 60 * 1000);
  await PasswordReset.findOneAndUpdate({ email }, { otp: newOTP, otpExpires: newExpires });
  sendOTPEmail(email, newOTP).catch((err) => console.error(err));
  return { message: "New OTP sent to admin email" };
};

const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const record = await PasswordReset.findOne({ email });
  if (!record) throw new Error("Password reset request not found");
  if (record.otp !== otp) throw new Error("Invalid OTP");
  if (record.otpExpires < new Date()) throw new Error("OTP expired");

  const hashed = await bcrypt.hash(newPassword, 10);
  await Admin.findOneAndUpdate({ email }, { password: hashed });
  await PasswordReset.deleteOne({ email });
  return { message: "Password reset successfully" };
};


// ---------------------------------------------------------------------------
// functions used by the /admin/users routes
// ---------------------------------------------------------------------------

const getAllUsers = async () => {
  // fetch all auth records without passwords
  const users = await Auth.find().select("-password").lean();

  // gather profiles in a single query
  const ids = users.map((u) => u._id);
  const profiles = await UserProfile.find({ userId: { $in: ids } }).lean();
  const profileMap: Record<string, any> = {};
  profiles.forEach((p) => {
    profileMap[p.userId.toString()] = p;
  });

  return users.map((u) => ({ ...u, profile: profileMap[u._id.toString()] || null }));
};

const getUserById = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }
  const user = await Auth.findById(userId).select("-password").lean();
  if (!user) {
    throw new Error("User not found");
  }
  const profile = await UserProfile.findOne({ userId }).lean();
  return { ...user, profile: profile || null };
};

const updateUser = async (userId: string, updates: { isActive?: boolean }) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }
  const user = await Auth.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (typeof updates.isActive !== 'undefined') {
    user.isActive = updates.isActive;
  }
  await user.save();
  return { id: user._id, email: user.email, isActive: user.isActive };
};

// ---------------------------------------------------------------------------
// subscription related utilities for admins
// ---------------------------------------------------------------------------

const extendUserSubscription = async (userId: string, extraDays: number) => {
  if (typeof extraDays !== 'number' || extraDays <= 0) {
    throw new Error("`extraDays` must be a positive number");
  }

  const profile = await UserProfile.findOne({ userId });
  if (!profile) throw new Error("User profile not found");
  if (!profile.subscription || !profile.subscription.isActive) {
    throw new Error("User does not have an active subscription");
  }

  // if there is a Stripe subscription, update its trial_end to push out
  // the next invoice by `extraDays` days (free extension)
  if (profile.subscription.stripeSubscriptionId) {
    const stripe = await import("../../config/stripe").then((m) => m.default);
    const currentExpiry = profile.subscription.expiresAt || new Date();
    const anchor = Math.floor(currentExpiry.getTime() / 1000);
    const newTrialEnd = anchor + extraDays * 24 * 60 * 60;
    await stripe.subscriptions.update(profile.subscription.stripeSubscriptionId, {
      trial_end: newTrialEnd,
      proration_behavior: 'none',
    });
  }

  const now = new Date();
  let currentExpiry = profile.subscription.expiresAt || now;
  if (currentExpiry < now) currentExpiry = now;
  const newExpiry = new Date(currentExpiry.getTime() + extraDays * 24 * 60 * 60 * 1000);
  profile.subscription.expiresAt = newExpiry;
  await profile.save();
  return profile.subscription;
};

const downgradeUserSubscription = async (userId: string) => {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) throw new Error("User profile not found");

  // if a Stripe subscription exists, cancel it immediately
  if (profile.subscription?.stripeSubscriptionId) {
    const stripe = await import("../../config/stripe").then((m) => m.default);
    try {
      await stripe.subscriptions.del(profile.subscription.stripeSubscriptionId);
    } catch (err) {
      console.warn("Failed to cancel Stripe subscription during downgrade", err);
    }
  }

  // clear subscription details and mark inactive
  profile.subscription = {
    planId: null,
    planName: "",
    startedAt: null,
    expiresAt: null,
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    stripePriceId: "",
    stripePaymentIntentId: "",
    stripeChargeId: "",
    isActive: false,
  } as any;
  // also reset top-level planName so UI shows free
  profile.planName = "";
  await profile.save();
  return profile.subscription;
};

const cancelUserSubscription = async (userId: string) => {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) throw new Error("User profile not found");
  if (!profile.subscription || !profile.subscription.isActive) {
    throw new Error("User does not have an active subscription");
  }

  if (profile.subscription.stripeSubscriptionId) {
    const stripe = await import("../../config/stripe").then((m) => m.default);
    // cancel immediately
    try {
      await stripe.subscriptions.del(profile.subscription.stripeSubscriptionId, {
        invoice_now: false,
        prorate: false,
      });
    } catch (err) {
      console.warn("Failed to cancel Stripe subscription", err);
    }
  }

  profile.subscription.expiresAt = new Date();
  profile.subscription.isActive = false;
  await profile.save();
  return profile.subscription;
};

// ---------------------------------------------------------------------------
// functions used by superadmin for admin management
// ---------------------------------------------------------------------------

const getAllAdmins = async () => {
  const admins = await Admin.find().select("-password").lean();
  return admins;
};

// allow an admin to update their own password
const changePassword = async (
  adminId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error("All password fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation do not match");
  }

  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new Error("Admin not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();
  return { message: "Password updated successfully" };
};

export const AdminService = {
  adminLogin,
  createAdmin,
  getAdminById,
  updateAdmin,
  forgotPassword,
  resendOTP,
  resetPassword,

  // user management
  getAllUsers,
  getUserById,
  updateUser,

  // subscription control (admin only)
  extendUserSubscription,
  downgradeUserSubscription,
  cancelUserSubscription,

  // superadmin admin management
  getAllAdmins,

  // password change
  changePassword,
};
