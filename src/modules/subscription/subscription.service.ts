import { Subscription } from "./subscription.model";

interface CreateSubscriptionDto {
  planName: string;
  planType: string;
  price: number;
  duration: number;
  simulationsUnlimited?: boolean;
  simulationsLimit?: number;
  features?: string[];
  activePlan?: boolean;
  /**
   * price ID in Stripe for recurring billing; optional for one‑time plans
   */
  stripePriceId?: string;
}

const createSubscription = async (data: CreateSubscriptionDto) => {
  // basic validation
  const { planName, planType, price, duration, simulationsUnlimited, simulationsLimit, stripePriceId } = data;
  if (!planName || !planType || price == null || duration == null) {
    throw new Error("All required fields must be provided");
  }
  if (!simulationsUnlimited && (simulationsLimit == null)) {
    throw new Error("Either simulationsUnlimited must be true or a simulationsLimit number provided");
  }

  const existing = await Subscription.findOne({ planName });
  if (existing) {
    throw new Error("Subscription with this plan name already exists");
  }

  const sub = new Subscription({
    ...data,
    features: data.features || [],
    simulationsUnlimited: data.simulationsUnlimited || false,
    stripePriceId: stripePriceId || "",
  });

  await sub.save();
  return sub;
};

const getAllSubscriptions = async () => {
  return Subscription.find().lean();
};

const getSubscriptionById = async (id: string) => {
  const sub = await Subscription.findById(id).lean();
  if (!sub) throw new Error("Subscription not found");
  return sub;
};

const updateSubscription = async (
  id: string,
  updates: Partial<Omit<CreateSubscriptionDto, 'planName'>> & { planName?: string }
) => {
  if (!id) throw new Error("ID is required");
  const sub = await Subscription.findById(id);
  if (!sub) throw new Error("Subscription not found");

  // apply allowed updates
  if (updates.planName) sub.planName = updates.planName;
  if (typeof updates.planType !== 'undefined') sub.planType = updates.planType;
  if (typeof updates.price !== 'undefined') sub.price = updates.price;
  if (typeof updates.duration !== 'undefined') sub.duration = updates.duration;
  if (typeof updates.simulationsUnlimited !== 'undefined') sub.simulationsUnlimited = updates.simulationsUnlimited;
  if (typeof updates.simulationsLimit !== 'undefined') sub.simulationsLimit = updates.simulationsLimit;
  if (Array.isArray(updates.features)) sub.features = updates.features;
  if (typeof updates.activePlan !== 'undefined') sub.activePlan = updates.activePlan;
  if (typeof updates.stripePriceId !== 'undefined') sub.stripePriceId = updates.stripePriceId || "";

  await sub.save();
  return sub.toObject();
};

const deleteSubscription = async (id: string) => {
  if (!id) throw new Error("ID is required");
  const res = await Subscription.findByIdAndDelete(id);
  if (!res) throw new Error("Subscription not found");
  return { message: "Subscription deleted" };
};

// purchase and charge a user for a plan using Stripe
// instead of collecting full card details on the server we expect a
// `paymentMethodId` (or a token) created by a Stripe client integration
// (Elements, Checkout, mobile SDKs, etc). This keeps us out of PCI scope
// and avoids the "full card numbers" warning the account just received.
// For tests you can use one of the built‑in tokens (`tok_visa`) or
// payment method IDs such as `pm_card_visa`.
interface PaymentInfo {
  cardHolderName?: string;
  /**
   * A Stripe payment method id or token obtained from the frontend.
   * Required in normal usage.
   */
  paymentMethodId?: string;
  /**
   * Legacy fields remain for backwards‑compatibility but will trigger
   * the same warning from Stripe. Prefer using a client-side token.
   */
  cardNumber?: string;
  expMonth?: number;
  expYear?: number;
  cvc?: string;
}

const purchaseSubscription = async (
  userId: string,
  planId: string,
  payment: PaymentInfo
) => {
  // load plan
  const plan = await Subscription.findById(planId).lean();
  if (!plan || !plan.isActive) {
    throw new Error("Selected plan is not available");
  }

  const stripe = await import("../../config/stripe").then((mod) => mod.default);
  const { UserService } = await import("../user/user.service");

  // grab user profile to use email and existing stripe IDs
  const profile = await UserService.getProfile(userId);
  if (!profile) {
    throw new Error("User profile not found");
  }

  // create or retrieve customer
  let customerId = profile.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email || undefined,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  // attach payment method if provided
  if (payment.paymentMethodId) {
    try {
      await stripe.paymentMethods.attach(payment.paymentMethodId, { customer: customerId });
    } catch (err: any) {
      // if the method is already attached stripe throws, ignore
      if (!/already attached/.test(err.message)) {
        throw err;
      }
    }
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: payment.paymentMethodId },
    });
  } else if (
    payment.cardNumber &&
    payment.expMonth &&
    payment.expYear &&
    payment.cvc
  ) {
    // create a card token and attach as source
    const token = await stripe.tokens.create({
      card: {
        number: payment.cardNumber,
        exp_month: payment.expMonth,
        exp_year: payment.expYear,
        cvc: payment.cvc,
      },
    } as any);
    await stripe.customers.update(customerId, { source: token.id });
    // don't set default_payment_method – Stripe will use default source
  }

  if (!plan.stripePriceId) {
    throw new Error("This plan does not have an associated Stripe price ID");
  }

  // create a recurring subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
    default_payment_method: payment.paymentMethodId || undefined,
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      planId: planId.toString(),
      planName: plan.planName,
      userId,
    },
  });

  const startedAt = new Date(subscription.current_period_start * 1000);
  const expiresAt = new Date(subscription.current_period_end * 1000);

  await UserService.patchProfile(userId, {
    subscription: {
      planId,
      planName: plan.planName,
      startedAt,
      expiresAt,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: plan.stripePriceId,
      isActive: true,
    },
  });

  return subscription;
};

export const SubscriptionService = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  purchaseSubscription,
};

// exported above with purchaseSubscription included

