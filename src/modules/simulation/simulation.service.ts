import { Simulation } from "./simulation.model";
import { UserProfile } from "../user/user.model";
import { Types } from "mongoose";

interface SimulationPayload {
  monthlyIncome: number;
  rent: number;
  utilities: number;
  subscriptionsInsurance: number;
  existingLoans: number;
  variableExpenses: number;
  currentSavings: number;
  dependents: number;
  householdResponsibilityLevel: string;
  incomeStability: string;
  riskTolerance: string;
  purchaseAmount: number;
  paymentType: "loan" | "full";
  loanDuration: number;
  interestRate: number;
  planName?: string;
  targetAmount?: number;
  targetDate?: string | null;
  goalDescription?: string;
}

/**
 * Built-in Financial Simulation & AI Guidance Engine
 * Executes financial calculations, risk scoring, comparison models,
 * and smart personalized recommendations in Node.js/Express.
 */
function calculateInternalSimulation(payload: SimulationPayload) {
  const {
    monthlyIncome = 0,
    rent = 0,
    utilities = 0,
    subscriptionsInsurance = 0,
    existingLoans = 0,
    variableExpenses = 0,
    currentSavings = 0,
    purchaseAmount = 0,
    paymentType = "full",
    loanDuration: rawDuration = 12,
    interestRate = 0,
    dependents = 0,
    incomeStability = "mostly_stable",
  } = payload;

  const loanDuration = Math.max(rawDuration || 12, 1);

  // 1. Expense Breakdown & Baseline Disposable Income
  const fixedExpenses = rent + utilities + subscriptionsInsurance + existingLoans;
  const totalMonthlyExpenses = fixedExpenses + variableExpenses;
  const baselineDisposableIncome = Math.max(monthlyIncome - totalMonthlyExpenses, 0);

  // 2. Financing / Loan Calculations
  const annualRate = (interestRate || 0) / 100;
  const monthlyRate = annualRate / 12;

  let financingMonthlyPayment = 0;
  if (monthlyRate > 0) {
    financingMonthlyPayment = Math.round(
      (purchaseAmount * monthlyRate * Math.pow(1 + monthlyRate, loanDuration)) /
        (Math.pow(1 + monthlyRate, loanDuration) - 1)
    );
  } else {
    financingMonthlyPayment = Math.round(purchaseAmount / loanDuration);
  }

  const financingTotalCost = financingMonthlyPayment * loanDuration;
  const financingNewDisposable = baselineDisposableIncome - financingMonthlyPayment;
  const financingRecoveryMonths = loanDuration;

  // Financing Risk Assessment
  const paymentToIncomeRatio = monthlyIncome > 0 ? financingMonthlyPayment / monthlyIncome : 1;
  const paymentToDisposableRatio =
    baselineDisposableIncome > 0 ? financingMonthlyPayment / baselineDisposableIncome : 1;

  let financingRiskLevel: "SAFE" | "TIGHT" | "RISKY" = "SAFE";
  if (financingNewDisposable < 0 || paymentToIncomeRatio > 0.35 || paymentToDisposableRatio > 0.6) {
    financingRiskLevel = "RISKY";
  } else if (
    paymentToIncomeRatio > 0.18 ||
    paymentToDisposableRatio > 0.3 ||
    incomeStability === "unpredictable"
  ) {
    financingRiskLevel = "TIGHT";
  }

  // 3. Pay In Full Calculations
  const fullTotalCost = purchaseAmount;
  const canCoverFromCashflow = baselineDisposableIncome >= purchaseAmount;
  
  // Real post-purchase savings: if disposable cashflow alone covers the item, savings doesn't get depleted
  const postPurchaseSavings = canCoverFromCashflow
    ? currentSavings
    : Math.max(0, currentSavings - (purchaseAmount - Math.min(baselineDisposableIncome, purchaseAmount)));

  const monthlySavingsCapacity = Math.max(baselineDisposableIncome * 0.5, 1);
  const fullRecoveryMonths = Math.ceil(purchaseAmount / monthlySavingsCapacity);

  const emergencyFundTarget = Math.max(totalMonthlyExpenses * 3, 1000);
  const totalAvailableLiquidity = currentSavings + baselineDisposableIncome;

  let fullRiskLevel: "SAFE" | "TIGHT" | "RISKY" = "SAFE";

  if (baselineDisposableIncome <= 0 && currentSavings < purchaseAmount) {
    fullRiskLevel = "RISKY";
  } else if (purchaseAmount > totalAvailableLiquidity) {
    fullRiskLevel = "RISKY";
  } else if (baselineDisposableIncome >= purchaseAmount * 1.5) {
    // Disposable income alone covers the entire purchase with a large surplus left
    fullRiskLevel = "SAFE";
  } else if (baselineDisposableIncome >= purchaseAmount) {
    // Disposable income covers it, but leaves smaller monthly surplus
    if (currentSavings >= emergencyFundTarget) {
      fullRiskLevel = "SAFE";
    } else {
      fullRiskLevel = "TIGHT";
    }
  } else if (currentSavings >= purchaseAmount) {
    // Must be paid primarily from savings
    const remainingSavings = currentSavings - purchaseAmount;
    if (remainingSavings >= emergencyFundTarget) {
      fullRiskLevel = "SAFE";
    } else if (
      remainingSavings < emergencyFundTarget * 0.25 ||
      fullRecoveryMonths > 6 ||
      incomeStability === "unpredictable"
    ) {
      fullRiskLevel = "RISKY";
    } else {
      fullRiskLevel = "TIGHT";
    }
  } else {
    // currentSavings < purchaseAmount, but currentSavings + baselineDisposableIncome >= purchaseAmount
    if (fullRecoveryMonths <= 2 && incomeStability !== "unpredictable") {
      fullRiskLevel = "TIGHT";
    } else {
      fullRiskLevel = "RISKY";
    }
  }

  // 4. Determine Active Calculation based on user's selected paymentType
  const isLoan = paymentType === "loan";
  const activeMonthlyPayment = isLoan ? financingMonthlyPayment : 0;
  const activeNewDisposable = isLoan
    ? financingNewDisposable
    : Math.max(0, baselineDisposableIncome - (canCoverFromCashflow ? purchaseAmount : 0));
  const activeRecoveryMonths = isLoan ? financingRecoveryMonths : fullRecoveryMonths;
  const activeRiskLevel = isLoan ? financingRiskLevel : fullRiskLevel;

  // Map to detailed risk state (SAFE, CAUTIOUS, TIGHT, RISKY)
  let overallRisk: "SAFE" | "CAUTIOUS" | "TIGHT" | "RISKY" = activeRiskLevel;
  if (activeRiskLevel === "TIGHT" && (dependents > 2 || incomeStability === "unpredictable")) {
    overallRisk = "CAUTIOUS";
  }

  // 5. Dynamic Guidance and Personalized Insights
  let assessmentTitle = "Sound Financial Decision";
  let guidanceText = "";

  if (overallRisk === "SAFE") {
    assessmentTitle = "Comfortable Purchase";
    guidanceText = isLoan
      ? `This purchase of $${purchaseAmount.toLocaleString()} is well within your budget. Your monthly payment of $${activeMonthlyPayment.toLocaleString()} is comfortably absorbed by your $${baselineDisposableIncome.toLocaleString()}/month disposable income.`
      : `This purchase of $${purchaseAmount.toLocaleString()} is well within your budget. With a healthy monthly cash flow of $${baselineDisposableIncome.toLocaleString()}, you can comfortably absorb this purchase without financial strain.`;
  } else if (overallRisk === "TIGHT" || overallRisk === "CAUTIOUS") {
    assessmentTitle = "Manageable with Caution";
    guidanceText = isLoan
      ? `This purchase of $${purchaseAmount.toLocaleString()} is achievable, but financing payments of $${activeMonthlyPayment.toLocaleString()}/month will tighten your cash flow.`
      : `This purchase of $${purchaseAmount.toLocaleString()} is achievable, but paying in full will temporarily reduce your available cash flow. Consider pacing other discretionary expenses this month.`;
  } else {
    assessmentTitle = "High Financial Strain";
    guidanceText = isLoan
      ? `Warning: Monthly payments of $${activeMonthlyPayment.toLocaleString()} will put severe pressure on your budget relative to your disposable income.`
      : `Warning: Committing $${purchaseAmount.toLocaleString()} upfront will exhaust your available liquid reserves or exceed your monthly cash flow. Consider financing or saving up before purchasing.`;
  }

  const keyInsights = [
    {
      title: "Monthly Cash Flow",
      detail: isLoan
        ? `Your monthly disposable income adjusts from $${baselineDisposableIncome.toLocaleString()} to $${financingNewDisposable.toLocaleString()} during the ${loanDuration}-month period.`
        : (canCoverFromCashflow
            ? `Your monthly surplus of $${baselineDisposableIncome.toLocaleString()} easily absorbs the $${purchaseAmount.toLocaleString()} cost, leaving $${Math.max(0, baselineDisposableIncome - purchaseAmount).toLocaleString()} buffer this month.`
            : `Projected monthly disposable income is $${baselineDisposableIncome.toLocaleString()}/month.`),
    },
    {
      title: "Recovery Timeline",
      detail: isLoan
        ? `Loan duration is ${activeRecoveryMonths} months with a monthly payment of $${activeMonthlyPayment.toLocaleString()}.`
        : `Estimated ${activeRecoveryMonths} month(s) to restore your discretionary buffer from normal cash flow.`,
    },
    {
      title: "Liquidity & Reserves",
      detail: isLoan
        ? `Financing keeps your $${currentSavings.toLocaleString()} in savings intact for unexpected emergencies.`
        : (canCoverFromCashflow
            ? `Current savings of $${currentSavings.toLocaleString()} remains intact as monthly cash flow comfortably covers the cost.`
            : `Post-purchase cash savings will stand at $${Math.max(postPurchaseSavings, 0).toLocaleString()}.`),
    },
    {
      title: "Commitment Ratio",
      detail: `Fixed living costs and debt currently account for ${
        monthlyIncome > 0 ? Math.min(100, Math.round((totalMonthlyExpenses / monthlyIncome) * 100)) : 0
      }% of your gross income.`,
    },
  ];

  const saferAlternatives = [
    isLoan
      ? `Extending loan tenure to ${loanDuration + 6} months could lower payments by roughly ~${Math.round(
          financingMonthlyPayment * 0.2
        )}/month.`
      : (overallRisk === "SAFE"
          ? `You can comfortably pay in full, but zero-interest promotional financing could keep your cash reserves even more liquid.`
          : `Consider paying 50% upfront and financing the remaining $${Math.round(purchaseAmount / 2).toLocaleString()} to preserve your cushion.`),
    `Set aside dedicated savings for 1-2 months before purchasing to comfortably absorb the cost.`,
    `Look for seasonal discounts or alternative certified options to reduce total outlay by 10-20%.`,
  ];

  return {
    calculation: {
      risk_level: overallRisk,
      baseline_disposable_income: baselineDisposableIncome,
      new_disposable_income: activeNewDisposable,
      monthly_payment: activeMonthlyPayment,
      recovery_months: activeRecoveryMonths,
      comparisons: {
        pay_in_full: {
          total_cost: fullTotalCost,
          monthly_impact: fullTotalCost,
          recovery_months: fullRecoveryMonths,
          risk_level: fullRiskLevel,
        },
        financing: {
          total_cost: financingTotalCost,
          monthly_payment: financingMonthlyPayment,
          loan_duration: loanDuration,
          recovery_months: financingRecoveryMonths,
          risk_level: financingRiskLevel,
        },
      },
    },
    ai_guidance: {
      risk_level: overallRisk,
      assessment_title: assessmentTitle,
      guidance: guidanceText,
      key_insights: keyInsights,
      safer_alternatives: saferAlternatives,
    },
  };
}

