import { Request, Response } from "express";
import { SimulationService } from "./simulation.service";
import { UserProfile } from "../user/user.model";
import { Types } from "mongoose";

const createSimulation = async (req: Request, res: Response) => {
  const { userId, purchaseSimulation } = req.body;

  if (!userId) return res.status(400).json({ success: false, message: "userId required" });

  if (!Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  try {
    const oid = new Types.ObjectId(userId);
    const filter = { $or: [{ userId }, { userId: oid }] };

    if (purchaseSimulation) {
      // Update user's profile with the new purchaseSimulation
      await UserProfile.findOneAndUpdate(
        filter,
        { $set: { purchaseSimulation } },
        { upsert: false } // don't create if not exists
      );
    }

    const sim = await SimulationService.runSimulationForUser(userId, purchaseSimulation);
    return res.json({ success: true, simulation: sim });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'simulation failed' });
  }
};

const getUserSimulations = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const sims = await SimulationService.getSimulationsByUser(userId as string);
    return res.json({ success: true, simulations: sims });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'fetch failed' });
  }
};

export const SimulationController = { createSimulation, getUserSimulations };
