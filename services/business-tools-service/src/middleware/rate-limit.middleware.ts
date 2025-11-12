/**
 * Rate Limiting Middleware
 * 
 * Request rate limiting configuration for the Business Tools Service.
 * Prevents abuse and ensures fair usage of API endpoints.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    requests: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 1000; // Max requests per window

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.ip || 'unknown';
  const now = Date.now();

  // Clean up expired entries
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });

  // Get or create client entry
  if (!store[clientId] || store[clientId].resetTime < now) {
    store[clientId] = {
      requests: 0,
      resetTime: now + WINDOW_SIZE
    };
  }

  // Increment request count
  store[clientId].requests += 1;

  // Check if limit exceeded
  if (store[clientId].requests > MAX_REQUESTS) {
    logger.warn('Rate limit exceeded', {
      clientId,
      requests: store[clientId].requests,
      resetTime: new Date(store[clientId].resetTime).toISOString(),
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      statusCode: 429,
      retryAfter: Math.ceil((store[clientId].resetTime - now) / 1000)
    });
    return;
  }

  // Set rate limit headers
  res.header('X-RateLimit-Limit', MAX_REQUESTS.toString());
  res.header('X-RateLimit-Remaining', (MAX_REQUESTS - store[clientId].requests).toString());
  res.header('X-RateLimit-Reset', Math.ceil(store[clientId].resetTime / 1000).toString());

  next();
}