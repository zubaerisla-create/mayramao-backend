import express from "express";
import { TicketController } from "./ticket.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { adminAuthMiddleware } from "../../middleware/adminAuthMiddleware";

const router = express.Router();

// user creates ticket (invoked by contact form)
router.post("/", authenticate, TicketController.createTicket);

// admin routes
router.get("/", adminAuthMiddleware, TicketController.listTickets);
router.get("/:id", adminAuthMiddleware, TicketController.getTicket);
router.put("/:id/reply", adminAuthMiddleware, TicketController.replyTicket);

export const TicketRoutes = router;