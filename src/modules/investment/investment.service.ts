import { Types } from "mongoose";
import { Business, IBusiness } from "./business.model";
import { InvestmentTransaction, TransactionType } from "./transaction.model";

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface CreateBusinessDto {
  name: string;
  description?: string;
  startDate?: string | Date;
  initialInvestment?: number;
  openingBalance?: number;
}

export interface CreateTransactionDto {
  type: TransactionType;
  name: string;
  amount: number;
  note?: string;
  transactionDate?: string | Date;
}

// ─── Service Implementation ──────────────────────────────────────────────────
class InvestmentService {
  /**
   * Helper: Calculate stats for a single business
   */
  async calculateBusinessStats(businessId: string | Types.ObjectId, targetDate: Date = new Date()) {
    const bId = new Types.ObjectId(businessId.toString());

    // 1. Overall aggregation
    const overallAgg = await InvestmentTransaction.aggregate([
      { $match: { businessId: bId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalInvestment = 0;
    let totalSales = 0;
    let totalExpenses = 0;
    let totalWithdrawals = 0;
    let investmentCount = 0;
    let sellCount = 0;
    let transactionCount = 0;

    for (const item of overallAgg) {
      transactionCount += item.count;
      if (item._id === "INVESTMENT") {
        totalInvestment = item.total;
        investmentCount = item.count;
      } else if (item._id === "PROFIT" || item._id === "SELL" || item._id === "SALE") {
        totalSales += item.total;
        sellCount += item.count;
      } else if (item._id === "EXPENSE") {
        totalExpenses = item.total;
      } else if (item._id === "WITHDRAWAL") {
        totalWithdrawals = item.total;
      }
    }

    // 2. Month-specific aggregation (selected month)
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthAgg = await InvestmentTransaction.aggregate([
      {
        $match: {
          businessId: bId,
          transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let monthlySales = 0;
    let monthlyInvestment = 0;
    let monthlyExpense = 0;

    for (const item of monthAgg) {
      if (item._id === "PROFIT" || item._id === "SELL" || item._id === "SALE") monthlySales += item.total;
      if (item._id === "INVESTMENT") monthlyInvestment += item.total;
      if (item._id === "EXPENSE") monthlyExpense += item.total;
    }

    // Profit = Total Sales - Total Investment - Total Expenses
    const netProfitLoss = totalSales - totalInvestment - totalExpenses;
    const monthlyNetProfit = monthlySales - monthlyInvestment - monthlyExpense;

    return {
      totalInvestment,
      totalSales,
      totalSell: totalSales,
      totalProfit: totalSales, // for backwards compatibility
      totalExpenses,
      totalWithdrawals,
      netProfitLoss,
      monthlyProfit: monthlyNetProfit,
      monthlySales,
      monthlySell: monthlySales,
      monthlyInvestment,
      investmentCount,
      sellCount,
      profitCount: sellCount, // alias for backwards compatibility
      transactionCount,
    };
  }

  /**
   * Create a new business
   */
  async createBusiness(userId: string, data: CreateBusinessDto) {
    if (!data.name || !data.name.trim()) {
      throw new Error("Business name is required");
    }

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const openingBalance = Number(data.openingBalance) || 0;

    const business = await Business.create({
      userId: new Types.ObjectId(userId),
      name: data.name.trim(),
      description: data.description ? data.description.trim() : "",
      startDate,
      openingBalance,
    });

    // If initial investment was entered, record as an INVESTMENT transaction
    const initialAmount = Number(data.initialInvestment);
    if (initialAmount && initialAmount > 0) {
      await InvestmentTransaction.create({
        userId: new Types.ObjectId(userId),
        businessId: business._id,
        type: "INVESTMENT",
        name: "Initial Capital / Investment",
        amount: initialAmount,
        note: "Initial investment recorded upon business setup",
        transactionDate: startDate,
      });
    }

    const stats = await this.calculateBusinessStats(business._id);
    const currentBalance =
      openingBalance +
      stats.totalSales -
      stats.totalInvestment -
      stats.totalExpenses -
      stats.totalWithdrawals;

    return {
      ...business.toObject(),
      ...stats,
      currentBalance,
    };
  }

  /**
   * Get all businesses for a user with calculated financial statistics
   */
  async getBusinesses(userId: string) {
    const uId = new Types.ObjectId(userId);
    const businesses = await Business.find({ userId: uId }).sort({ createdAt: -1 }).lean();

    const results = await Promise.all(
      businesses.map(async (b) => {
        const stats = await this.calculateBusinessStats(b._id);
        const currentBalance =
          (b.openingBalance || 0) +
          stats.totalSales -
          stats.totalInvestment -
          stats.totalExpenses -
          stats.totalWithdrawals;

        return {
          ...b,
          ...stats,
          currentBalance,
        };
      })
    );

    return results;
  }

  /**
   * Get details for a single business
   */
  async getBusinessById(userId: string, businessId: string, monthStr?: string) {
    const uId = new Types.ObjectId(userId);
    const bId = new Types.ObjectId(businessId);

    const business = await Business.findOne({ _id: bId, userId: uId }).lean();
    if (!business) {
      throw new Error("Business not found or access denied");
    }

    let targetDate = new Date();
    if (monthStr) {
      const parsed = new Date(monthStr);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }

    const stats = await this.calculateBusinessStats(bId, targetDate);
    const currentBalance =
      (business.openingBalance || 0) +
      stats.totalSales -
      stats.totalInvestment -
      stats.totalExpenses -
      stats.totalWithdrawals;

    return {
      ...business,
      ...stats,
      currentBalance,
    };
  }

  /**
   * Update business details
   */
  async updateBusiness(
    userId: string,
    businessId: string,
    data: { name?: string; description?: string; startDate?: string }
  ) {
    const uId = new Types.ObjectId(userId);
    const bId = new Types.ObjectId(businessId);

    const business = await Business.findOne({ _id: bId, userId: uId });
    if (!business) {
      throw new Error("Business not found or access denied");
    }

    if (data.name && data.name.trim()) business.name = data.name.trim();
    if (typeof data.description !== "undefined") business.description = data.description.trim();
    if (data.startDate) business.startDate = new Date(data.startDate);

    await business.save();
    return this.getBusinessById(userId, businessId);
  }

  /**
   * Delete business and all linked transactions
   */
  async deleteBusiness(userId: string, businessId: string) {
    const uId = new Types.ObjectId(userId);
    const bId = new Types.ObjectId(businessId);

    const business = await Business.findOne({ _id: bId, userId: uId });
    if (!business) {
      throw new Error("Business not found or access denied");
    }

    await InvestmentTransaction.deleteMany({ businessId: bId });
    await Business.deleteOne({ _id: bId });

    return { success: true, message: "Business and its transactions deleted successfully" };
  }

  /**
   * Create an investment or profit transaction
   */
  async createTransaction(userId: string, businessId: string, data: CreateTransactionDto) {
    const uId = new Types.ObjectId(userId);
    const bId = new Types.ObjectId(businessId);

    // Verify ownership
    const business = await Business.findOne({ _id: bId, userId: uId });
    if (!business) {
      throw new Error("Business not found or access denied");
    }

    if (!data.name || !data.name.trim()) {
      throw new Error("Transaction name is required");
    }

    const amount = Number(data.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const validTypes: TransactionType[] = ["INVESTMENT", "PROFIT", "SELL", "SALE", "EXPENSE", "WITHDRAWAL"];
    if (!validTypes.includes(data.type)) {
      throw new Error("Invalid transaction type");
    }

    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    const transaction = await InvestmentTransaction.create({
      userId: uId,
      businessId: bId,
      type: data.type,
      name: data.name.trim(),
      amount,
      note: data.note ? data.note.trim() : "",
      transactionDate,
    });

    const updatedStats = await this.calculateBusinessStats(bId);
    const currentBalance =
      (business.openingBalance || 0) +
      updatedStats.totalSales -
      updatedStats.totalInvestment -
      updatedStats.totalExpenses -
      updatedStats.totalWithdrawals;

    return {
      transaction: transaction.toObject(),
      businessStats: {
        ...updatedStats,
        currentBalance,
      },
    };
  }

  /**
   * List transactions for a business with search and filtering
   */
  async getTransactions(
    userId: string,
    businessId: string,
    options: { type?: string; search?: string; page?: number; limit?: number }
  ) {
    const uId = new Types.ObjectId(userId);
    const bId = new Types.ObjectId(businessId);

    // Verify ownership
    const business = await Business.findOne({ _id: bId, userId: uId });
    if (!business) {
      throw new Error("Business not found or access denied");
    }

    const filter: any = { businessId: bId, userId: uId };

    if (options.type && options.type !== "ALL") {
      const upper = options.type.toUpperCase();
      if (upper === "SELL" || upper === "SALE" || upper === "PROFIT") {
        filter.type = { $in: ["SELL", "SALE", "PROFIT"] };
      } else {
        filter.type = upper;
      }
    }

    if (options.search && options.search.trim()) {
      filter.$or = [
        { name: { $regex: options.search.trim(), $options: "i" } },
        { note: { $regex: options.search.trim(), $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 50));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      InvestmentTransaction.find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvestmentTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a transaction
   */
  async updateTransaction(
    userId: string,
    transactionId: string,
    data: Partial<CreateTransactionDto>
  ) {
    const uId = new Types.ObjectId(userId);
    const tId = new Types.ObjectId(transactionId);

    const transaction = await InvestmentTransaction.findOne({ _id: tId, userId: uId });
    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    if (data.name && data.name.trim()) transaction.name = data.name.trim();
    if (typeof data.amount !== "undefined") {
      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw new Error("Amount must be a positive number");
      transaction.amount = amount;
    }
    if (typeof data.note !== "undefined") transaction.note = data.note.trim();
    if (data.transactionDate) transaction.transactionDate = new Date(data.transactionDate);
    if (data.type) transaction.type = data.type;

    await transaction.save();

    const updatedStats = await this.calculateBusinessStats(transaction.businessId);
    const business = await Business.findById(transaction.businessId);
    const currentBalance =
      (business?.openingBalance || 0) +
      updatedStats.totalSales -
      updatedStats.totalInvestment -
      updatedStats.totalExpenses -
      updatedStats.totalWithdrawals;

    return {
      transaction: transaction.toObject(),
      businessStats: {
        ...updatedStats,
        currentBalance,
      },
    };
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(userId: string, transactionId: string) {
    const uId = new Types.ObjectId(userId);
    const tId = new Types.ObjectId(transactionId);

    const transaction = await InvestmentTransaction.findOne({ _id: tId, userId: uId });
    if (!transaction) {
      throw new Error("Transaction not found or access denied");
    }

    const businessId = transaction.businessId;
    await InvestmentTransaction.deleteOne({ _id: tId });

    const updatedStats = await this.calculateBusinessStats(businessId);
    const business = await Business.findById(businessId);
    const currentBalance =
      (business?.openingBalance || 0) +
      updatedStats.totalSales -
      updatedStats.totalInvestment -
      updatedStats.totalExpenses -
      updatedStats.totalWithdrawals;

    return {
      success: true,
      message: "Transaction deleted successfully",
      businessStats: {
        ...updatedStats,
        currentBalance,
      },
    };
  }

  /**
   * Get main financial dashboard statistics and monthly charts
   */
  async getDashboardStats(userId: string, filter?: { month?: number; year?: number }) {
    const uId = new Types.ObjectId(userId);

    // 1. All user businesses
    const businesses = await Business.find({ userId: uId }).lean();
    const totalBusinesses = businesses.length;

    // 2. Global totals by type
    const totalsAgg = await InvestmentTransaction.aggregate([
      { $match: { userId: uId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalInvestment = 0;
    let totalSales = 0;
    let totalExpenses = 0;
    let totalWithdrawals = 0;

    for (const item of totalsAgg) {
      if (item._id === "INVESTMENT") totalInvestment = item.total;
      if (item._id === "PROFIT" || item._id === "SELL" || item._id === "SALE") totalSales += item.total;
      if (item._id === "EXPENSE") totalExpenses = item.total;
      if (item._id === "WITHDRAWAL") totalWithdrawals = item.total;
    }

    const totalOpeningBalances = businesses.reduce((sum, b) => sum + (b.openingBalance || 0), 0);
    const currentEstimatedBalance =
      totalOpeningBalances + totalSales - totalInvestment - totalExpenses - totalWithdrawals;
    const netProfit = totalSales - totalInvestment - totalExpenses;

    // 3. This month vs last month profit comparison (respecting selected month/year filter)
    const now = new Date();
    const targetYear = filter?.year && !isNaN(filter.year) ? Number(filter.year) : now.getFullYear();
    const targetMonth =
      filter?.month && !isNaN(filter.month) ? Number(filter.month) - 1 : now.getMonth();
    const targetDate = new Date(targetYear, targetMonth, 1);

    const startOfThisMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfThisMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfLastMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const endOfLastMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59, 999);

    const [thisMonthAgg, lastMonthAgg] = await Promise.all([
      InvestmentTransaction.aggregate([
        {
          $match: {
            userId: uId,
            transactionDate: { $gte: startOfThisMonth, $lte: endOfThisMonth },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]),
      InvestmentTransaction.aggregate([
        {
          $match: {
            userId: uId,
            transactionDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    let thisMonthSales = 0;
    let thisMonthInvestment = 0;
    let thisMonthExpense = 0;
    for (const item of thisMonthAgg) {
      if (item._id === "PROFIT" || item._id === "SELL" || item._id === "SALE") thisMonthSales += item.total;
      if (item._id === "EXPENSE") thisMonthExpense += item.total;
      if (item._id === "INVESTMENT") thisMonthInvestment += item.total;
    }
    const thisMonthProfit = thisMonthSales - thisMonthInvestment - thisMonthExpense;

    let lastMonthSales = 0;
    let lastMonthInvestment = 0;
    let lastMonthExpense = 0;
    for (const item of lastMonthAgg) {
      if (item._id === "PROFIT" || item._id === "SELL" || item._id === "SALE") lastMonthSales += item.total;
      if (item._id === "EXPENSE") lastMonthExpense += item.total;
      if (item._id === "INVESTMENT") lastMonthInvestment += item.total;
    }
    const lastMonthProfit = lastMonthSales - lastMonthInvestment - lastMonthExpense;

    // 4. Monthly trend for last 6 months ending at targetDate
    const monthlyTrends: Array<{
      monthKey: string;
      label: string;
      profit: number;
      sales: number;
      sell: number;
      investment: number;
    }> = [];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetDate.getFullYear(), targetDate.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const mAgg = await InvestmentTransaction.aggregate([
        {
          $match: {
            userId: uId,
            transactionDate: { $gte: mStart, $lte: mEnd },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]);

      let mSales = 0;
      let mInvestment = 0;
      let mExpense = 0;
      for (const item of mAgg) {
        if (item._id === "PROFIT" || item._id === "SELL" || item._id === "SALE") mSales += item.total;
        if (item._id === "EXPENSE") mExpense += item.total;
        if (item._id === "INVESTMENT") mInvestment += item.total;
      }
      const mProfit = mSales - mInvestment - mExpense;

      monthlyTrends.push({
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
        profit: mProfit,
        sales: mSales,
        sell: mSales,
        investment: mInvestment,
      });
    }

    // 5. Business performance breakdown
    const businessPerformance = await Promise.all(
      businesses.map(async (b) => {
        const stats = await this.calculateBusinessStats(b._id, targetDate);
        const balance =
          (b.openingBalance || 0) +
          stats.totalSales -
          stats.totalInvestment -
          stats.totalExpenses -
          stats.totalWithdrawals;

        return {
          id: b._id,
          name: b.name,
          startDate: b.startDate,
          totalInvestment: stats.totalInvestment,
          totalSales: stats.totalSales,
          totalSell: stats.totalSales,
          totalProfit: stats.totalSales,
          netProfit: stats.netProfitLoss,
          currentBalance: balance,
          transactionCount: stats.transactionCount,
        };
      })
    );

    return {
      summary: {
        totalBusinesses,
        totalInvestment,
        totalSales,
        totalSell: totalSales,
        totalProfit: totalSales,
        netProfit,
        netProfitLoss: netProfit,
        currentEstimatedBalance,
        thisMonthProfit,
        thisMonthSales,
        thisMonthSell: thisMonthSales,
        thisMonthInvestment,
        lastMonthProfit,
        lastMonthSales,
        lastMonthInvestment,
        selectedMonth: targetDate.getMonth() + 1,
        selectedYear: targetDate.getFullYear(),
      },
      monthlyTrends,
      businessPerformance,
    };
  }
}

export const investmentService = new InvestmentService();
