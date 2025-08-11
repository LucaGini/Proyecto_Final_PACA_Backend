import { Router } from "express";
import { controller } from "./product.controller.js";
import { uploadToCloudinary } from "../shared/db/image_processor/cloudinary_middleware.js";
import { authenticateAdmin } from "../auth/authMiddleware.js";

export const productRouter = Router();

productRouter.get('/all/products',authenticateAdmin, controller.findAll);               
productRouter.get('/search', controller.search);             
productRouter.get('/product/:name', authenticateAdmin, controller.findProductByName); 
productRouter.patch('/:id/reactivate', authenticateAdmin, controller.reactivateProduct);
productRouter.get('/:id/verify-stock', controller.verifyStock);
productRouter.delete('/:id', authenticateAdmin, controller.softDeleteProduct);
productRouter.get('/', controller.findAllActive);
productRouter.get('/:id', controller.findOne);
productRouter.post('/', uploadToCloudinary.single('image'), authenticateAdmin, controller.add);
productRouter.put('/:id', uploadToCloudinary.single('image'), authenticateAdmin, controller.update);
