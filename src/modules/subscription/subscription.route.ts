import express from "express";
import { SubscriptionController } from "./subscription.controller";
import { adminAuthMiddleware } from "../../middleware/adminAuthMiddleware";

const router = express.Router();

// public listing endpoints
router.get("/", SubscriptionController.listSubscriptions);
router.get("/:id", SubscriptionController.getSubscription);

// admin-only
router.post("/", adminAuthMiddleware, SubscriptionController.addSubscription);
router.put("/:id", adminAuthMiddleware, SubscriptionController.editSubscription);
router.delete("/:id", adminAuthMiddleware, SubscriptionController.removeSubscription);

export const SubscriptionRoutes = router;
