import { Router } from "express";
import { controller} from "./vrp.controller.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const vrpRouter = Router();

vrpRouter.get('/routes/weekly',authenticateAdmin, controller.getLatestWeeklyRoutes);
