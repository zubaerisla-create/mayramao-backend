import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const register = async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);
  res.status(201).json({ success: true, ...result });
};

const verify = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await AuthService.verifyOTP(email, otp);
  res.status(200).json({ success: true, ...result });
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.loginUser(email, password);
  res.status(200).json({ success: true, ...result });
};

const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, message: "Refresh token required" });
    return;
  }
  const result = await AuthService.refreshAccessToken(refreshToken);
  res.status(200).json({ success: true, ...result });
};

const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }
  const result = await AuthService.resendOTP(email);
  res.status(200).json({ success: true, ...result });
};

const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }
  const result = await AuthService.forgotPassword(email);
  res.status(200).json({ success: true, ...result });
};

const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    return;
  }
  const result = await AuthService.resetPassword(email, otp, newPassword);
  res.status(200).json({ success: true, ...result });
};

const requestAccountDeletion = async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: "Request body is required" });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const result = await AuthService.requestAccountDeletion(email);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("requestAccountDeletion error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const confirmAccountDeletion = async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: "Request body is required" });
    }
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }
    const result = await AuthService.confirmAccountDeletion(email, otp);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("confirmAccountDeletion error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: "Request body is required" });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Current password, new password, and confirm password are required" });
    }
    
    // Extract userId from authenticated request - using the AuthRequest from middleware
    const authReq = req as any;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    
    const result = await AuthService.changePassword(userId, currentPassword, newPassword, confirmPassword);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("changePassword error:", error);
    res.status(400).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const AuthController = { register, verify, login, refreshToken, resendOTP, forgotPassword, resetPassword, requestAccountDeletion, confirmAccountDeletion, changePassword };