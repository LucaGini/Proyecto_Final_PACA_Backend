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

    const user = await em.findOneOrFail(User, {id: userId}, {populate: ['city']});

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const allOrders = await em.find(Order, {}, {
      orderBy: { orderNumber: 'DESC' },
      fields: ['orderNumber'],
      limit: 1
    });
    
    const lastOrder = allOrders.length > 0 ? allOrders[0] : null;
    
    let sequentialNumber = 1;
    
    if (lastOrder?.orderNumber) {
      const currentYearMonth = `${year}${month}`;
      const lastOrderYearMonth = lastOrder.orderNumber.substring(0, 6);
      
      if (lastOrderYearMonth === currentYearMonth) {
        const lastSequential = parseInt(lastOrder.orderNumber.substring(6));
        sequentialNumber = lastSequential + 1;
      }
    }
    
    // Formato: YYYYMM + número secuencial (6 dígitos)
    const orderNumber = `${year}${month}${String(sequentialNumber).padStart(6, '0')}`;

    const orderItemsWithProduct = await Promise.all( /// DESDE ACÁ HASTA EL CREATE, ES PARA LA ACTUALIZACIÓN DEL STOCK 
      orderItems.map(async (item: any) => { 
        const product = await em.findOneOrFail(Product, { id: item.productId });

         if (!product.isActive) {
          const error = new Error(`El producto "${product.name}" ya no se encuentra a la venta.`);
          (error as any).statusCode = 409; // o algún código que uses para conflicto
          throw error;
        }
        
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
      orderNumber,
      status: 'pending',
      orderDate: new Date(),
      user,
      orderItems: orderItemsWithProduct,
      total,
      rescheduleQuantity: 0
    });

    await em.persistAndFlush(order);

    // Enviar email de confirmación de compra
    try {
      // Obtener los nombres de los productos para el email
      const orderItemsWithNames = await Promise.all(
        orderItemsWithProduct.map(async (item) => {
          const product = await em.findOne(Product, { id: item.productId });
          return {
            productName: product?.name || 'Producto no encontrado',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal
          };
        })
      );

      await mailService.sendOrderConfirmationEmail(
        user.email,
        user.firstName,
        {
          orderNumber: order.orderNumber,
          orderDate: order.orderDate!,
          total: order.total,
          orderItems: orderItemsWithNames,
          cityName: user.city?.name || '',
          citySurcharge: user.city?.surcharge || 0
        }
      );
      
      console.log('Order confirmation email sent to:', user.email);
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // No fallar la creación de la orden si el email falla
    }

    res.status(201).json({message: 'Order created successfully', data: order});
  } catch (error: any){
    res.status(404).json({message: error.message});
  }
}

async function update(req: Request, res: Response) {
  try {
    const order = await em.findOneOrFail(Order, { id: req.params.id });

    const { status, orderItems } = req.body;
    if (status === 'in distribution') {
      const cancelResult = await inDistributionOrder(order);
      if (!cancelResult.success) {
        return res.status(400).json({ message: cancelResult.message });
      }
    }

    if (status === 'cancelled') {
      const cancelResult = await cancelOrder(order);
      if (!cancelResult.success) {
        return res.status(400).json({ message: cancelResult.message });
      }
    }

    if (status === 'completed') {
      const completeResult = await completeOrder(order);
      if (!completeResult.success) {
        return res.status(400).json({ message: completeResult.message });
      }
    }

    if (status === 'rescheduled') {
      const rescheduledResult = await rescheduledOrder(order);
      if (!rescheduledResult.success) {
        return res.status(400).json({ message: rescheduledResult.message });
      }
    }
  
    //if (status) order.status = status;
 
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
  order.updatedDate = new Date();
  order.status = 'cancelled';
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
      await mailService.sendOrderCancellationEmail(user.email, order.orderNumber);
    }
  }

  await em.persistAndFlush(order);
  return { success: true };
}

async function completeOrder(order: Order) {
  try {
    order.updatedDate = new Date();
    order.status = 'completed';
    if (order.user && order.user._id) {
      const user = await em.findOne(User, { id: order.user._id.toString() });
      if (user?.email) {
        await mailService.sendOrderCompletionEmail(user.email, order.orderNumber);
      }
    }

    await em.persistAndFlush(order);
    return { success: true };
  } catch (error) {
    console.error('Error completing order:', error);
    return { success: false, message: 'Error al completar la orden' };
  }
}

async function rescheduledOrder(order: Order) {
  try {
    order.updatedDate = new Date();
    order.rescheduleQuantity = (order.rescheduleQuantity || 0) + 1;
    if (order.rescheduleQuantity >= 2) {
      return await cancelOrder(order);
    } else {
      order.status = 'rescheduled';
      if (order.user && order.user._id) {
        const user = await em.findOne(User, { id: order.user._id.toString() });
        if (user?.email) {
          await mailService.sendOrderRescheduleEmail(user.email, order.orderNumber, order.rescheduleQuantity);
        }
      }
    }

    await em.persistAndFlush(order);
    return { success: true };
  } catch (error) {
    console.error('Error in rescheduledOrder:', error);
    return { success: false, message: 'Error al procesar reschedule' };
  }
}

async function inDistributionOrder(order: Order) {
  try {
    order.updatedDate = new Date();
    order.status = 'in distribution';
    if (order.user && order.user._id) {
      const user = await em.findOne(User, { id: order.user._id.toString() });
      if (user?.email) {
        await mailService.sendOrderInDistributionEmail(user.email, order.orderNumber);
      }
    }

    await em.persistAndFlush(order);
    return { success: true };
  } catch (error) {
    console.error('Error in inDistributionOrder:', error);
    return { success: false, message: 'Error al poner en distribución' };
  }
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

async function findByOrderNumber(req: Request, res: Response) {
  try {
    const orderNumber = req.params.orderNumber;
    const order = await em.findOneOrFail(Order, { orderNumber }, {
      populate: ['user'],
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
    
    res.status(200).json({ message: 'Order found successfully', data: order });
  } catch (error: any) {
    res.status(404).json({ message: 'Order not found' });
  }
}

async function bulkUpdateStatus(req: Request, res: Response) {
  try {
    const { orderIds, status } = req.body;

    if (!Array.isArray(orderIds) || !status) {
      return res.status(400).json({ message: 'orderIds array and status are required' });
    }

    const orders = await em.find(Order, { id: { $in: orderIds } });

    if (!orders.length) {
      return res.status(404).json({ message: 'No orders found for given IDs' });
    }

    for (const order of orders) {
      console.log(`Processing bulk update for order ${order.id} → ${status}`);

      if (status === 'completed') {
        const completeResult = await completeOrder(order);
        if (!completeResult.success) {
          return res.status(400).json({ message: completeResult.message });
        }
      }

      if (status === 'rescheduled') {
        const rescheduledResult = await rescheduledOrder(order);
        if (!rescheduledResult.success) {
          return res.status(400).json({ message: rescheduledResult.message });
        }
      }

      order.updatedDate = new Date();
    }

    await em.persistAndFlush(orders);

    res.status(200).json({
      message: `Orders updated to status "${status}" successfully`,
      data: orders
    });
  } catch (error: any) {
    console.error("Error in bulkUpdateStatus:", error);
    res.status(500).json({ message: error.message });
  }
}

export {
  rescheduledOrder,
  inDistributionOrder
}

export const controller = {
  findAll,
  findOne,
  create,
  update,
  remove,
  findOrdersByEmail,
  findByOrderNumber,
  bulkUpdateStatus
}
