import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { verifyRefreshToken } from "../../utils/jwtToken";
import { generateAccessToken } from "../../utils/jwtToken";

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role?: string;
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
      role: (payload as any).role,
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

// admin-facing user management
const getAllUsers = async (req: AdminRequest, res: Response) => {
  try {
    const users = await AdminService.getAllUsers();
    res.status(200).json({ success: true, users });
  } catch (error: any) {
    console.error("Get all users error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch users" });
  }
};

// superadmin-facing admin management
const getAllAdmins = async (req: AdminRequest, res: Response) => {
  try {
    const admins = await AdminService.getAllAdmins();
    res.status(200).json({ success: true, admins });
  } catch (error: any) {
    console.error("Get all admins error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch admins" });
  }
};

const getAdminInfo = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ success: false, message: "Admin ID is required" });
    }
    const admin = await AdminService.getAdminById(id);
    res.status(200).json({ success: true, admin });
  } catch (error: any) {
    console.error("Get admin by ID error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch admin" });
  }
};

const getUserById = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const user = await AdminService.getUserById(id);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error("Get user by ID error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch user" });
  }
};

// allow admin to change own password
const changePassword = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ensure body exists before destructuring
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const result = await AdminService.changePassword(adminId, currentPassword, newPassword, confirmPassword);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("Admin change password error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to change password" });
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

  // user management
  getAllUsers,
  getUserById,

  // superadmin admin management
  getAllAdmins,
  getAdminInfo,

  // password updates
  changePassword,

  forgotPassword,
  resendOTP,
  resetPassword,
};
