import { Router } from 'express';
import { controller } from './dashboard.controller.js';
import { authenticateAdmin } from '../auth/authMiddleware.js';

export const dashboardRouter = Router();

// Ventas
dashboardRouter.get('/total-revenue', authenticateAdmin, controller.getTotalRevenue);
dashboardRouter.get('/sales-by-province', authenticateAdmin, controller.getSalesByProvince);
dashboardRouter.get('/sales-by-city', authenticateAdmin, controller.getSalesByCity);
dashboardRouter.get('/sales-by-category', authenticateAdmin, controller.getSalesByCategory);
dashboardRouter.get('/products-by-category', authenticateAdmin, controller.getProductsByCategory);
dashboardRouter.get('/earnings-over-time', authenticateAdmin, controller.getRevenueOverTime);

// Productos
dashboardRouter.get('/top-products', authenticateAdmin, controller.getTopProducts);
dashboardRouter.get('/worst-products', authenticateAdmin, controller.getWorstProducts);

// Clientes
dashboardRouter.get('/top-customers', authenticateAdmin, controller.getTopCustomers);
dashboardRouter.get('/worst-customers', authenticateAdmin, controller.getTopCancelledCustomers);

// Órdenes
dashboardRouter.get('/orders-by-status', authenticateAdmin, controller.getOrderStatusDistribution);
dashboardRouter.get('/orders-count-by-day', authenticateAdmin, controller.getOrdersCountByDay);
dashboardRouter.get('/order-status-by-day', authenticateAdmin, controller.getOrderStatusByDay);

