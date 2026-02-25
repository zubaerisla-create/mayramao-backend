import { Request, Response } from "express";
import { SubscriptionService } from "./subscription.service";
import { AdminRequest } from "../admin/admin.controller"; // reuse interface

// add a new subscription plan (admin only)
const addSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const { planName, planType, price, duration, simulationsUnlimited, simulationsLimit, features, activePlan } = req.body || {};
    if (!planName || !planType || price == null || duration == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    if (!simulationsUnlimited && (simulationsLimit == null)) {
      return res.status(400).json({ success: false, message: "Must specify simulationsLimit or set simulationsUnlimited true" });
    }

    const sub = await SubscriptionService.createSubscription({
      planName,
      planType,
      price,
      duration,
      simulationsUnlimited,
      simulationsLimit,
      features,
      activePlan,
    });

    res.status(201).json({ success: true, subscription: sub });
  } catch (error: any) {
    console.error("Add subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to create subscription" });
  }
};

// fetch all subscription plans (public or admin?)
const listSubscriptions = async (req: Request, res: Response) => {
  try {
    const subs = await SubscriptionService.getAllSubscriptions();
    res.status(200).json({ success: true, subscriptions: subs });
  } catch (error: any) {
    console.error("List subscriptions error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch subscriptions" });
  }
};

// get specific plan by id
const getSubscription = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ success: false, message: "Subscription ID required" });
    }
    const sub = await SubscriptionService.getSubscriptionById(id);
    res.status(200).json({ success: true, subscription: sub });
  } catch (error: any) {
    console.error("Get subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch subscription" });
  }
};

// admin updates a plan
const editSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ success: false, message: "Subscription ID required" });
    }
    const updates = req.body || {};
    const sub = await SubscriptionService.updateSubscription(id, updates);
    res.status(200).json({ success: true, subscription: sub });
  } catch (error: any) {
    console.error("Edit subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update subscription" });
  }
};

// admin deletes a plan
const removeSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ success: false, message: "Subscription ID required" });
    }
    const result = await SubscriptionService.deleteSubscription(id);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("Delete subscription error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to delete subscription" });
  }
};
export const SubscriptionController = {
  addSubscription,
  listSubscriptions,
  getSubscription,
  editSubscription,
  removeSubscription,
};
