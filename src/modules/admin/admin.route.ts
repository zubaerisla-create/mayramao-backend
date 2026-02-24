import express from "express";
import { AdminController } from "./admin.controller";
import { adminAuthMiddleware } from "../../middleware/adminAuthMiddleware";


const router = express.Router();

// Public routes
router.post("/login", AdminController.login);
router.post("/refresh-token", AdminController.refreshToken);
router.post("/forgot-password", AdminController.forgotPassword);
router.post("/resend-otp", AdminController.resendOTP);
router.post("/reset-password", AdminController.resetPassword);

// Protected routes (require admin token)
router.get("/profile", adminAuthMiddleware, AdminController.getProfile);

export const AdminRoutes = router;
