import { GoogleGenerativeAI } from '@google/generative-ai';
import { PACA_KNOWLEDGE_BASE, FALLBACK_RESPONSES } from './faq.data.js';
import { ChatbotDataService } from './internal/chatbot-data.service.js';
import dotenv from 'dotenv';

dotenv.config();

export class ChatbotService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private dataService: ChatbotDataService;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 300,
      }
    });
    this.dataService = new ChatbotDataService();
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

      // Verificar si es una consulta de stock
      if (this.isStockQuery(userMessage)) {
        return await this.handleStockQuery(userMessage);
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
      // Verificar si es una consulta de stock primero
      if (this.isStockQuery(userMessage)) {
        return await this.handleStockQuery(userMessage);
      }

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

  /**
   * Detecta si el mensaje del usuario es una consulta sobre stock de productos
   */
  private isStockQuery(message: string): boolean {
    const stockKeywords = [
      'stock', 'disponible', 'disponibilidad', 'inventario',
      'cantidad', 'quedan', 'hay', 'tienen', 'existe',
      'cuánto', 'cuántos', 'cuánta', 'cuántas'
    ];

    const productKeywords = [
      'producto', 'productos', 'harina', 'harinas'
    ];

    const lowerMessage = message.toLowerCase();

    // Debe contener al menos una palabra clave de stock Y una de producto
    const hasStockKeyword = stockKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasProductKeyword = productKeywords.some(keyword => lowerMessage.includes(keyword));

    return hasStockKeyword && hasProductKeyword;
  }

  /**
   * Maneja las consultas de stock directamente a través del ChatbotDataService
   */
  private async handleStockQuery(message: string): Promise<string> {
    try {
      // Extraer nombre del producto de la consulta (si se especifica)
      const productName = this.extractProductName(message);

      if (productName) {
        return await this.getSpecificProductStockSafe(productName);
      } else {
        return await this.getAllProductsStockSafe();
      }

    } catch (error) {
      console.error('Error handling stock query:', error);
      return "Disculpa, hay un problema técnico al consultar el stock. Por favor intenta nuevamente en unos minutos.";
    }
  }

  /**
   * Extrae el nombre del producto de la consulta del usuario
   */
  private extractProductName(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    const patterns = [
      /harina\s+de\s+(\w+)/gi,
      /harina\s+(\w+)/gi,
      /"([^"]+)"/gi,
      /'([^']+)'/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(lowerMessage);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Obtiene el stock de un producto específico usando ChatbotDataService directamente
   */
  private async getSpecificProductStockSafe(productName: string): Promise<string> {
    try {
      const result = await this.dataService.searchPublicProducts(productName);

      if (!result.products || result.products.length === 0) {
        return `No encontré productos que coincidan con "${productName}". ¿Podrías verificar el nombre o consultar nuestro catálogo completo?`;
      }

      const products = result.products;

      if (products.length === 1) {
        const product = products[0];
        return `📦 **${product.name}**\n🔢 Stock disponible: ${product.stock} unidades\n\n${product.isAvailable ? '✅ ¡Disponible para pedidos!' : '⚠️ Actualmente sin stock disponible'}`;
      }

      // Múltiples productos encontrados
      let responseText = `Encontré varios productos relacionados con "${productName}":\n\n`;
      products.forEach((product, index) => {
        responseText += `${index + 1}. **${product.name}** - Stock: ${product.stock} unidades\n`;
      });

      return responseText;

    } catch (error) {
      console.error('Error getting specific product stock:', error);
      return "Error al consultar el stock del producto específico. Por favor intenta nuevamente.";
    }
  }

  /**
   * Obtiene el stock de todos los productos activos usando ChatbotDataService directamente
   */
  private async getAllProductsStockSafe(): Promise<string> {
    try {
      const result = await this.dataService.getPublicStock();

      if (!result.products || result.products.length === 0) {
        return "Actualmente no tenemos productos disponibles en nuestro catálogo.";
      }

      const products = result.products;
      let responseText = "📋 **Stock actual de nuestros productos PACA:**\n\n";

      products.forEach((product) => {
        const status = product.isAvailable ? '✅' : '❌';
        responseText += `${status} **${product.name}**: ${product.stock} unidades\n`;
      });

      responseText += "\n💡 *Si necesitas más información sobre algún producto específico, solo mencionalo por nombre.*";

      return responseText;

    } catch (error) {
      console.error('Error getting all products stock:', error);
      return "Error al consultar el inventario general. Por favor intenta nuevamente.";
    }
  }
}
