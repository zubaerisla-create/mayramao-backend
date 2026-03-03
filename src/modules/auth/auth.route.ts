import express from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { catchAsync } from "../../utils/catchAsync";

const router = express.Router();

router.post("/register", catchAsync(AuthController.register));
router.post("/verify", catchAsync(AuthController.verify));
router.post("/resend-otp", catchAsync(AuthController.resendOTP));
router.post("/login", catchAsync(AuthController.login));
router.post("/google", catchAsync(AuthController.googleAuth));
router.post("/refresh-token", catchAsync(AuthController.refreshToken));
router.post("/forgot-password", catchAsync(AuthController.forgotPassword));
router.post("/reset-password", catchAsync(AuthController.resetPassword));
router.post("/request-account-deletion", catchAsync(AuthController.requestAccountDeletion));
router.post("/confirm-account-deletion", catchAsync(AuthController.confirmAccountDeletion));
router.post("/change-password", authenticate, catchAsync(AuthController.changePassword));

export const AuthRoutes = router;