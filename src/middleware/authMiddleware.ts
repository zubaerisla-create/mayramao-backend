import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, ITokenPayload } from "../utils/jwtToken";
import { Auth } from "../modules/auth/auth.model";

// extend Express Request with authenticated user info
export interface AuthRequest extends Request {
  user?: ITokenPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Missing or invalid Authorization header" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    // check if account is active
    if (payload && payload.id) {
      const user = await Auth.findById(payload.id).select("isActive");
      if (user && !user.isActive) {
        return res
          .status(403)
          .json({ success: false, message: "Account is blocked" });
      }
    }
    req.user = payload;
    next();
  } catch (err: any) {
    console.error("authenticate middleware error", err);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};