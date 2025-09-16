import { Router } from 'express';
import { chatbotInternalController } from './chatbot-internal.controller.js';
import { chatbotRateLimit, validateChatbotRequest, validateSearchParams, validateProductId, chatbotErrorHandler } from './middleware/chatbot-security.middleware.js';
import { authenticateAdmin } from '../../auth/authMiddleware.js';

export const chatbotInternalRouter = Router();

// Aplicar middleware de seguridad a todas las rutas del chatbot
chatbotInternalRouter.use(chatbotRateLimit);
chatbotInternalRouter.use(validateChatbotRequest);

/**
 * Rutas públicas para el chatbot (con rate limiting)
 */

// Obtener stock público de todos los productos
chatbotInternalRouter.get('/stock', chatbotInternalController.getPublicStock);

// Buscar productos por término
chatbotInternalRouter.get('/search', validateSearchParams, chatbotInternalController.searchPublicProducts);

// Obtener producto específico por ID
chatbotInternalRouter.get('/product/:id', validateProductId, chatbotInternalController.getPublicProduct);

// Obtener estadísticas públicas
chatbotInternalRouter.get('/stats', chatbotInternalController.getPublicStats);

/**
 * Rutas administrativas (requieren autenticación de admin)
 */

// Limpiar cache (solo admins)
chatbotInternalRouter.post('/cache/clear', authenticateAdmin, chatbotInternalController.clearCache);

// Ver logs de auditoría (solo admins)
chatbotInternalRouter.get('/logs', authenticateAdmin, chatbotInternalController.getAuditLogs);

/**
 * Ruta de salud/estado del servicio
 */
chatbotInternalRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chatbot Internal API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Middleware de manejo de errores (debe ir al final)
chatbotInternalRouter.use(chatbotErrorHandler);