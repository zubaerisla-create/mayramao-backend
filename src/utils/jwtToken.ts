import jwt from "jsonwebtoken";

export interface ITokenPayload {
  id: string;
  email: string;
}

export const generateAccessToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key", {
    expiresIn: "7d",
  });
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as ITokenPayload;
};

export const verifyRefreshToken = (token: string): ITokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key") as ITokenPayload;
};
