import { Simulation } from "./simulation.model";
import { UserProfile } from "../user/user.model";
import { Types } from "mongoose";
const AI_ENDPOINT = process.env.AI_SIMULATE_ENDPOINT || "https://ai-financial-model-3.onrender.com/api/simulate/";

const runSimulationForUser = async (userId: string) => {
  // fetch profile
  const profile = await UserProfile.findOne({ userId: new Types.ObjectId(userId) }).lean();
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
    householdResponsibilityLevel: (profile.householdResponsibilityLevel === 'Half') ? 'half' : (profile.householdResponsibilityLevel === 'All' ? 'all_or_most' : 'not_applicable'),
    incomeStability: (profile.incomeStability === 'High') ? 'very_stable' : (profile.incomeStability === 'Medium' ? 'mostly_stable' : 'unpredictable'),
    riskTolerance: (profile.riskTolerance === 'Low') ? 'safe' : (profile.riskTolerance === 'Medium' ? 'balanced' : 'risk_ok'),
    purchaseAmount: profile.purchaseSimulation?.purchaseAmount || 0,
    paymentType: (profile.purchaseSimulation?.paymentType === 'Financing') ? 'loan' : 'full',
    loanDuration: profile.purchaseSimulation?.loanDuration || 1,
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
  return await Simulation.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean();
};

export const SimulationService = { runSimulationForUser, getSimulationsByUser };
