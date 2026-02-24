import { Request, Response } from "express";
import { TicketService } from "./ticket.service";
import { AdminRequest } from "../admin/admin.controller";
import { AuthRequest } from "../../middleware/authMiddleware";

// user creates a ticket via contact form
const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { fullName, email, description } = req.body || {};
    if (!email || !description) {
      return res.status(400).json({ success: false, message: "Email and description are required" });
    }

    const ticket = await TicketService.createTicket(userId, email, description);
    res.status(201).json({ success: true, ticket });
  } catch (error: any) {
    console.error("createTicket error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

// admin lists tickets
const listTickets = async (req: AdminRequest, res: Response) => {
  try {
    const tickets = await TicketService.getAllTickets();
    res.status(200).json({ success: true, tickets });
  } catch (error: any) {
    console.error("listTickets error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

// admin get ticket detail
const getTicket = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const ticket = await TicketService.getTicketById(id);
    res.status(200).json({ success: true, ticket });
  } catch (error: any) {
    console.error("getTicket error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

// admin reply to ticket
const replyTicket = async (req: AdminRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reply } = req.body || {};
    if (!reply) return res.status(400).json({ success: false, message: "Reply text required" });
    const adminId = req.admin?.id as string;
    const ticket = await TicketService.replyToTicket(id, adminId, reply);
    res.status(200).json({ success: true, ticket });
  } catch (error: any) {
    console.error("replyTicket error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const TicketController = { createTicket, listTickets, getTicket, replyTicket };