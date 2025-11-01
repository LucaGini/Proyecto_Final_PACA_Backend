import { Router } from "express";
import { controller} from "./province.controller.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const provinceRouter = Router();

provinceRouter.post('/findByPassword', controller.findProvinceByPassword);
provinceRouter.get('/:name', authenticateAdmin,controller.findProvinceByName); 
provinceRouter.get('/cities/:id', controller.findCitiesByProvince);
provinceRouter.get('/', controller.findAll);
provinceRouter.get('/:id', controller.findOne);
provinceRouter.post('/', authenticateAdmin, controller.add); 
provinceRouter.patch('/:id', authenticateAdmin, controller.update);
provinceRouter.delete('/:id', authenticateAdmin, controller.remove);
