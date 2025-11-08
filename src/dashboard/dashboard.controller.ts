import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Order } from '../order/order.entity.js';
import { User } from '../user/user.entity.js';
import { Product } from '../product/product.entity.js';
import { Loaded } from '@mikro-orm/core';

const em = orm.em;

// --- Helper para rango de fechas UTC completo ---
function getDateRangeUTC(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;

  // Fechas locales
  const startLocal = new Date(startDate);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(endDate);
  endLocal.setHours(23, 59, 59, 999);

  // Convertir a UTC restando el offset local
  const startUTC = new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000);
  const endUTC = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000);
  return { $gte: startUTC, $lte: endUTC };
}



// --- Filtros generales de órdenes ---
function buildOrderFilters(req: Request, excludeCancelled: boolean = true, onlyStatus?: string) {
  const { startDate, endDate } = req.query;
  const filters: any = {};

  // Filtrar por estado específico si se pasa
  if (onlyStatus) {
    filters.status = onlyStatus;
  } else if (excludeCancelled) {
    filters.status = { $ne: 'cancelled' };
  }

  // Rango de fechas UTC
  const dateRange = getDateRangeUTC(startDate as string, endDate as string);
  if (dateRange) filters.orderDate = dateRange;

  console.log('Filters:', filters);
  return filters;
}


// ----------------- VENTAS -----------------

