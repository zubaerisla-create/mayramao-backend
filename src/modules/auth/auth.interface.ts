export interface IAuth {
  name: string;
  email: string;
  password: string;
  otp?: string;
  otpExpires?: Date;
  verified: boolean;
}

