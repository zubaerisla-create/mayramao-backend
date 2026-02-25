import { Auth } from "./auth.model";
import { PendingAuth } from "./pending-auth.model";
import { PasswordReset } from "./password-reset.model";
import { AccountDeletion } from "./account-deletion.model";
import { UserProfile } from "../user/user.model";
import { generateOTP } from "../../utils/generateOTP";
import { sendOTPEmail } from "../../config/mailer";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwtToken";
import bcrypt from "bcrypt";
import { IAuth } from "./auth.interface";

// google auth (requires npm package `google-auth-library`)
import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerUser = async (payload: IAuth) => {
  const existingUser = await Auth.findOne({ email: payload.email });
  if (existingUser) throw new Error("Email already registered");
  
  // Check if pending registration exists
  const pendingUser = await PendingAuth.findOne({ email: payload.email });
  if (pendingUser) {
    await PendingAuth.deleteOne({ email: payload.email });
  }
  
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  
  // Hash password before storing
  const hashedPassword = await bcrypt.hash(payload.password, 10);
  
  // Store in pending collection (not created in main Auth yet)
  const pendingData = await PendingAuth.create({
    ...payload,
    password: hashedPassword,
    otp,
    otpExpires,
  });
  
  // Send email asynchronously (don't wait for it)
  sendOTPEmail(pendingData.email, otp).catch((err) => {
    console.error("Failed to send OTP email:", err);
  });
  
  return { message: "OTP sent to your email. Check your inbox." };
};

const verifyOTP = async (email: string, otp: string) => {
  const pendingUser = await PendingAuth.findOne({ email });
  if (!pendingUser) throw new Error("User not found. Please register first");
  
  if (pendingUser.otp !== otp) throw new Error("Invalid OTP");
  if (pendingUser.otpExpires < new Date()) throw new Error("OTP expired");

  // Create user in main Auth collection
  const user = await Auth.create({
    name: pendingUser.name,
    email: pendingUser.email,
    password: pendingUser.password,
    verified: true,
  });
  
  // Delete from pending collection
  await PendingAuth.deleteOne({ email });

  return { message: "Verified successfully", user };
};

const loginUser = async (email: string, password: string) => {
  const user = await Auth.findOne({ email });
  if (!user) throw new Error("User not found");
  if (!user.verified) throw new Error("Please verify your email first");
  if (user.isActive === false) throw new Error("Account is blocked");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Incorrect password");

  // Generate tokens
  const accessToken = generateAccessToken({
    id: user._id.toString(),
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    email: user.email,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

// login/register with Google ID token
const googleLogin = async (idToken: string) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google client ID not configured");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token payload");
  }

  let user = await Auth.findOne({ email: payload.email });
  if (!user) {
    // create new user with no password (login only via Google)
    user = await Auth.create({
      name: payload.name || "",
      email: payload.email,
      password: "", // blank placeholder
      verified: true,
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    id: user._id.toString(),
    email: user.email,
  });
  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    email: user.email,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (refreshToken: string) => {
  const decoded = verifyRefreshToken(refreshToken);
  
  const user = await Auth.findById(decoded.id);
  if (!user) throw new Error("User not found");

  const newAccessToken = generateAccessToken({
    id: user._id.toString(),
    email: user.email,
  });

  return { accessToken: newAccessToken };
};

const resendOTP = async (email: string) => {
  // Check if email exists in pending auth collection
  const pendingUser = await PendingAuth.findOne({ email });
  if (!pendingUser) {
    // Check if user already verified
    const verifiedUser = await Auth.findOne({ email });
    if (verifiedUser) throw new Error("User already verified. Please login or use forgot-password");
    throw new Error("User not found. Please register first");
  }

  const newOTP = generateOTP();
  const newOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Update OTP and expiry
  await PendingAuth.findByIdAndUpdate(pendingUser._id, {
    otp: newOTP,
    otpExpires: newOTPExpires,
  });

  // Send email asynchronously
  sendOTPEmail(email, newOTP).catch((err) => {
    console.error("Failed to send OTP email:", err);
  });

  return { message: "New OTP sent to your email" };
};

const forgotPassword = async (email: string) => {
  const user = await Auth.findOne({ email });
  if (!user) throw new Error("User not found");

  // Delete existing password reset records
  await PasswordReset.deleteOne({ email });

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Create password reset record
  await PasswordReset.create({
    email,
    otp,
    otpExpires,
  });

  // Send email asynchronously
  sendOTPEmail(email, otp).catch((err) => {
    console.error("Failed to send OTP email:", err);
  });

  return { message: "Password reset OTP sent to your email" };
};

const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const resetRecord = await PasswordReset.findOne({ email });
  if (!resetRecord) throw new Error("Password reset request not found. Please try again");

  if (resetRecord.otp !== otp) throw new Error("Invalid OTP");
  if (resetRecord.otpExpires < new Date()) throw new Error("OTP expired");

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await Auth.findOneAndUpdate({ email }, { password: hashedPassword });

  // Delete password reset record
  await PasswordReset.deleteOne({ email });

  return { message: "Password reset successfully" };
};

const requestAccountDeletion = async (email: string) => {
  const user = await Auth.findOne({ email });
  if (!user) throw new Error("User not found");

  // Delete existing deletion requests
  await AccountDeletion.deleteOne({ email });

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Create account deletion request
  await AccountDeletion.create({
    email,
    otp,
    otpExpires,
  });

  // Send email asynchronously
  sendOTPEmail(email, otp).catch((err) => {
    console.error("Failed to send OTP email:", err);
  });

  return { message: "Account deletion OTP sent to your email. Please verify to confirm deletion." };
};

const confirmAccountDeletion = async (email: string, otp: string) => {
  const deletionRecord = await AccountDeletion.findOne({ email });
  if (!deletionRecord) throw new Error("Account deletion request not found. Please try again");

  if (deletionRecord.otp !== otp) throw new Error("Invalid OTP");
  if (deletionRecord.otpExpires < new Date()) throw new Error("OTP expired");

  // Find the user to get their ID for profile deletion
  const user = await Auth.findOne({ email });
  if (!user) throw new Error("User not found");

  // Delete user profile first (if exists)
  await UserProfile.deleteOne({ userId: user._id });

  // Delete the user account
  await Auth.deleteOne({ email });

  // Delete the deletion request record
  await AccountDeletion.deleteOne({ email });

  return { message: "Account deleted successfully" };
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string, confirmPassword: string) => {
  // Verify passwords match
  if (newPassword !== confirmPassword) throw new Error("New password and confirm password do not match");
  
  // Ensure new password is different from current
  if (currentPassword === newPassword) throw new Error("New password must be different from current password");

  // Find user
  const user = await Auth.findById(userId);
  if (!user) throw new Error("User not found");

  // Verify current password
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw new Error("Current password is incorrect");

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await Auth.findByIdAndUpdate(userId, { password: hashedPassword });

  return { message: "Password changed successfully" };
};

export const AuthService = { registerUser, verifyOTP, loginUser, googleLogin, refreshAccessToken, resendOTP, forgotPassword, resetPassword, requestAccountDeletion, confirmAccountDeletion, changePassword };