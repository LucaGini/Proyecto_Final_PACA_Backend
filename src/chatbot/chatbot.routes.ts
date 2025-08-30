import { Router } from 'express';
import { controller } from './chatbot.controller.js';

export const chatbotRouter = Router();

// Ruta principal para enviar mensajes
chatbotRouter.post('/message', controller.sendMessage);

// Ruta para verificar estado del servicio
chatbotRouter.get('/status', controller.getStatus);

// Ruta para obtener información del chatbot
chatbotRouter.get('/info', controller.getInfo);

// Middleware de manejo de errores específico para chatbot
chatbotRouter.use((error: any, req: any, res: any, next: any) => {
  console.error('Chatbot route error:', error);
  res.status(500).json({
    error: 'Error en el servicio de chatbot',
    message: 'Por favor, intenta nuevamente o contacta con soporte',
    timestamp: new Date().toISOString()
  });
});
