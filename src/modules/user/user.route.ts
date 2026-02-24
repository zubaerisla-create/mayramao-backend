import express from "express";
import { UserController } from "./user.controller";
import { upload } from "../../config/cloudinary";
import { authenticate } from "../../middleware/authMiddleware";

const router = express.Router();

// all profile-related endpoints require a valid Bearer access token
router.get("/profile/:userId", authenticate, UserController.getProfile);

// Use multer middleware for profile image upload
router.post("/profile", authenticate, upload.single("profileImage"), UserController.saveProfile);
router.patch("/profile", authenticate, upload.single("profileImage"), UserController.patchProfile);
router.patch("/profile/:userId", authenticate, upload.single("profileImage"), UserController.patchProfile);

// endpoints for user to submit contact/support requests
router.post("/profile/contact", authenticate, UserController.submitContact);
router.post("/profile/support", authenticate, UserController.submitSupport);


export const UserRoutes = router;
