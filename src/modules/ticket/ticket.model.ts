import { Schema, model, Document, Types } from "mongoose";

export interface ITicket {
  ticketId: string;
  userId: Types.ObjectId;
  userEmail: string;
  subject: string;
  status: "new" | "open" | "replied";
  adminId?: Types.ObjectId;
  adminTicketId?: string;
  reply?: string;
  dateSubmitted: Date;
}

export interface ITicketDocument extends ITicket, Document {}

const ticketSchema = new Schema<ITicketDocument>(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "TKT-" + new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 5),
    },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "Auth" },
    userEmail: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ["new", "open", "replied"], default: "new" },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    adminTicketId: { type: String, default: "" },
    reply: { type: String, default: "" },
    dateSubmitted: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


export const Ticket = model<ITicketDocument>("Ticket", ticketSchema);
