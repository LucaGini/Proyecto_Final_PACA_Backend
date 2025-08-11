import express, { Request, Response } from 'express';
import { User } from './user.entity.js';
import { orm } from '../shared/db/orm.js';
import bcrypt from 'bcrypt';
import { Order } from '../order/order.entity.js';
import { Product } from '../product/product.entity.js';
import { MailService } from '../auth/mail.service.js';

const em = orm.em.fork();
const mailService = new MailService();

async function findAll(req: Request, res: Response){
  try {
    const isActiveParam = req.query.isActive;
    const searchTerm = req.query.q?.toString().trim().toLowerCase();

    const filter: any = {
      privilege: 'cliente' 
    };
 
    if (isActiveParam === 'true') {
      filter.isActive = true;
    } else if (isActiveParam === 'false') {
      filter.isActive = false;
    }

    if (searchTerm) {
      filter.$or = [
        { firstName: { $ilike: `%${searchTerm}%` } },
        { lastName: { $ilike: `%${searchTerm}%` } },
        { email: { $ilike: `%${searchTerm}%` } }
      ];
    }

    const users = await em.find(User, filter);
    res.json({ data: users });
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

async function findOne(req: Request, res: Response){
  try{
  const id = req.params.id;
  const user = await em.findOneOrFail(User, {id});
  res
    .status(200)
    .json({message: 'found one user', data: user});
  }
  catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function update(req: Request, res: Response){  
  try{
    const id = req.params.id;
    const existingUser = await em.findOne(User, { id });
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const newEmail = req.body.name;
      if (newEmail !== existingUser.email) {
        const duplicateUser = await em.findOne(User, { email: newEmail });
        if (duplicateUser) {
          return res.status(400).json({ message: 'Error', error: 'The new name is already used' });
        }
      }
      const updatedData = req.body;

      if (updatedData.password && updatedData.password !== existingUser.password) {
        const salt = await bcrypt.genSalt(10);
        updatedData.password = await bcrypt.hash(updatedData.password, salt);
      }
  
      em.assign(existingUser, updatedData);
    await em.flush();
    res
      .status(200)
      .json({message: 'user updated', data: existingUser});
  }
  catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

async function forceCancelOrder(order: Order) {
  for (const item of order.orderItems) {
    const product = await em.findOne(Product, { id: item.productId });
    if (product) {
      product.stock += item.quantity; // Devolver stock
      await em.persistAndFlush(product);
    }
  }

  if (order.user && order.user._id) {
    const user = await em.findOne(User, { id: order.user._id.toString() });
  }

  order.status = 'cancelled';
  order.updatedDate = new Date();
  await em.persistAndFlush(order);
}

export async function softDeleteUser(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const user = await em.findOne(User, { id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.privilege === 'administrador') {
      return res.status(400).json({ message: 'Cannot deactivate an admin user' }); 
    }

    const pendingOrders = await em.find(Order, {
      user: user,
      status: 'pending'
    });

    for (const order of pendingOrders) {
      await forceCancelOrder(order);
    }
    
    user.isActive = false;
    await em.persistAndFlush(user);

    // Enviar email de despedida
    try {
      const mailService = new MailService();
      await mailService.sendGoodbyeEmail(user.email, user.firstName);
    } catch (mailError) {
      console.error('Error sending goodbye email:', mailError);
    }

    return res.status(200).json({ 
      message: 'User deactivated and pending orders cancelled successfully. Goodbye email sent.' 
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

async function signUp(req: Request, res: Response) {
  try {
    const userData = req.body;
    const existingUser = await em.findOne(User, { email: userData.email });
    if (existingUser) {
      return res.status(303).json({ message: 'Error', error: 'The user already exists' });
    }

    // Check if city is required based on privilege
    if (userData.privilege !== 'administrador' && !userData.city) {
      return res.status(400).json({ message: 'Error', error: 'City is required for non-admin users' });
    }

    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(userData.password, salt);

    const user = em.create(User, userData);
    await em.flush();

    try {
      await mailService.sendWelcomeEmail(userData.email, userData.firstName);
    } catch (mailError) {
      console.error('Error enviando correo de bienvenida:', mailError);
    }

    res.status(201).json({ message: 'User created successfully', data: user });
  } 
  catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

async function findUserByEmail(req: Request, res: Response){
  try {
    const email = req.query.email as string;
    const user = await em.findOne(User, { email });

    if (user) {
      res.status(404).json({ message: 'found one user', data: user });
    } else {
      res.status(200).json({ message: 'user not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

async function updatePassword(req: Request, res: Response) {
  try {
    const { email, password: password } = req.body;
    const user = await em.findOne(User, { email });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await em.persistAndFlush(user);

    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } 
  catch (error:any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

  
  export const controller = {  
    findAll, 
    findOne,
    update,
    softDeleteUser,
    signUp,
    findUserByEmail,
    updatePassword

  };
