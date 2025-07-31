import { Router } from "express";
import { controller } from "./product.controller.js";
import { uploadToCloudinary } from "../shared/db/image_processor/cloudinary_middleware.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const productRouter = Router();

productRouter.get('/search', controller.search);
productRouter.get('/:id', controller.findOne);
productRouter.get('/product/:name', authenticateAdmin,controller.findProductByName);
productRouter.get('/', controller.findAll);
productRouter.post('/', uploadToCloudinary.single('image'), authenticateAdmin, controller.add);
productRouter.put('/:id', uploadToCloudinary.single('image'), authenticateAdmin, controller.update);
productRouter.get('/:id/verify-stock', controller.verifyStock);
productRouter.delete('/:id', authenticateAdmin, controller.remove);