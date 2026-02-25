import express from "express";
import { AdminController } from "./admin.controller";
import { adminAuthMiddleware } from "../../middleware/adminAuthMiddleware";
import { superAdminAuthMiddleware } from "../../middleware/superAdminAuthMiddleware";


const router = express.Router();

// Public routes
router.post("/login", AdminController.login);
router.post("/refresh-token", AdminController.refreshToken);
router.post("/forgot-password", AdminController.forgotPassword);  
router.post("/resend-otp", AdminController.resendOTP);
router.post("/reset-password", AdminController.resetPassword);

// Protected routes (require admin token)
router.get("/profile", adminAuthMiddleware, AdminController.getProfile);

// admin user management
router.get("/users", adminAuthMiddleware, AdminController.getAllUsers);
router.get("/users/:id", adminAuthMiddleware, AdminController.getUserById);

// admin subscription management for individual users
router.put(
  "/users/:id/subscription/extend",
  adminAuthMiddleware,
  AdminController.extendUserSubscription
);
router.put(
  "/users/:id/subscription/downgrade",
  adminAuthMiddleware,
  AdminController.downgradeUserSubscription
);
router.put(
  "/users/:id/subscription/cancel",
  adminAuthMiddleware,
  AdminController.cancelUserSubscription
);

// admin profile updates
router.put("/change-password", adminAuthMiddleware, AdminController.changePassword);

// superadmin admin management
router.get("/admins", superAdminAuthMiddleware, AdminController.getAllAdmins);
router.get("/admins/:id", superAdminAuthMiddleware, AdminController.getAdminInfo);

export const AdminRoutes = router;
