import { Router } from "express";
import { controller} from "./vrp.controller.js";
import { authenticateRoles } from "../auth/authMiddleware.js";

export const vrpRouter = Router();

vrpRouter.get('/routes/weekly',authenticateRoles('administrador', 'transportista'), controller.getLatestWeeklyRoutes);
