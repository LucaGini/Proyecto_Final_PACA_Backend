import { Router } from "express";
import { controller } from "./auth.controller.js";
import { onlyAnonymous } from "../auth/authMiddleware.js";

export const authRouter = Router();

authRouter.post('/password/recovery',onlyAnonymous, controller.resetPassword);
authRouter.post('/login',onlyAnonymous, controller.loginUser)

