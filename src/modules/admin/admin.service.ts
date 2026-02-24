import bcrypt from "bcrypt";
import { Admin } from "./admin.model";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwtToken";

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
  });

  const refreshToken = generateRefreshToken({
    id: admin._id.toString(),
    email: admin.email,
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

export const AdminService = {
  adminLogin,
  createAdmin,
  getAdminById,
  updateAdmin,
  forgotPassword,
  resendOTP,
  resetPassword,
};
