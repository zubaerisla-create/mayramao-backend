import { RevenueCatWebhookEvent } from "./revenuecatWebhookEvent.model";
import { UserProfile } from "../user/user.model";

interface RevenueCatEventPayload {
  api_version?: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    original_app_user_id?: string;
    product_id?: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    store?: string;
    environment?: string;
    price_in_purchased_currency?: number;
    currency?: string;
    [key: string]: any;
  };
}

export const processRevenueCatWebhook = async (payload: RevenueCatEventPayload) => {
  const event = payload?.event;
  if (!event || !event.id) {
    throw new Error("Invalid RevenueCat webhook payload: missing event or event ID");
  }

  const {
    id: eventId,
    type: eventType,
    app_user_id: appUserId,
    original_app_user_id: originalAppUserId,
    product_id: productId,
    entitlement_id: entitlementId,
    entitlement_ids: entitlementIds,
    purchased_at_ms: purchasedAtMs,
    expiration_at_ms: expirationAtMs,
    store,
  } = event;

  // 1. Idempotency Check: if event already processed, ignore safely
  const existingEvent = await RevenueCatWebhookEvent.findOne({ eventId });
  if (existingEvent) {
    console.log(`[RevenueCat Webhook] Event ${eventId} already processed, skipping.`);
    return { status: "already_processed", eventId };
  }

  // 2. Record this event
  await RevenueCatWebhookEvent.create({
    eventId,
    eventType,
    appUserId: appUserId || "",
    productId: productId || "",
    rawPayload: payload,
  });

  // 3. Resolve Target User
  // appUserId can be MongoDB ObjectId (from Purchases.logIn(user.id))
  const targetUserId = appUserId || originalAppUserId;
  if (!targetUserId) {
    console.log(`[RevenueCat Webhook] No app_user_id found for event ${eventId}`);
    return { status: "no_user_id", eventId };
  }

  // Look up user profile by userId or _id or revenueCatAppUserId
  let profile = await UserProfile.findOne({
    $or: [
      { userId: targetUserId },
      { "subscription.revenueCatAppUserId": targetUserId },
    ],
  });

  // Also try searching directly by _id if targetUserId is a valid ObjectId
  if (!profile && targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
    profile = await UserProfile.findById(targetUserId);
  }

  if (!profile) {
    console.warn(`[RevenueCat Webhook] UserProfile not found for ID: ${targetUserId}. Stored event for auditing.`);
    return { status: "user_not_found", eventId, targetUserId };
  }

  // 4. Update Profile based on event type
  const isYearly = productId ? productId.toLowerCase().includes("yearly") || productId.toLowerCase().includes("annual") : false;
  const planName = isYearly ? "Premium Yearly" : "Premium Monthly";
  const planType = isYearly ? "yearly" : "monthly";
  const startedAt = purchasedAtMs ? new Date(purchasedAtMs) : new Date();
  const expiresAt = expirationAtMs ? new Date(expirationAtMs) : undefined;
  const resolvedEntitlement = entitlementId || (entitlementIds && entitlementIds[0]) || "premium";

  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE": {
      profile.subscription = {
        ...profile.subscription,
        planName,
        planType,
        simulationsLimit: 99999, // unlimited simulations for premium
        startedAt,
        expiresAt,
        revenueCatAppUserId: targetUserId,
        revenueCatEntitlementId: resolvedEntitlement,
        store: store || "PLAY_STORE",
        isActive: true,
      };
      await profile.save();
      console.log(`[RevenueCat Webhook] Activated subscription for user ${targetUserId} (${eventType})`);
      break;
    }

    case "CANCELLATION": {
      // User cancelled renewal, but retains access until current period expires
      const now = Date.now();
      const stillActive = expirationAtMs ? expirationAtMs > now : false;
      if (profile.subscription) {
        profile.subscription.isActive = stillActive;
        if (expiresAt) {
          profile.subscription.expiresAt = expiresAt;
        }
      }
      await profile.save();
      console.log(`[RevenueCat Webhook] Handled cancellation for user ${targetUserId}. Active until: ${expiresAt}`);
      break;
    }

    case "EXPIRATION":
    case "REVOCATION": {
      // Access expired or refunded/revoked
      if (profile.subscription) {
        profile.subscription.isActive = false;
        if (expiresAt) {
          profile.subscription.expiresAt = expiresAt;
        }
      }
      await profile.save();
      console.log(`[RevenueCat Webhook] Expired/Revoked subscription for user ${targetUserId}`);
      break;
    }

    case "BILLING_ISSUE": {
      console.warn(`[RevenueCat Webhook] Billing issue reported for user ${targetUserId}`);
      break;
    }

    default: {
      console.log(`[RevenueCat Webhook] Received unhandled event type: ${eventType}`);
      break;
    }
  }

  return { status: "processed", eventId, eventType, targetUserId };
};
