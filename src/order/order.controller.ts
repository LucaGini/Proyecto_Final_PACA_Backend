import express, { Request, Response, NextFunction } from 'express';
import { Order } from './order.entity.js';
import { orm } from '../shared/db/orm.js';
import { User } from '../user/user.entity.js';
import { Product } from '../product/product.entity.js';
import { MailService } from '../auth/mail.service.js';

const mailService = new MailService();
const em = orm.em;

async function findAll(req: Request, res: Response){
  try{
    const orders = await em.find(Order, {}, {populate: ['user'],
      fields: [
        '*',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.street',
        'user.streetNumber',
        'user.city'
      ]
    });
    res.status(200).json({message: 'Orders found successfully', data: orders});
  } catch (error: any){
    res.status(404).json({message: error.message});
  }
}

async function findOne(req: Request, res: Response){
  try{
    const order = await em.findOneOrFail(Order, {id: req.params.id}, {populate: ['user'],
      fields: [
        '*',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.street',
        'user.streetNumber',
        'user.city'
      ]
    });
    res.status(200).json({message: 'Order found successfully', data: order});
  } catch (error: any){
    res.status(404).json({message: 'Order not found'});
  }
}

async function create(req: Request, res: Response){
  try{
    const {userId, orderItems, total} = req.body;

    const user = await em.findOneOrFail(User, {id: userId});

    const orderItemsWithProduct = await Promise.all( /// DESDE ACÁ HASTA EL CREATE, ES PARA LA ACTUALIZACIÓN DEL STOCK 
      orderItems.map(async (item: any) => { 
        const product = await em.findOneOrFail(Product, { id: item.productId });
        
        if (product.stock < item.quantity) { // con el verifyStock ya nos aceguramis de que no entre acá, quiza se pueda sacar 
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
        
        product.stock -= item.quantity;
        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        };
      })
    );

    const order = em.create(Order, {
      status: 'pending',
      orderDate: new Date(),
      user,
      orderItems: orderItemsWithProduct,
      total,
    });

    await em.persistAndFlush(order);
    res.status(201).json({message: 'Order created successfully', data: order});
  } catch (error: any){
    res.status(404).json({message: error.message});
  }
}

async function update(req: Request, res: Response) {
  try {
    const order = await em.findOneOrFail(Order, { id: req.params.id });

    const { status, orderItems } = req.body;

    if (status === 'cancelled') {
      const cancelResult = await cancelOrder(order);
      if (!cancelResult.success) {
        return res.status(400).json({ message: cancelResult.message });
      }
    }

    if (status) order.status = status;

    if (orderItems) {
      order.orderItems = orderItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      }));
      order.total = orderItems.reduce((acc: number, item: any) => acc + item.subtotal, 0);
    }

    order.updatedDate = new Date();
    await em.persistAndFlush(order);

    res.status(200).json({ message: 'Order updated successfully', data: order });
  } catch (error: any) {
    res.status(404).json({ message: 'Order not found' });
  }
}

async function cancelOrder(order: Order) {
  const orderDate = order.orderDate || new Date();
  const now = new Date();
  const timeDiff = now.getTime() - orderDate.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff > 24) { 
    return { success: false, message: 'La orden solo puede cancelarse dentro de un día de su creación.' };
  }

  for (const item of order.orderItems) {
    const product = await em.findOne(Product, { id: item.productId });
    if (product) {
      product.stock += item.quantity;
      await em.persistAndFlush(product);
    }
  }

  if (order.user && order.user._id) {
    const user = await em.findOne(User, { id: order.user._id.toString() });

    if (user?.email) {
      console.log('Sending order cancellation email to:', user.email);
      await mailService.sendOrderCancellationEmail(user.email, orderDate);
    } else {
      console.warn('No email found for user:', order.user._id.toString());
    }
  } else {
    console.warn('Order has no associated user or user ID');
  }

  return { success: true };
}

async function remove(req: Request, res: Response){
  try{
    const order = await em.findOneOrFail(Order, {id: req.params.id});
    await em.removeAndFlush(order);
    res.status(200).json({message: 'Order deleted successfully', data: order});
  } catch (error: any){
    res.status(404).json({message: 'Order not found'});
  }
}

async function findOrdersByEmail(req: Request, res: Response) {
  try {
    const userEmail = req.params.email;
    const user = await em.findOne(User, { email: userEmail });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const orders = await em.find(Order, { user: user.id }, {
      populate: ['orderItems'],
      fields: ['*']
    });
    
    res.status(200).json({ message: 'Orders found successfully', data: orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export const controller = {
  findAll,
  findOne,
  create,
  update,
  remove,
  findOrdersByEmail
}
