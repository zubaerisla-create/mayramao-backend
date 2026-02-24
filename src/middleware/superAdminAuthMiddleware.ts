import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwtToken";
import { Admin } from "../modules/admin/admin.model";

export interface SuperAdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role?: string;
  };
}

// middleware that ensures caller is a valid admin and has role "superadmin"
export const superAdminAuthMiddleware = async (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // fetch admin to verify role and existence
    const admin = await Admin.findById(payload.id).lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }

    if (admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden: superadmin only" });
    }

    req.admin = { id: payload.id, email: payload.email, role: admin.role };
    next();
  } catch (error: any) {
    console.error("Super admin auth error:", error);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};