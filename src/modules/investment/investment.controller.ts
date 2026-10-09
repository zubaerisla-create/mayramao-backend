import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import { investmentService } from "./investment.service";

export class InvestmentController {
  static async getDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const data = await investmentService.getDashboardStats(userId, { month, year });
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error("[InvestmentController.getDashboard] Error:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to load dashboard" });
    }
  }

  static async getBusinesses(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const businesses = await investmentService.getBusinesses(userId);
      return res.status(200).json({ success: true, data: businesses });
    } catch (error: any) {
      console.error("[InvestmentController.getBusinesses] Error:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch businesses" });
    }
  }

  static async createBusiness(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const business = await investmentService.createBusiness(userId, req.body);
      return res.status(201).json({ success: true, data: business });
    } catch (error: any) {
      console.error("[InvestmentController.createBusiness] Error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to create business" });
    }
  }

  static async getBusinessById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const id = req.params.id as string;
      const monthStr = req.query.month as string;
      const business = await investmentService.getBusinessById(userId, id, monthStr);
      return res.status(200).json({ success: true, data: business });
    } catch (error: any) {
      console.error("[InvestmentController.getBusinessById] Error:", error);
      return res.status(404).json({ success: false, message: error.message || "Business not found" });
    }
  }

  static async updateBusiness(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const id = req.params.id as string;
      const business = await investmentService.updateBusiness(userId, id, req.body);
      return res.status(200).json({ success: true, data: business });
    } catch (error: any) {
      console.error("[InvestmentController.updateBusiness] Error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to update business" });
    }
  }

  static async deleteBusiness(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const id = req.params.id as string;
      const result = await investmentService.deleteBusiness(userId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[InvestmentController.deleteBusiness] Error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to delete business" });
    }
  }

  static async getTransactions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const businessId = req.params.businessId as string;
      const { type, search, page, limit } = req.query;

      const data = await investmentService.getTransactions(userId, businessId, {
        type: type as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error("[InvestmentController.getTransactions] Error:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch transactions" });
    }
  }

  static async createTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const businessId = req.params.businessId as string;
      const data = await investmentService.createTransaction(userId, businessId, req.body);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error("[InvestmentController.createTransaction] Error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to create transaction" });
    }
  }

  static async updateTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const transactionId = req.params.transactionId as string;
      const data = await investmentService.updateTransaction(userId, transactionId, req.body);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error("[InvestmentController.updateTransaction] Error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to update transaction" });
    }
  }

  static async deleteTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const transactionId = req.params.transactionId as string;
      const result = await investmentService.deleteTransaction(userId, transactionId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[InvestmentController.deleteTransaction] Error:", error);
      return res.status(400).json({ success: false, message: error.message || "Failed to delete transaction" });
    }
  }
}
