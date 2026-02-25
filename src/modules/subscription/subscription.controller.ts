import { Request, Response } from "express";
import { SubscriptionService } from "./subscription.service";
import { AdminRequest } from "../admin/admin.controller"; // reuse interface
import { AuthRequest } from "../../middleware/authMiddleware";

// add a new subscription plan (admin only)
const addSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const { planName, planType, price, duration, simulationsUnlimited, simulationsLimit, features, activePlan, stripePriceId } = req.body || {};
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
      stripePriceId,
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
// purchase endpoint - authenticated users only
// expects a paymentMethodId (or token) generated on the client side via
// Stripe.js/Elements/Checkout. sending raw card details will cause Stripe
// to reject the request in test mode and trigger the warning email you
// saw.
const purchaseSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      planId,
      cardHolderName,
      paymentMethodId,
    } = req.body || {};

    if (!planId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: "Missing planId or paymentMethodId."
      });
    }

    // delegate the heavy lifting to service layer
    const subscription = await SubscriptionService.purchaseSubscription(userId, planId, {
      cardHolderName,
      paymentMethodId,
    });

    res.status(200).json({ success: true, subscription });
  } catch (err: any) {
    console.error("Purchase subscription error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to complete purchase" });
  }
};

// return publishable key for front end
// webhook endpoint for Stripe events (may need raw body handling)
const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: any;

  try {
    const stripe = await import("../../config/stripe").then((m) => m.default);
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // handle relevant events
  switch (event.type) {
    case "invoice.payment_succeeded":
    case "customer.subscription.updated": {
      const subscription: any = event.data.object;
      // update local profile if subscribed
      const { UserProfile } = await import("../user/user.model");
      const profile = await UserProfile.findOne({ "subscription.stripeSubscriptionId": subscription.id });
      if (profile && profile.subscription) {
        profile.subscription.expiresAt = new Date((subscription.current_period_end || 0) * 1000);
        profile.subscription.isActive = !subscription.cancel_at_period_end && subscription.status === "active";
        await profile.save();
      }
      break;
    }
    // other event types can be handled here if needed
    default:
      // console.log(`Unhandled event type ${event.type}`);
      break;
  }

  res.json({ received: true });
};

const getStripeKey = async (_req: Request, res: Response) => {
  res.status(200).json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
};

export const SubscriptionController = {
  addSubscription,
  listSubscriptions,
  getSubscription,
  editSubscription,
  removeSubscription,
  purchaseSubscription,
  getStripeKey,
  stripeWebhook,
};
