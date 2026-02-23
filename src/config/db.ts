import mongoose from "mongoose";
import env from 'dotenv'
env.config()

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log("Database Connected",process.env.DATABASE_URL);

  } catch (error) {
    console.log("Database connection failed",process.env.DATABASE_URL);
    process.exit(1);
  }
};