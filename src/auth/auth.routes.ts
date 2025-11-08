import { Router } from "express";
import { controller } from "./auth.controller.js";
import { onlyAnonymous } from "../auth/authMiddleware.js";
//import passport from "./passport.config.js";
import { oauthController } from "./oauth.controller.js";

export const authRouter = Router();

authRouter.post('/password/recovery',onlyAnonymous, controller.resetPassword);
authRouter.post('/login',onlyAnonymous, controller.loginUser)
authRouter.post('/google/verify', onlyAnonymous, controller.verifyGoogleToken);