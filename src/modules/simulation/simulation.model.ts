import { Schema, model, Document, Types } from "mongoose";

export interface ISimulationDocument extends Document {
  userId: Types.ObjectId | string;
  profileSnapshot: any;
  requestPayload: any;
  aiResponse: any;
  createdAt: Date;
  updatedAt: Date;
}

const simulationSchema = new Schema<ISimulationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "Auth" },
    profileSnapshot: { type: Schema.Types.Mixed, default: {} },
    requestPayload: { type: Schema.Types.Mixed, default: {} },
    aiResponse: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Simulation = model<ISimulationDocument>("Simulation", simulationSchema);