const runSimulationForUser = async (userId: string, purchaseSimulationOverride?: any) => {
  const oid = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
  const filter = oid ? { $or: [{ userId }, { userId: oid }] } : { userId };

  // Fetch user profile
  const profile = await UserProfile.findOne(filter).lean();
  if (!profile) throw new Error("User profile not found");

  const simConfig = purchaseSimulationOverride || profile.purchaseSimulation || {};

  // Build payload matching the simulation model
  const payload: SimulationPayload = {
    monthlyIncome: profile.monthlyIncome || 0,
    rent: profile.fixedExpenses?.rent || 0,
    utilities: profile.fixedExpenses?.utilities || 0,
    subscriptionsInsurance: profile.fixedExpenses?.subscriptionsInsurance || 0,
    existingLoans: Number(profile.totalMonthlyLoanPayments) || Number(profile.existingLoans) || 0,
    variableExpenses: profile.variableExpenses || 0,
    currentSavings: profile.currentSavings || 0,
    dependents: profile.dependents?.length ? parseInt(profile.dependents[0]) || 0 : 0,
    householdResponsibilityLevel:
      profile.householdResponsibilityLevel === "Half"
        ? "half"
        : profile.householdResponsibilityLevel === "All"
        ? "all_or_most"
        : "not_applicable",
    incomeStability:
      profile.incomeStability === "High"
        ? "very_stable"
        : profile.incomeStability === "Medium"
        ? "mostly_stable"
        : "unpredictable",
    riskTolerance:
      profile.riskTolerance === "Low"
        ? "safe"
        : profile.riskTolerance === "Medium"
        ? "balanced"
        : "risk_ok",
    purchaseAmount: Number(simConfig.purchaseAmount) || 0,
    paymentType: simConfig.paymentType === "Financing" || simConfig.paymentType === "loan" ? "loan" : "full",
    loanDuration: Number(simConfig.loanDuration) || 1,
    interestRate: Number(simConfig.interestRate) || 0,
    planName: simConfig.planName || profile.planName || "",
    targetAmount: profile.targetAmount || 0,
    targetDate: profile.targetDate ? new Date(profile.targetDate).toLocaleDateString("en-GB") : null,
    goalDescription: profile.goalDescription || "",
  };

  const AI_ENDPOINT = process.env.AI_SIMULATE_ENDPOINT;
  let aiResponse: any = null;

  // If an external AI endpoint is configured and active, try it with a 3-second timeout fallback
  if (AI_ENDPOINT && !AI_ENDPOINT.includes("onrender.com")) {
    try {
      console.log(`[Simulation] Attempting external AI API: ${AI_ENDPOINT}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await (global as any).fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        aiResponse = await res.json();
      }
    } catch (e: any) {
      console.warn(`[Simulation] External AI endpoint unreachable, using internal engine: ${e.message}`);
    }
  }

  // If external AI was not used or failed, use our comprehensive built-in engine
  if (!aiResponse) {
    aiResponse = calculateInternalSimulation(payload);
  }

  // Save simulation record to MongoDB
  const sim = await Simulation.create({
    userId,
    profileSnapshot: profile,
    requestPayload: payload,
    aiResponse,
  });

  // Track simulations count for dashboard statistics
  await UserProfile.updateOne(
    filter,
    { $inc: { totalSimulationsUsed: 1 } }
  );

  return sim;
};

const getSimulationsByUser = async (userId: string) => {
  const oid = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
  const filter = oid ? { $or: [{ userId }, { userId: oid }] } : { userId };
  return await Simulation.find(filter).sort({ createdAt: -1 }).lean();
};

export const SimulationService = { runSimulationForUser, getSimulationsByUser };
