export interface IAuth {
  name: string;
  email: string;
  password: string;
  otp?: string;
  otpExpires?: Date;
  verified: boolean;
  // account status (can be toggled by admin)
  isActive?: boolean;
}

