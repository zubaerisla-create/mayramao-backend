import { Subscription } from "./subscription.model";

interface CreateSubscriptionDto {
  planName: string;
  planType: string;
  price: number;
  duration: number;
  simulationsUnlimited?: boolean;
  simulationsLimit?: number;
  features?: string[];
  activePlan?:boolean;
}

const createSubscription = async (data: CreateSubscriptionDto) => {
  // basic validation
  const { planName, planType, price, duration, simulationsUnlimited, simulationsLimit } = data;
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

  // dynamic import stripe here to avoid circular dependency
  const stripe = await import("../../config/stripe").then((mod) => mod.default);
  const amount = Math.round(plan.price * 100);
  // build base options for the intent
  const intentData: any = {
    amount,
    currency: "usd",
    description: `Subscription purchase for plan ${plan.planName}${payment.cardHolderName ? ` (cardholder: ${payment.cardHolderName})` : ""}`,
    metadata: {
      planId: planId.toString(),
      planName: plan.planName,
      cardHolderName: payment.cardHolderName || "",
      userId,
    },
    confirm: true,
  };

  if (payment.paymentMethodId) {
    // normal path: frontend already created a payment method or token
    intentData.payment_method = payment.paymentMethodId;
  } else if (
    payment.cardNumber &&
    payment.expMonth &&
    payment.expYear &&
    payment.cvc
  ) {
    // legacy fallback – still sends raw card data, which will trigger the
    // warning e‑mail you received. Only keep this around if you absolutely
    // must; otherwise drop it and require a paymentMethodId.
    intentData.payment_method_data = {
      type: "card",
      card: {
        number: payment.cardNumber,
        exp_month: payment.expMonth,
        exp_year: payment.expYear,
        cvc: payment.cvc,
      },
    } as any;
  } else {
    throw new Error("No payment information provided");
  }

  const paymentIntent = await stripe.paymentIntents.create(intentData);

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment failed");
  }

  // compute timeframe
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + plan.duration * 24 * 60 * 60 * 1000);

  // update profile via UserService
  const { UserService } = await import("../user/user.service");
  await UserService.patchProfile(userId, {
    subscription: {
      planId,
      planName: plan.planName,
      startedAt,
      expiresAt,
      stripePaymentIntentId: paymentIntent.id,
      isActive: true,
    },
  });

  return paymentIntent;
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

