import { Simulation } from "./simulation.model";
import { UserProfile } from "../user/user.model";
const AI_ENDPOINT = process.env.AI_SIMULATE_ENDPOINT || "https://929dkhqx-8000.inc1.devtunnels.ms/api/simulate/";

const runSimulationForUser = async (userId: string) => {
  // fetch profile
  const profile = await UserProfile.findOne({ $or: [{ userId }, { userId: userId }] }).lean();
  if (!profile) throw new Error("User profile not found");

  // Build payload matching the AI API expected fields
  const payload = {
    monthlyIncome: profile.monthlyIncome || 0,
    rent: profile.fixedExpenses?.rent || 0,
    utilities: profile.fixedExpenses?.utilities || 0,
    subscriptionsinsurance: profile.fixedExpenses?.subscriptionsInsurance || 0,
    existingLoans: profile.existingLoans || 0,
    variableExpenses: profile.variableExpenses || 0,
    currentsavings: profile.currentSavings || 0,
    dependents: profile.dependents || [],
    householdresponsibilitylevel: profile.householdResponsibilityLevel || "",
    incomestability: profile.incomeStability || "",
    risktolerance: profile.riskTolerance || "",
    purchaseamount: profile.purchaseSimulation?.purchaseAmount || 0,
    paymenttype: profile.purchaseSimulation?.paymentType || "PayInFull",
    loanduration: profile.purchaseSimulation?.loanDuration || 0,
    interestrate: profile.purchaseSimulation?.interestRate || 0,
    planname: profile.planName || "",
    targetamount: profile.targetAmount || 0,
    targetdate: profile.targetDate || null,
    goaldescription: profile.goalDescription || "",
  };

  // Call external AI API
  const res = await (global as any).fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeout: 20_000,
  });

  const aiResponse = await res.json();

  // Save simulation record
  const sim = await Simulation.create({
    userId,
    profileSnapshot: profile,
    requestPayload: payload,
    aiResponse,
  });

  return sim;
};

const getSimulationsByUser = async (userId: string) => {
  return await Simulation.find({ userId }).sort({ createdAt: -1 }).lean();
};

export const SimulationService = { runSimulationForUser, getSimulationsByUser };
