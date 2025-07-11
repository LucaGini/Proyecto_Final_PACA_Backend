import { Router } from "express";
import { controller } from "./auth.controller.js";
import { authenticateClient } from "../auth/authMiddleware.js";

export const authRouter = Router();

authRouter.post('/password/recovery',authenticateClient, controller.resetPassword);
authRouter.post('/login', controller.loginUser)

