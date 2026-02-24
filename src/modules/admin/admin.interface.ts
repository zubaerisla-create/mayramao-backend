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

// When admin fetches users the API returns profile data
export interface IUserWithProfile {
  _id: string;
  name: string;
  email: string;
  verified: boolean;
  profile?: any | null;
}

// basic admin info returned to callers (never includes password)
export interface IAdminDetails {
  _id: string;
  email: string;
  role: "admin" | "superadmin";
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
