import { Router } from "express";
import { controller } from "./cron.controller.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const cronRouter = Router();

cronRouter.get('/', controller.getLatestCron);
cronRouter.post('/createCron', controller.createCron);
