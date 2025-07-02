import { Router } from "express";
import { controller } from "./user.controller.js";
import { authenticateClient } from "../auth/authMiddleware.js";

export const userRouter = Router();

userRouter.get('/', controller.findAll);
userRouter.put('/update-password', controller.updatePassword);
userRouter.get('/by-email', controller.findUserByEmail);
userRouter.delete('/:id', authenticateClient, controller.remove);
userRouter.get('/:id', controller.findOne);
userRouter.put('/:id',authenticateClient, controller.update);
userRouter.post('/', controller.signUp);