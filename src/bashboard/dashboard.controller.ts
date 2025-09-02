import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Order } from '../order/order.entity.js';
import { User } from '../user/user.entity.js';
import { Product } from '../product/product.entity.js';
import { Loaded } from '@mikro-orm/core';

const em = orm.em;

// ESTOS SON LOS FILTROS EN GENERAL 
function buildOrderFilters(req: Request, excludeCancelled: boolean = true) {
  const { startDate, endDate } = req.query;
  const filters: any = {};

  if (excludeCancelled) {
    filters.status = { $ne: 'cancelled' };
  }

  if (startDate && endDate) {
    filters.orderDate = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  }

  return filters;
}

///VTAS ///

// Ventas por provincia
async function getSalesByProvince(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true);

    const orders = await em.find(Order, filters, {
      populate: ['user.city.province'],
    });

    const provinceSales: Record<string, number> = {};

    for (const order of orders) {
      const province = order.user?.city?.province;
      if (province) {
        const name = province.name;
        provinceSales[name] = (provinceSales[name] || 0) + 1;
      }
    }

    const result = Object.entries(provinceSales)
      .map(([province, totalSales]) => ({ province, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);

    res.status(200).json({ message: 'Cantidad de ventas por provincia', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// Ventas por ciudad en una provincia
async function getSalesByCity(req: Request, res: Response) {
  try {
    const { province } = req.query;
    if (!province) {
      return res.status(400).json({ message: 'La provincia es requerida' });
    }

    const filters = buildOrderFilters(req, true);
    const orders: Loaded<Order, 'user.city.province'>[] = await em.find(Order, filters, {
      populate: ['user.city.province'],
    });

    const citySales: Record<string, number> = {};

    for (const order of orders) {
      const orderProvince = order.user?.city?.province?.name;
      const orderCity = order.user?.city?.name;

      if (orderProvince === province && orderCity) {
        citySales[orderCity] = (citySales[orderCity] || 0) + 1;
      }
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

// Ventas por categoría
async function getSalesByCategory(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true);
    const orders = await em.find(Order, filters); // sin populate

    const productIds = orders.flatMap(order => order.orderItems.map(i => i.productId));

    const products = await em.find(Product, { id: { $in: productIds } }, { populate: ['category'] });

    const productMap = new Map(products.map(p => [p.id, p]));

    const categorySales: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        const prod = productMap.get(item.productId);
        const category = prod?.category?.name ?? 'Sin categoría';
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

// Productos por categoría seleccionada
async function getProductsByCategory(req: Request, res: Response) {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ message: 'La categoría es requerida' });

    const filters = buildOrderFilters(req, true);
    const orders = await em.find(Order, filters); // sin populate

    const productIds = orders.flatMap(order => order.orderItems.map(i => i.productId));

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

// Ingresos en el tiempo (para líneas)
async function getRevenueOverTime(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const filters: any = { status: 'completed' };

    if (startDate && endDate) {
      filters.orderDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const orders = await em.find(Order, filters);

    const revenueByDate: Record<string, number> = {};

    for (const order of orders) {
      const dateKey = order.orderDate?.toISOString().split('T')[0] || 0; 
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + order.total;
    }

    const result = Object.entries(revenueByDate)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.status(200).json({
      message: 'Ingresos por día',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

///PRODUCTOS ///

// Top productos más vendidos
async function getTopProducts(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true);

    const orders = await em.find(Order, filters, { populate: ['orderItems'] });

    const productSales: Record<string, number> = {};

    for (const order of orders) {
      for (const item of order.orderItems) {
        productSales[item.productId] =
          (productSales[item.productId] || 0) + item.quantity;
      }
    }

    if (Object.keys(productSales).length === 0) {
      return res.status(200).json({ message: 'No hay ventas todavía', data: [] });
    }

    const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);

    const products = await em.find(Product, {
      id: { $in: top5.map(([id]) => id) },
    });

    const result = top5.map(([productId, totalSold]) => {
      const prod = products.find(p => p.id === productId);
      return {
        productId,
        name: prod?.name ?? 'Producto desconocido',
        totalSold,
      };
    });

    res.status(200).json({
      message: 'Top 5 productos más vendidos',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// Top 5 peores productos
async function getWorstProducts(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true);
    const orders = await em.find(Order, filters, { populate: ['orderItems'] });

    const productSales: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      }
    }

    if (Object.keys(productSales).length === 0) {
      return res.status(200).json({ message: 'No hay ventas todavía', data: [] });
    }

    const sorted = Object.entries(productSales).sort((a, b) => a[1] - b[1]);
    const worst5 = sorted.slice(0, 5);

    const products = await em.find(Product, { id: { $in: worst5.map(([id]) => id) } });

    const result = worst5.map(([id, totalSold]) => {
      const prod = products.find(p => p.id === id);
      return { productId: id, name: prod?.name ?? 'Producto desconocido', totalSold };
    });

    res.status(200).json({ message: 'Top 5 peores productos', data: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error interno', error: error.message });
  }
}

///CLIENTES ///

// Top clientes que más compran
async function getTopCustomers(req: Request, res: Response) {
  try {
    const filters = buildOrderFilters(req, true);

    const orders: Loaded<Order, 'user'>[] = await em.find(Order, filters, {
      populate: ['user'],
    });

    const customerSales: Record<string, number> = {};

    for (const order of orders) {
      const userId = order.user!.id || 0;
      customerSales[userId] = (customerSales[userId] || 0) + 1;
    }

    if (Object.keys(customerSales).length === 0) {
      return res.status(200).json({ message: 'No hay compras todavía', data: [] });
    }

    const sorted = Object.entries(customerSales).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);

    const users = await em.find(User, {
      id: { $in: top5.map(([id]) => id) },
    });

    const result = top5.map(([userId, totalSpent]) => {
      const user = users.find(u => u.id === userId);
      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Usuario desconocido',
        email: user?.email ?? null,
        totalSpent,
      };
    });

    res.status(200).json({
      message: 'Top 5 clientes que más compran',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

// Top clientes que más cancelan órdenes
async function getTopCancelledCustomers(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const filters: any = { status: 'cancelled' };

    if (startDate && endDate) {
      filters.orderDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const orders: Loaded<Order, 'user'>[] = await em.find(Order, filters, {
      populate: ['user'],
    });

    const customerCancelled: Record<string, number> = {};

    for (const order of orders) {
      const userId = order.user!.id || 0;
      customerCancelled[userId] = (customerCancelled[userId] || 0) + 1;
    }

    if (Object.keys(customerCancelled).length === 0) {
      return res.status(200).json({ message: 'No hay órdenes canceladas todavía', data: [] });
    }

    const sorted = Object.entries(customerCancelled).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);

    const users = await em.find(User, {
      id: { $in: top5.map(([id]) => id) },
    });

    const result = top5.map(([userId, totalCancelled]) => {
      const user = users.find(u => u.id === userId);
      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Usuario desconocido',
        email: user?.email ?? null,
        totalCancelled,
      };
    });

    res.status(200).json({
      message: 'Top 5 clientes que más cancelan órdenes',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}


///ORDENES ///
// Distribución de órdenes por estado (para torta)
async function getOrderStatusDistribution(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const filters: any = {};

    if (startDate && endDate) {
      filters.orderDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const orders = await em.find(Order, filters);

    const statusCounts: Record<string, number> = {
      completed: 0,
      pending: 0,
      cancelled: 0,
    };

    for (const order of orders) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    }

    res.status(200).json({
      message: 'Distribución de órdenes por estado',
      data: statusCounts,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}





export const controller = {
  getSalesByProvince,
  getSalesByCity,
  getSalesByCategory,
  getProductsByCategory,
  getRevenueOverTime,   
  getTopProducts,
  getWorstProducts,
  getTopCustomers,
  getTopCancelledCustomers,
  getOrderStatusDistribution,  

};

