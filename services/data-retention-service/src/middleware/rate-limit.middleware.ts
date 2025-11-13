import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';

// Standard rate limiting for all endpoints
export const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests from this IP address. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: AuthenticatedRequest, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests from this IP address. Please try again later.',
      retryAfter: '15 minutes',
      requestId: req.requestId
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Stricter rate limiting for write operations (POST, PUT, DELETE)
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 write requests per windowMs
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many write requests from this IP address. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: AuthenticatedRequest, res: Response) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many write requests from this IP address. Please try again later.',
      retryAfter: '15 minutes',
      requestId: req.requestId
    });
  }
});

// Very strict rate limiting for execution and deletion operations
export const executionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 execution/deletion requests per hour
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many execution requests from this IP address. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: AuthenticatedRequest, res: Response) => {
    logger.warn('Execution rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many execution requests from this IP address. Please try again later.',
      retryAfter: '1 hour',
      requestId: req.requestId
    });
  }
});

// Custom rate limiting for admin operations
export const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit admins to 50 requests per 5 minutes
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many admin requests. Please slow down.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: AuthenticatedRequest, res: Response) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many admin requests. Please slow down.',
      retryAfter: '5 minutes',
      requestId: req.requestId
    });
  },
  keyGenerator: (req: AuthenticatedRequest) => {
    // Rate limit by user ID for authenticated admin users
    return req.user?.id || req.ip || 'unknown';
  }
});

// Rate limiting for bulk operations
export const bulkOperationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 bulk operations per hour
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many bulk operations. Please wait before performing more bulk actions.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: AuthenticatedRequest, res: Response) => {
    logger.warn('Bulk operation rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many bulk operations. Please wait before performing more bulk actions.',
      retryAfter: '1 hour',
      requestId: req.requestId
    });
  },
  keyGenerator: (req: AuthenticatedRequest) => {
    return req.user?.id || req.ip || 'unknown';
  }
});

export default standardRateLimit;