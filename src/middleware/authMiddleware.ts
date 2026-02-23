import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, ITokenPayload } from "../utils/jwtToken";

// extend Express Request with authenticated user info
export interface AuthRequest extends Request {
  user?: ITokenPayload;
}

export const authenticate = (
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
    req.user = payload;
    next();
  } catch (err: any) {
    console.error("authenticate middleware error", err);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};