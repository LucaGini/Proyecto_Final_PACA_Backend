process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //ver de eliminar esta linea en producción

import 'reflect-metadata';
import cors from 'cors';
import express, { Request, Response, NextFunction} from 'express';
import { categoryRouter } from './category/category.routes.js'
import { supplierRouter } from './supplier/supplier.routes.js';
import { provinceRouter } from './province/province.routes.js';
import { userRouter } from './user/user.routes.js';
import { cityRouter } from './city/city.routes.js';
import { orm } from './shared/db/orm.js';
import { RequestContext } from '@mikro-orm/core';
import { productRouter } from './product/product.routes.js';
import { authRouter } from './auth/auth.routes.js';
import { chatbotRouter } from './chatbot/chatbot.routes.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { orderRouter } from './order/order.routes.js';
import dotenv from 'dotenv';
import { createDefaultAdmin } from './user/admin.seed.js';
import { vrpRouter } from './vrp/vrp.routes.js';
import {dashboardRouter} from './dashboard/dashboard.routes.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


app.use(cors({
  origin: 'http://localhost:4200'
}));

const secret_key = process.env.JWT_SECRET || 'default_secret';

//luego de los middlewares base
app.use((req: Request, res: Response, next) => {
  RequestContext.create(orm.em, next)
})


//antes de las rutas y middlewares de negocio
app.use('/api/categories', categoryRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/provinces', provinceRouter);
app.use('/api/users', userRouter);
app.use('/api/cities', cityRouter);
app.use('/api/products', productRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/vrp', vrpRouter);
app.use('/api/dashboard', dashboardRouter);

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

// Ya no necesitamos servir archivos estáticos porque usamos Cloudinary
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((_, res) => {
  return res.status(404).send({message: 'Resource not found!'});
});

const PORT = process.env.PORT || 0;

app.listen(PORT, async () => {
  console.log('Server running on https://localhost:3000');
  await createDefaultAdmin();
});