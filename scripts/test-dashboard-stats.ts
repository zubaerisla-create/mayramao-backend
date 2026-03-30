import mongoose from "mongoose";
import { AdminService } from "../src/modules/admin/admin.service";
import dotenv from "dotenv";

dotenv.config();

const testDashboardStats = async () => {
  try {
    const dbUri = process.env.DATABASE_URL || process.env.MONGO_URI || "mongodb://localhost:27017/mayramao";
    await mongoose.connect(dbUri);
    console.log("Connected to database");

    const stats = await AdminService.getDashboardStats();
    console.log("Dashboard Stats Result:");
    console.log(JSON.stringify(stats, null, 2));

    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error testing dashboard stats:", error);
    process.exit(1);
  }
};

testDashboardStats();
