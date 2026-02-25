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

// allow superadmin to change admin status
const updateAdmin = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates: any = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, message: "Admin ID is required" });
    }
    // only allow certain fields
    const allowed: any = {};
    if (typeof updates.email !== 'undefined') allowed.email = String(updates.email);
    if (typeof updates.password !== 'undefined') allowed.password = String(updates.password);
    if (typeof updates.isActive !== 'undefined') allowed.isActive = Boolean(updates.isActive);
    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    const admin = await AdminService.updateAdmin(id, allowed);
    res.status(200).json({ success: true, admin });
  } catch (error: any) {
    console.error("Update admin error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update admin" });
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

const updateUser = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    if (typeof isActive === 'undefined') {
      return res.status(400).json({ success: false, message: "isActive field required" });
    }
    const user = await AdminService.updateUser(id, { isActive: Boolean(isActive) });
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update user" });
  }
};

// admin subscription management helpers
const extendUserSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { extraDays } = req.body || {};
    if (!userId || typeof extraDays !== 'number') {
      return res.status(400).json({ success: false, message: "User ID and positive extraDays number are required" });
    }
    const subscription = await AdminService.extendUserSubscription(userId, extraDays);
    res.status(200).json({ success: true, subscription });
  } catch (error: any) {
    console.error("Extend subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to extend subscription" });
  }
};

const downgradeUserSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const subscription = await AdminService.downgradeUserSubscription(userId);
    res.status(200).json({ success: true, subscription });
  } catch (error: any) {
    console.error("Downgrade subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to downgrade subscription" });
  }
};

const cancelUserSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const subscription = await AdminService.cancelUserSubscription(userId);
    res.status(200).json({ success: true, subscription });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to cancel subscription" });
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
  updateUser,
  extendUserSubscription,
  downgradeUserSubscription,
  cancelUserSubscription,

  // superadmin admin management
  getAllAdmins,
  getAdminInfo,
  updateAdmin,

  // password updates
  changePassword,

  forgotPassword,
  resendOTP,
  resetPassword,
};
