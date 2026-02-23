import { Types } from "mongoose";

export interface IGoal {
  userId: string | Types.ObjectId;
  planName: string;
  targetAmount: number;
  targetDate: Date;
  shortDescription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
