import { Request, Response } from 'express';
import { ChatbotDataService } from './chatbot-data.service.js';

const chatbotDataService = new ChatbotDataService();

/**
 * Logs de auditoría para el chatbot
 */
interface ChatbotAuditLog {
  timestamp: string;
  endpoint: string;
  query?: string;
  userAgent?: string;
  ip?: string;
  responseTime: number;
}

/**
 * Cache de logs (en producción deberías usar una solución más robusta)
 */
const auditLogs: ChatbotAuditLog[] = [];
const MAX_LOGS = 1000;

/**
 * Función para registrar actividad del chatbot
 */
function logChatbotActivity(req: Request, endpoint: string, responseTime: number, query?: string) {
  const log: ChatbotAuditLog = {
    timestamp: new Date().toISOString(),
    endpoint,
    query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    responseTime
  };

  auditLogs.push(log);
  
  // Mantener solo los últimos logs
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.splice(0, auditLogs.length - MAX_LOGS);
  }

  console.log(`[CHATBOT-API] ${endpoint} - ${responseTime}ms`, query ? `- Query: ${query}` : '');
}

/**
 * Obtiene el stock público de todos los productos activos
 * GET /api/chatbot/stock
 */
export const getPublicStock = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const result = await chatbotDataService.getPublicStock();
    const responseTime = Date.now() - startTime;
    
    logChatbotActivity(req, 'GET /api/chatbot/stock', responseTime);
    
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Error in getPublicStock:', error);
    logChatbotActivity(req, 'GET /api/chatbot/stock [ERROR]', responseTime);
    
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve stock information',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });
  }
};

/**
 * Busca productos por término de búsqueda
 * GET /api/chatbot/search?q=term
 */
export const searchPublicProducts = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const searchTerm = req.query.q as string;
    
    if (!searchTerm) {
      const responseTime = Date.now() - startTime;
      logChatbotActivity(req, 'GET /api/chatbot/search [BAD REQUEST]', responseTime);
      
      res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
        meta: {
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        }
      });
      return;
    }

    const result = await chatbotDataService.searchPublicProducts(searchTerm);
    const responseTime = Date.now() - startTime;
    
    logChatbotActivity(req, 'GET /api/chatbot/search', responseTime, searchTerm);
    
    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Error in searchPublicProducts:', error);
    logChatbotActivity(req, 'GET /api/chatbot/search [ERROR]', responseTime, req.query.q as string);
    
    res.status(500).json({
      success: false,
      error: 'Unable to search products',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });
  }
};

/**
 * Obtiene información de un producto específico por ID
 * GET /api/chatbot/product/:id
 */
export const getPublicProduct = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const productId = req.params.id;
    
    if (!productId) {
      const responseTime = Date.now() - startTime;
      logChatbotActivity(req, 'GET /api/chatbot/product/:id [BAD REQUEST]', responseTime);
      
      res.status(400).json({
        success: false,
        error: 'Product ID is required',
        meta: {
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        }
      });
      return;
    }

    const product = await chatbotDataService.getPublicProductById(productId);
    const responseTime = Date.now() - startTime;
    
    if (!product) {
      logChatbotActivity(req, 'GET /api/chatbot/product/:id [NOT FOUND]', responseTime, productId);
      
      res.status(404).json({
        success: false,
        error: 'Product not found or not available',
        meta: {
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        }
      });
      return;
    }
    
    logChatbotActivity(req, 'GET /api/chatbot/product/:id', responseTime, productId);
    
    res.status(200).json({
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Error in getPublicProduct:', error);
    logChatbotActivity(req, 'GET /api/chatbot/product/:id [ERROR]', responseTime, req.params.id);
    
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve product information',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });
  }
};

/**
 * Obtiene estadísticas públicas de productos
 * GET /api/chatbot/stats
 */
export const getPublicStats = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const stats = await chatbotDataService.getPublicStats();
    const responseTime = Date.now() - startTime;
    
    logChatbotActivity(req, 'GET /api/chatbot/stats', responseTime);
    
    res.status(200).json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Error in getPublicStats:', error);
    logChatbotActivity(req, 'GET /api/chatbot/stats [ERROR]', responseTime);
    
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve statistics',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });
  }
};

/**
 * Limpia el cache del servicio de datos (endpoint de utilidad)
 * POST /api/chatbot/cache/clear
 * Nota: En producción deberías proteger este endpoint con autenticación de admin
 */
export const clearCache = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    chatbotDataService.clearCache();
    const responseTime = Date.now() - startTime;
    
    logChatbotActivity(req, 'POST /api/chatbot/cache/clear', responseTime);
    
    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Error in clearCache:', error);
    logChatbotActivity(req, 'POST /api/chatbot/cache/clear [ERROR]', responseTime);
    
    res.status(500).json({
      success: false,
      error: 'Unable to clear cache',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });
  }
};

/**
 * Obtiene logs de auditoría del chatbot (solo para admins)
 * GET /api/chatbot/logs
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const recentLogs = auditLogs.slice(-limit).reverse(); // Más recientes primero
    
    const responseTime = Date.now() - startTime;
    logChatbotActivity(req, 'GET /api/chatbot/logs', responseTime);
    
    res.status(200).json({
      success: true,
      data: {
        logs: recentLogs,
        totalLogs: auditLogs.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Error in getAuditLogs:', error);
    logChatbotActivity(req, 'GET /api/chatbot/logs [ERROR]', responseTime);
    
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve audit logs',
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }
    });
  }
};

export const chatbotInternalController = {
  getPublicStock,
  searchPublicProducts,
  getPublicProduct,
  getPublicStats,
  clearCache,
  getAuditLogs
};