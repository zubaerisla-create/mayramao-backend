import { Ticket, ITicket } from "./ticket.model";
import { Types } from "mongoose";
import { transporter } from "../../config/mailer"; // for sending emails

const createTicket = async (userId: string, userEmail: string, subject: string) => {
  if (!userId || !userEmail || !subject) {
    throw new Error("userId, email and subject are required");
  }
  const oid = new Types.ObjectId(userId);
  const ticket = new Ticket({ userId: oid, userEmail, subject });
  await ticket.save();
  return ticket.toObject();
};

const getAllTickets = async () => {
  return Ticket.find().lean();
};

const getTicketById = async (id: string) => {
  const ticketDoc = await Ticket.findOne({ ticketId: id });
  if (!ticketDoc) throw new Error("Ticket not found");
  // if admin is looking at it and hasn't replied yet, mark as open
  if (ticketDoc.status === "new") {
    ticketDoc.status = "open";
    await ticketDoc.save();
  }
  return ticketDoc.toObject();
};

const replyToTicket = async (id: string, adminId: string, reply: string) => {
  const ticket = await Ticket.findOne({ ticketId: id });
  if (!ticket) throw new Error("Ticket not found");
  ticket.reply = reply;
  ticket.status = "replied";
  ticket.adminId = new Types.ObjectId(adminId);
  ticket.adminTicketId = "ADM-" + new Date().getTime().toString(36) + Math.random().toString(36).substr(2,5);

  // persist changes before sending mail
  await ticket.save();

  // send email notification to user
  try {
    await transporter.sendMail({
      from: `"Mayramao Support" <${process.env.EMAIL_USER}>`,
      to: ticket.userEmail,
      subject: `Re: your ticket ${ticket.ticketId}`,
      html: `<p>Dear user,</p><p>Thank you for contacting us. Below is our response:</p><blockquote>${reply}</blockquote><p>Best regards,<br/>Support Team</p>`,
    });
    console.log(`Reply email sent to ${ticket.userEmail}`);
  } catch (err) {
    console.error("Failed to send ticket reply email:", err);
    // do not interrupt flow
  }

  return ticket.toObject();
};

export const TicketService = {
  createTicket,
  getAllTickets,
  getTicketById,
  replyToTicket,
};