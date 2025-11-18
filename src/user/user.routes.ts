import { Router } from "express";
import { controller } from "./user.controller.js";
import { authenticateClient, onlyAnonymous } from "../auth/authMiddleware.js";

export const userRouter = Router();

userRouter.get('/', controller.findAll);
userRouter.put('/update-password',onlyAnonymous, controller.updatePassword);
userRouter.get('/by-email', controller.findUserByEmail);
userRouter.delete('/:id', controller.softDelete);
userRouter.get('/:id', controller.findOne);
userRouter.put('/:id', controller.update);
userRouter.post('/', controller.signUp);