import { GoogleGenerativeAI } from '@google/generative-ai';
import { PACA_KNOWLEDGE_BASE, FALLBACK_RESPONSES } from './faq.data.js';
import dotenv from 'dotenv';

dotenv.config();

export class ChatbotService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 300,
      }
    });
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      // Validar entrada
      if (!userMessage || userMessage.trim().length === 0) {
        return "Por favor, escribe tu pregunta y estaré encantado de ayudarte.";
      }

      if (userMessage.length > 500) {
        return "Tu mensaje es muy largo. Por favor, hazme una pregunta más específica sobre nuestros productos agroecológicos.";
      }

      // Construir el prompt
      const prompt = this.buildPrompt(userMessage);

      // Generar respuesta
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Validar respuesta
      if (!text || text.trim().length === 0) {
        return this.getFallbackResponse();
      }

      // Verificar que la respuesta sea relevante a PACA
      if (this.isResponseRelevant(text)) {
        return text.trim();
      } else {
        return "Me especializo en ayudarte con consultas sobre nuestros productos agroecológicos PACA. ¿Tienes alguna pregunta sobre nuestras harinas o nuestra cooperativa?";
      }

    } catch (error) {
      console.error('Error generating response:', error);
      return this.getFallbackResponse();
    }
  }

  private buildPrompt(userMessage: string): string {
    return `${PACA_KNOWLEDGE_BASE}

PREGUNTA DEL USUARIO: ${userMessage}

RESPUESTA (máximo 200 palabras, tono amigable y profesional):`;
  }

  private isResponseRelevant(response: string): boolean {
    const pacaKeywords = [
      'paca', 'harina', 'agroecológic', 'cooperativa', 'orgánic', 
      'sustentable', 'pesticida', 'tierra', 'producto', 'envío',
      'pedido', 'stock', 'calidad', 'trabajo colectivo'
    ];

    const lowerResponse = response.toLowerCase();
    return pacaKeywords.some(keyword => lowerResponse.includes(keyword));
  }

  private getFallbackResponse(): string {
    const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
    return FALLBACK_RESPONSES[randomIndex];
  }

  // Método para agregar contexto adicional si es necesario
  async generateContextualResponse(userMessage: string, conversationHistory: string[] = []): Promise<string> {
    try {
      let contextPrompt = PACA_KNOWLEDGE_BASE;
      
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-4); // Últimas 4 interacciones
        contextPrompt += `\n\nCONTEXTO DE LA CONVERSACIÓN:\n${recentHistory.join('\n')}`;
      }

      contextPrompt += `\n\nPREGUNTA ACTUAL DEL USUARIO: ${userMessage}\n\nRESPUESTA:`;

      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      const text = response.text();

      return text?.trim() || this.getFallbackResponse();

    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.getFallbackResponse();
    }
  }
}
