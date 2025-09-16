import { Router } from "express";
import { controller } from "./order.controller.js";
import { blockRoleIfLogged,authenticateAdmin,authenticateClient,authenticateDriver } from "../auth/authMiddleware.js";

export const orderRouter = Router();

orderRouter.put('/bulk-status', controller.bulkUpdateStatus);
orderRouter.get('/user/email/:email', authenticateClient,controller.findOrdersByEmail);
orderRouter.get('/number/:orderNumber', controller.findByOrderNumber);
orderRouter.get('/in-distribution',authenticateDriver, controller.findInDistribution); // lo haría el transportista
orderRouter.get('/', controller.findAll);
orderRouter.get('/:id', controller.findOne);
orderRouter.post('/',blockRoleIfLogged, controller.create);
orderRouter.put('/:id', controller.update);
orderRouter.delete('/:id', authenticateAdmin, controller.remove);
