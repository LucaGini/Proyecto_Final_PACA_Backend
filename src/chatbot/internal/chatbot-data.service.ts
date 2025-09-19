import { orm } from '../../shared/db/orm.js';
import { Product } from '../../product/product.entity.js';

/**
 * Interfaz para datos públicos de productos (solo información que el chatbot puede exponer)
 */
export interface PublicProductData {
  id: string;
  name: string;
  stock: number;
  isAvailable: boolean;
  category?: string;
}

/**
 * Resultado de búsqueda de productos para el chatbot
 */
export interface ProductSearchResult {
  products: PublicProductData[];
  totalFound: number;
  searchTerm?: string;
}

/**
 * Servicio especializado para proporcionar datos públicos al chatbot
 * SEGURIDAD: Solo expone información específica y sanitizada
 */
export class ChatbotDataService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_RESULTS = 20; // Límite de resultados por consulta

  /**
   * Obtiene información pública de stock de todos los productos activos
   */
  async getPublicStock(): Promise<ProductSearchResult> {
    const cacheKey = 'public_stock_all';
    
    // Verificar cache primero
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fork separado para consultas de solo lectura
      const em = orm.em.fork();
      
      // Consulta limitada y específica
      const products = await em.find(Product, 
        { 
          isActive: true 
        }, 
        {
          fields: ['id', 'name', 'stock'], // Solo campos seguros
          populate: ['category'],
          limit: this.MAX_RESULTS,
          orderBy: { name: 'ASC' }
        }
      );

      // Sanitizar y transformar datos
      const publicData: PublicProductData[] = products.map(product => ({
        id: product.id!,
        name: this.sanitizeString(product.name),
        stock: Math.max(0, product.stock), // Nunca mostrar stock negativo
        isAvailable: product.stock > 0,
        category: product.category ? this.sanitizeString(product.category.name) : undefined
      }));

      const result: ProductSearchResult = {
        products: publicData,
        totalFound: publicData.length
      };

      // Guardar en cache
      this.setCache(cacheKey, result, this.DEFAULT_TTL);

      return result;

    } catch (error) {
      console.error('Error in ChatbotDataService.getPublicStock:', error);
      throw new Error('Unable to retrieve product information');
    }
  }

  /**
   * Busca productos por nombre de forma segura
   */
  async searchPublicProducts(searchTerm: string): Promise<ProductSearchResult> {
    // Validar y sanitizar entrada
    const sanitizedTerm = this.sanitizeSearchTerm(searchTerm);
    if (!sanitizedTerm) {
      return { products: [], totalFound: 0, searchTerm };
    }

    const cacheKey = `product_search_${sanitizedTerm.toLowerCase()}`;
    
    // Verificar cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, searchTerm: sanitizedTerm };
    }

    try {
      const em = orm.em.fork();
      
      // Búsqueda segura - usando includes para evitar problemas de regex
      const allProducts = await em.find(Product, 
        {
          isActive: true
        },
        {
          fields: ['id', 'name', 'stock'],
          populate: ['category'],
          limit: this.MAX_RESULTS * 2, // Buscamos más para luego filtrar
          orderBy: { name: 'ASC' }
        }
      );

      // Filtrar en memoria de forma segura
      const matchingProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(sanitizedTerm.toLowerCase())
      ).slice(0, this.MAX_RESULTS);

      const publicData: PublicProductData[] = matchingProducts.map(product => ({
        id: product.id!,
        name: this.sanitizeString(product.name),
        stock: Math.max(0, product.stock),
        isAvailable: product.stock > 0,
        category: product.category ? this.sanitizeString(product.category.name) : undefined
      }));

      const result: ProductSearchResult = {
        products: publicData,
        totalFound: publicData.length,
        searchTerm: sanitizedTerm
      };

      // Cache por menos tiempo para búsquedas específicas
      this.setCache(cacheKey, result, this.DEFAULT_TTL / 2);

      return result;

    } catch (error) {
      console.error('Error in ChatbotDataService.searchPublicProducts:', error);
      throw new Error('Unable to search products');
    }
  }

  /**
   * Obtiene información de un producto específico por ID
   */
  async getPublicProductById(productId: string): Promise<PublicProductData | null> {
    // Validar ID
    if (!this.isValidObjectId(productId)) {
      return null;
    }

    const cacheKey = `product_${productId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const em = orm.em.fork();
      
      const product = await em.findOne(Product, 
        { 
          id: productId, 
          isActive: true 
        },
        {
          fields: ['id', 'name', 'stock'],
          populate: ['category']
        }
      );

      if (!product) {
        return null;
      }

      const publicData: PublicProductData = {
        id: product.id!,
        name: this.sanitizeString(product.name),
        stock: Math.max(0, product.stock),
        isAvailable: product.stock > 0,
        category: product.category ? this.sanitizeString(product.category.name) : undefined
      };

      this.setCache(cacheKey, publicData, this.DEFAULT_TTL);
      return publicData;

    } catch (error) {
      console.error('Error in ChatbotDataService.getPublicProductById:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas básicas de productos (información agregada segura)
   */
  async getPublicStats(): Promise<{ totalProducts: number; availableProducts: number }> {
    const cacheKey = 'public_stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const em = orm.em.fork();
      
      const [totalProducts, availableProducts] = await Promise.all([
        em.count(Product, { isActive: true }),
        em.count(Product, { isActive: true, stock: { $gt: 0 } })
      ]);

      const stats = {
        totalProducts,
        availableProducts
      };

      this.setCache(cacheKey, stats, this.DEFAULT_TTL * 2); // Cache más largo para stats
      return stats;

    } catch (error) {
      console.error('Error in ChatbotDataService.getPublicStats:', error);
      return { totalProducts: 0, availableProducts: 0 };
    }
  }

  /**
   * Limpia el cache (útil para testing o actualizaciones manuales)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas de cache expiradas
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.timestamp + value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtiene datos del cache si están disponibles y no han expirado
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Almacena datos en cache con TTL
   */
  private setCache(key: string, data: any, ttl: number): void {
    // Limpiar cache expirado ocasionalmente
    if (this.cache.size > 100) {
      this.cleanExpiredCache();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Sanitiza strings para prevenir inyección
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.replace(/[<>\"'/]/g, '').trim().substring(0, 100);
  }

  /**
   * Sanitiza y valida términos de búsqueda
   */
  private sanitizeSearchTerm(term: string): string {
    if (!term || typeof term !== 'string') {
      return '';
    }
    
    // Remover caracteres especiales peligrosos
    const sanitized = term
      .replace(/[<>\"'/\\${}]/g, '')
      .trim()
      .substring(0, 50);

    // Debe tener al menos 2 caracteres
    return sanitized.length >= 2 ? sanitized : '';
  }

  /**
   * Escapa caracteres especiales para regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Valida si un string es un ObjectId válido
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}