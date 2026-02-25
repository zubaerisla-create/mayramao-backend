import express from "express";
import { SubscriptionController } from "./subscription.controller";
import { adminAuthMiddleware } from "../../middleware/adminAuthMiddleware";
import { authenticate } from "../../middleware/authMiddleware";

const router = express.Router();

// public listing endpoints
router.get("/", SubscriptionController.listSubscriptions);
router.get("/:id", SubscriptionController.getSubscription);

// client purchase endpoints
router.post("/purchase", authenticate, SubscriptionController.purchaseSubscription);
router.get("/stripe-key", SubscriptionController.getStripeKey);


// admin-only
router.post("/", adminAuthMiddleware, SubscriptionController.addSubscription);
router.put("/:id", adminAuthMiddleware, SubscriptionController.editSubscription);
router.delete("/:id", adminAuthMiddleware, SubscriptionController.removeSubscription);

export const SubscriptionRoutes = router;
