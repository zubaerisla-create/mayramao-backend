import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwtToken";

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

export const adminAuthMiddleware = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    const payload = verifyAccessToken(token);

    // Attach admin info to request
    req.admin = {
      id: payload.id,
      email: payload.email,
    };

    next();
  } catch (error: any) {
    console.error("Admin auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
