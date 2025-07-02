import { Router } from "express";
import { controller } from "./category.controller.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const categoryRouter = Router();

categoryRouter.get('/:name/products', controller.findProductsByCategory);
categoryRouter.get('/:name', authenticateAdmin, controller.findCategoryByName); 
categoryRouter.get('/', controller.findAll);
categoryRouter.get('/:id', controller.findOne);
categoryRouter.post('/', authenticateAdmin, controller.add); 
categoryRouter.put('/:id', authenticateAdmin, controller.update);
categoryRouter.delete('/:id', authenticateAdmin, controller.remove);

