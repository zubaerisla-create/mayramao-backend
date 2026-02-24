import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { verifyRefreshToken } from "../../utils/jwtToken";
import { generateAccessToken } from "../../utils/jwtToken";

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await AdminService.adminLogin(email, password);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      ...result,
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const payload = verifyRefreshToken(token);

    const newAccessToken = generateAccessToken({
      id: payload.id,
      email: payload.email,
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

const getProfile = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const admin = await AdminService.getAdminById(adminId);

    res.status(200).json({
      success: true,
      admin,
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

// password reset flows
const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const result = await AdminService.forgotPassword(email);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("Admin forgot password error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const result = await AdminService.resendOTP(email);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("Admin resend OTP error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    const result = await AdminService.resetPassword(email, otp, newPassword);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("Admin reset password error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const AdminController = {
  login,
  refreshToken,
  getProfile,
  forgotPassword,
  resendOTP,
  resetPassword,
};
