import { Simulation } from "./simulation.model";
import { UserProfile } from "../user/user.model";
const AI_ENDPOINT = process.env.AI_SIMULATE_ENDPOINT || "http://127.0.0.1:8000/api/simulate/";

const runSimulationForUser = async (userId: string) => {
  // fetch profile
  const profile = await UserProfile.findOne({ $or: [{ userId }, { userId: userId }] }).lean();
  if (!profile) throw new Error("User profile not found");

  // Build payload matching the AI API expected fields
  const payload = {
    monthlyIncome: profile.monthlyIncome || 0,
    rent: profile.fixedExpenses?.rent || 0,
    utilities: profile.fixedExpenses?.utilities || 0,
    subscriptionsInsurance: profile.fixedExpenses?.subscriptionsInsurance || 0,
    existingLoans: profile.existingLoans || 0,
    variableExpenses: profile.variableExpenses || 0,
    currentSavings: profile.currentSavings || 0,
    dependents: profile.dependents?.length ? parseInt(profile.dependents[0]) || 0 : 0,
    householdResponsibilityLevel: (profile.householdResponsibilityLevel === 'Half') ? 'half' : (profile.householdResponsibilityLevel === 'All' ? 'all_or_most' : 'none'),
    incomeStability: (profile.incomeStability === 'High') ? 'very_stable' : (profile.incomeStability === 'Medium' ? 'stable' : 'unstable'),
    riskTolerance: (profile.riskTolerance === 'Low') ? 'balanced' : (profile.riskTolerance === 'Medium' ? 'balanced' : 'aggressive'),
    purchaseAmount: profile.purchaseSimulation?.purchaseAmount || 0,
    paymentType: (profile.purchaseSimulation?.paymentType === 'Financing') ? 'loan' : 'cash',
    loanDuration: profile.purchaseSimulation?.loanDuration || 0,
    interestRate: profile.purchaseSimulation?.interestRate || 0,
    planName: profile.planName || "",
    targetAmount: profile.targetAmount || 0,
    targetDate: profile.targetDate ? new Date(profile.targetDate).toLocaleDateString('en-GB') : null,
    goalDescription: profile.goalDescription || "",
  };

  // Call external AI API
  const res = await (global as any).fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeout: 20_000,
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`AI Simulation Error (${res.status}): ${responseText.substring(0, 100)}`);
  }

  let aiResponse;
  try {
    aiResponse = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid JSON from AI API: ${responseText.substring(0, 50)}...`);
  }

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
