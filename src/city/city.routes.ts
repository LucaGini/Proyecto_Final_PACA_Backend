import { Router } from "express";
import { controller } from "./city.controller.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const cityRouter = Router();

cityRouter.get('/:postCode/users', authenticateAdmin,controller.findUsersByCity);
cityRouter.get('/postCode/:postCode', authenticateAdmin, controller.findCityByPostCode);
cityRouter.get('/:id', controller.findOne);
cityRouter.get('/', controller.findAll);
cityRouter.post('/', authenticateAdmin, controller.add); 
cityRouter.put('/:id', authenticateAdmin, controller.update);
cityRouter.delete('/:id', authenticateAdmin, controller.remove);
