import express from "express";
import { authenticate } from "../../middleware/authMiddleware";
import { InvestmentController } from "./investment.controller";

const router = express.Router();

// All investment routes require authentication
router.use(authenticate);

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get("/dashboard", InvestmentController.getDashboard);

// ─── Business Management ─────────────────────────────────────────────────────
router.get("/businesses", InvestmentController.getBusinesses);
router.post("/businesses", InvestmentController.createBusiness);
router.get("/businesses/:id", InvestmentController.getBusinessById);
router.put("/businesses/:id", InvestmentController.updateBusiness);
router.delete("/businesses/:id", InvestmentController.deleteBusiness);

// ─── Transaction Management ──────────────────────────────────────────────────
router.get("/businesses/:businessId/transactions", InvestmentController.getTransactions);
router.post("/businesses/:businessId/transactions", InvestmentController.createTransaction);
router.put("/transactions/:transactionId", InvestmentController.updateTransaction);
router.delete("/transactions/:transactionId", InvestmentController.deleteTransaction);

export const InvestmentRoutes = router;
