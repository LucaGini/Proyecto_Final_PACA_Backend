import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service.js';

const chatbotService = new ChatbotService();

interface ChatRequest {
  message: string;
  conversationHistory?: string[];
}

interface ChatResponse {
  response: string;
  timestamp: string;
  conversationId?: string;
}

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory }: ChatRequest = req.body;

    // Validación de entrada
    if (!message) {
      res.status(400).json({
        error: 'El mensaje es requerido',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (typeof message !== 'string') {
      res.status(400).json({
        error: 'El mensaje debe ser una cadena de texto',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generar respuesta
    const response = conversationHistory && conversationHistory.length > 0
      ? await chatbotService.generateContextualResponse(message, conversationHistory)
      : await chatbotService.generateResponse(message);

    // Respuesta exitosa
    const chatResponse: ChatResponse = {
      response,
      timestamp: new Date().toISOString(),
      conversationId: generateConversationId()
    };

    res.status(200).json(chatResponse);

  } catch (error: any) {
    console.error('Error in chatbot controller:', error);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      response: 'Lo siento, estoy teniendo problemas técnicos. Por favor, intenta nuevamente en unos momentos o contacta directamente con nuestro equipo.',
      timestamp: new Date().toISOString()
    });
  }
};

export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      status: 'online',
      message: 'Chatbot PACA funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error en el servicio de chatbot',
      timestamp: new Date().toISOString()
    });
  }
};

// Endpoint para obtener información sobre el chatbot
export const getInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      name: 'Asistente Virtual PACA',
      description: 'Chatbot especializado en productos agroecológicos cooperativos',
      capabilities: [
        'Información sobre productos',
        'Consultas sobre la cooperativa',
        'Preguntas frecuentes',
        'Guía de pedidos',
        'Información sobre sustentabilidad',
        'Consulta de stock en tiempo real'
      ],
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo información del chatbot',
      timestamp: new Date().toISOString()
    });
  }
};

// Función auxiliar para generar ID de conversación
function generateConversationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const controller = {
  sendMessage,
  getStatus,
  getInfo
};
