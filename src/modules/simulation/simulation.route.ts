import express from "express";
import { SimulationController } from "./simulation.controller";

const router = express.Router();

// POST /api/v1/simulations  { userId }
router.post("/", SimulationController.createSimulation);

// GET /api/v1/simulations/user/:userId
router.get("/user/:userId", SimulationController.getUserSimulations);

export const SimulationRoutes = router;
