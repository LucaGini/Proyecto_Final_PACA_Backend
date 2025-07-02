import { Router } from "express";
import { controller } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post('/password/recovery', controller.resetPassword);
authRouter.post('/login', controller.loginUser)

