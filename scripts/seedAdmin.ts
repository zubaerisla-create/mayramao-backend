import mongoose from "mongoose";
import { Admin } from "../src/modules/admin/admin.model";
import { AdminService } from "../src/modules/admin/admin.service";
import dotenv from "dotenv";

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to database
    const dbUri = process.env.DATABASE_URL || process.env.MONGO_URI || "mongodb://localhost:27017/mayramao";
    await mongoose.connect(dbUri);
    console.log("Connected to database");

    // Default admin credentials (can provide multiple via env)
    const admins: { email: string; password: string; role?: string }[] = [];
    const primaryEmail = process.env.ADMIN_EMAIL || "admin@mayramao.com";
    const primaryPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
    admins.push({ email: primaryEmail, password: primaryPassword, role: "superadmin" });

    // optional second admin through env var ADMIN_EMAIL_2 and ADMIN_PASSWORD_2
    if (process.env.ADMIN_EMAIL_2 && process.env.ADMIN_PASSWORD_2) {
      admins.push({
        email: process.env.ADMIN_EMAIL_2,
        password: process.env.ADMIN_PASSWORD_2,
        role: "superadmin",
      });
    }

    for (const { email, password, role } of admins) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        console.log(`Admin with email ${email} already exists`);
        continue;
      }
      const admin = await AdminService.createAdmin(email, password, role as any);
      console.log("Admin created successfully:", admin);
    }

    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
