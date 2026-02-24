export interface IAdminInterface {
  email: string;
  password: string;
  role: "admin" | "superadmin";
  isActive: boolean;
}

export interface IAdminLoginResponse {
  admin: {
    id: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}
