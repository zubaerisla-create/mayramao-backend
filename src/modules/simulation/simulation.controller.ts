import { Request, Response } from "express";
import { SimulationService } from "./simulation.service";

const createSimulation = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "userId required" });

  try {
    const sim = await SimulationService.runSimulationForUser(userId);
    return res.json({ success: true, simulation: sim });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'simulation failed' });
  }
};

const getUserSimulations = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const sims = await SimulationService.getSimulationsByUser(userId);
    return res.json({ success: true, simulations: sims });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'fetch failed' });
  }
};

export const SimulationController = { createSimulation, getUserSimulations };