async function getSalesByProvince(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true, 'completed'); 

    const orders = await em.find(Order, filters, {
      populate: ['user.city.province'],
    });

    const provinceSales: Record<string, number> = {};
    for (const order of orders) {
      const province = order.user?.city?.province;
      if (province) provinceSales[province.name] = (provinceSales[province.name] || 0) + 1;
    }

    const result = Object.entries(provinceSales)
      .map(([province, totalSales]) => ({ province, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);

    res.status(200).json({ message: 'Cantidad de ventas por provincia', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function getSalesByCity(req: Request, res: Response) {
  try {
    const { province } = req.query;
    if (!province) return res.status(400).json({ message: 'La provincia es requerida' });

    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders: Loaded<Order, 'user.city.province'>[] = await em.find(Order, filters, {
      populate: ['user.city.province'],
    });

    const citySales: Record<string, number> = {};
    for (const order of orders) {
      const orderProvince = order.user?.city?.province?.name;
      const orderCity = order.user?.city?.name;
      if (orderProvince === province && orderCity) citySales[orderCity] = (citySales[orderCity] || 0) + 1;
    }

    const result = Object.entries(citySales)
      .map(([city, totalSales]) => ({ city, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);

    res.status(200).json({
      message: `Cantidad de ventas por ciudad en la provincia ${province}`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function getSalesByCategory(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders = await em.find(Order, filters);

    const productIds = orders.flatMap(o => o.orderItems.map(i => i.productId));
    const products = await em.find(Product, { id: { $in: productIds } }, { populate: ['category'] });
    const productMap = new Map(products.map(p => [p.id, p]));

    const categorySales: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        const category = productMap.get(item.productId)?.category?.name ?? 'Sin categoría';
        categorySales[category] = (categorySales[category] || 0) + item.quantity;
      }
    }

    const result = Object.entries(categorySales)
      .map(([category, totalSales]) => ({ category, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);

    res.status(200).json({ message: 'Ventas por categoría', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
}

// ----------------- PRODUCTOS -----------------

async function getProductsByCategory(req: Request, res: Response) {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ message: 'La categoría es requerida' });

    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders = await em.find(Order, filters);
    const productIds = orders.flatMap(o => o.orderItems.map(i => i.productId));
    const products = await em.find(Product, { id: { $in: productIds } }, { populate: ['category'] });
    const filtered = products.filter(p => p.category?.name === category);

    const productSales: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (filtered.some(p => p.id === item.productId)) {
          productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        }
      }
    }

    const result = filtered.map(p => ({
      productId: p.id,
      name: p.name,
      totalSold: productSales[p.id || 0],
    }));

    res.status(200).json({ message: `Productos de categoría ${category}`, data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
}

async function getTopProducts(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders = await em.find(Order, filters, { populate: ['orderItems'] });

    const productSales: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      }
    }

    if (!Object.keys(productSales).length) return res.status(200).json({ message: 'No hay ventas todavía', data: [] });

    const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const products = await em.find(Product, { id: { $in: sorted.map(([id]) => id) } });

    const result = sorted.map(([productId, totalSold]) => {
      const prod = products.find(p => p.id === productId);
      return { productId, name: prod?.name ?? 'Producto desconocido', totalSold };
    });

    res.status(200).json({ message: 'Top 5 productos más vendidos', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function getWorstProducts(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders = await em.find(Order, filters, { populate: ['orderItems'] });

    const productSales: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      }
    }

    if (!Object.keys(productSales).length) return res.status(200).json({ message: 'No hay ventas todavía', data: [] });

    const sorted = Object.entries(productSales).sort((a, b) => a[1] - b[1]).slice(0, 5);
    const products = await em.find(Product, { id: { $in: sorted.map(([id]) => id) } });

    const result = sorted.map(([id, totalSold]) => {
      const prod = products.find(p => p.id === id);
      return { productId: id, name: prod?.name ?? 'Producto desconocido', totalSold };
    });

    res.status(200).json({ message: 'Top 5 peores productos', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
}

// ----------------- CLIENTES -----------------

async function getTopCustomers(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders: Loaded<Order, 'user'>[] = await em.find(Order, filters, { populate: ['user'] });

    const customerSales: Record<string, number> = {};
    for (const order of orders) {
      const userId = order.user!.id || 0;
      customerSales[userId] = (customerSales[userId] || 0) + 1;
    }

    if (!Object.keys(customerSales).length) return res.status(200).json({ message: 'No hay compras todavía', data: [] });

    const sorted = Object.entries(customerSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const users = await em.find(User, { id: { $in: sorted.map(([id]) => id) } });

    const result = sorted.map(([userId, totalSpent]) => {
      const user = users.find(u => u.id === userId);
      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Usuario desconocido',
        email: user?.email ?? null,
        totalSpent,
      };
    });

    res.status(200).json({ message: 'Top 5 clientes que más compran', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function getTopCancelledCustomers(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, false);
    filters.status = 'cancelled';

    const orders: Loaded<Order, 'user'>[] = await em.find(Order, filters, { populate: ['user'] });

    const customerCancelled: Record<string, number> = {};
    for (const order of orders) {
      const userId = order.user!.id || 0;
      customerCancelled[userId] = (customerCancelled[userId] || 0) + 1;
    }

    if (!Object.keys(customerCancelled).length) return res.status(200).json({ message: 'No hay órdenes canceladas todavía', data: [] });

    const sorted = Object.entries(customerCancelled).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const users = await em.find(User, { id: { $in: sorted.map(([id]) => id) } });

    const result = sorted.map(([userId, totalCancelled]) => {
      const user = users.find(u => u.id === userId);
      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Usuario desconocido',
        email: user?.email ?? null,
        totalCancelled,
      };
    });

    res.status(200).json({ message: 'Top 5 clientes que más cancelan órdenes', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// ----------------- ÓRDENES -----------------
async function getOrderStatusDistribution(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, false);
    const orders = await em.find(Order, filters);

    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const summary = { completed: 0, pending: 0, cancelled: 0, rescheduled: 0 };

    for (const order of orders) {
      const created = order.orderDate ? new Date(order.orderDate) : null;
      const updated = order.updatedDate ? new Date(order.updatedDate) : null;
      const rescheduleQty = Number(order.rescheduleQuantity || 0);
      
      // 1. Si la fecha de creación no está dentro del rango, se ignora
      if (!created || created < start || created > end) {
        continue;
      }

      // 2. Si no tiene fecha de actualización => pendiente
      if (!updated) {
        summary.pending++;
        continue;
      }

      // 3. Si tiene reenvíos
      if (rescheduleQty === 1 || rescheduleQty === 2) {
        summary.rescheduled++;
        continue;
      }
      if (rescheduleQty >= 3) {
        summary.cancelled++;
        continue;
      }

      // 4. Si no hay reenvíos => usar status
      if (order.status === 'completed') {
        summary.completed++;
      } else if (order.status === 'cancelled') {
        summary.cancelled++;
      } else {
        summary.pending++;
      }
    }

    res.status(200).json({ message: 'Resumen de órdenes por estado', data: summary });
  } catch (error: any) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
}

async function getRevenueOverTime(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true, 'completed'); 
    const orders = await em.find(Order, filters);

    const revenueByDate: Record<string, number> = {};
    for (const order of orders) {
      if (!order.orderDate) continue; 
      const date = order.orderDate.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + order.total;
    }

    const result = Object.entries(revenueByDate).map(([date, totalRevenue]) => ({ date, totalRevenue }));
    res.status(200).json({ message: 'Ingresos por día', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

export const controller = {
  getSalesByProvince,
  getSalesByCity,
  getSalesByCategory,
  getProductsByCategory,
  getTopProducts,
  getWorstProducts,
  getTopCustomers,
  getTopCancelledCustomers,
  getOrderStatusDistribution,
  getRevenueOverTime,
};
