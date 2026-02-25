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

export const SubscriptionService = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};

