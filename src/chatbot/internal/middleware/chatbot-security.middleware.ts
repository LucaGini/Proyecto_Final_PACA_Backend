import { Request, Response, NextFunction } from 'express';

/**
 * Interface para tracking de rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Cache en memoria para rate limiting
 * En producción, usar Redis o similar para clusters
 */
const rateLimitCache = new Map<string, RateLimitEntry>();

/**
 * Configuración de rate limiting para el chatbot
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 30,     // máximo 30 requests por minuto por IP
  keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || 'unknown'
};

/**
 * Middleware de rate limiting específico para el chatbot
 */
export const chatbotRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const key = RATE_LIMIT_CONFIG.keyGenerator(req);
  const now = Date.now();

  // Limpiar entradas expiradas
  cleanExpiredRateLimitEntries(now);

  const entry = rateLimitCache.get(key);

  if (!entry) {
    // Primera request de esta IP
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    });

    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
      'X-RateLimit-Remaining': (RATE_LIMIT_CONFIG.maxRequests - 1).toString(),
      'X-RateLimit-Reset': new Date(now + RATE_LIMIT_CONFIG.windowMs).toISOString()
    });

    return next();
  }

  if (now > entry.resetTime) {
    // La ventana ha expirado, resetear
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    });

    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
      'X-RateLimit-Remaining': (RATE_LIMIT_CONFIG.maxRequests - 1).toString(),
      'X-RateLimit-Reset': new Date(now + RATE_LIMIT_CONFIG.windowMs).toISOString()
    });

    return next();
  }

  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    // Rate limit excedido
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
    });

    console.warn(`[CHATBOT-SECURITY] Rate limit exceeded for IP: ${key}`);

    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Incrementar contador
  entry.count++;

  res.set({
    'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
    'X-RateLimit-Remaining': (RATE_LIMIT_CONFIG.maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
  });

  next();
};

/**
 * Limpia entradas de rate limiting expiradas
 */
function cleanExpiredRateLimitEntries(now: number): void {
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now > entry.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Middleware de validación de requests para el chatbot
 */
export const validateChatbotRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Validar Content-Type para requests POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json')) {
      res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json',
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  }

  // Validar User-Agent (bloquear bots maliciosos conocidos)
  const userAgent = req.get('User-Agent');
  if (userAgent) {
    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'masscan',
      'nmap',
      'dirb',
      'gobuster'
    ];

    const isSuspicious = suspiciousUserAgents.some(suspicious =>
      userAgent.toLowerCase().includes(suspicious)
    );

    if (isSuspicious) {
      console.warn(`[CHATBOT-SECURITY] Suspicious User-Agent blocked: ${userAgent} from IP: ${req.ip}`);
      res.status(403).json({
        success: false,
        error: 'Access denied',
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  }

  // Validar tamaño de query parameters
  const queryString = req.url.split('?')[1];
  if (queryString && queryString.length > 500) {
    res.status(400).json({
      success: false,
      error: 'Query string too long',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Agregar headers de seguridad
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  next();
};

/**
 * Middleware de validación de parámetros de búsqueda
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction): void => {
  const searchTerm = req.query.q as string;

  if (!searchTerm) {
    res.status(400).json({
      success: false,
      error: 'Search query parameter "q" is required',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validar longitud del término de búsqueda
  if (searchTerm.length < 2) {
    res.status(400).json({
      success: false,
      error: 'Search term must be at least 2 characters long',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (searchTerm.length > 50) {
    res.status(400).json({
      success: false,
      error: 'Search term too long (max 50 characters)',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validar caracteres peligrosos
  const dangerousChars = /<script|javascript:|data:|vbscript:|on\w+=/i;
  if (dangerousChars.test(searchTerm)) {
    console.warn(`[CHATBOT-SECURITY] Dangerous search term blocked: ${searchTerm} from IP: ${req.ip}`);
    res.status(400).json({
      success: false,
      error: 'Invalid search term',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Middleware de validación de ID de producto
 */
export const validateProductId = (req: Request, res: Response, next: NextFunction): void => {
  const productId = req.params.id;

  if (!productId) {
    res.status(400).json({
      success: false,
      error: 'Product ID is required',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validar formato de ObjectId
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(productId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid product ID format',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Middleware de manejo de errores para el chatbot
 */
export const chatbotErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(`[CHATBOT-ERROR] ${req.method} ${req.url}:`, error);

  // No revelar detalles internos del error
  res.status(500).json({
    success: false,
    error: 'An internal error occurred. Please try again later.',
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown'
    }
  });
};

/**
 * Obtiene estadísticas de rate limiting (para monitoring)
 */
export const getRateLimitStats = (): { activeEntries: number; totalRequests: number } => {
  const now = Date.now();
  let totalRequests = 0;
  let activeEntries = 0;

  for (const [key, entry] of rateLimitCache.entries()) {
    if (now <= entry.resetTime) {
      activeEntries++;
      totalRequests += entry.count;
    }
  }

  return { activeEntries, totalRequests };
};