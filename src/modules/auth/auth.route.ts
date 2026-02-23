import express from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/verify", AuthController.verify);
router.post("/resend-otp", AuthController.resendOTP);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/request-account-deletion", AuthController.requestAccountDeletion);
router.post("/confirm-account-deletion", AuthController.confirmAccountDeletion);
router.post("/change-password", authenticate, AuthController.changePassword);

export const AuthRoutes = router;