/**
 * Error Handler Middleware
 * 
 * Global error handling middleware for Express applications.
 * Handles application errors, validation errors, and unexpected exceptions.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError, 
  ConflictError 
} from '../interfaces';
import { logger } from '../utils/logger';

export function errorHandlerMiddleware(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details
  logger.error('Request error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Handle known application errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
    return;
  }

  // Handle Joi validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message,
      statusCode: 400
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      statusCode: 401
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      statusCode: 401
    });
    return;
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    let message = 'File upload error';
    let statusCode = 400;

    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      statusCode
    });
    return;
  }

  // Handle database errors
  if (error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
    res.status(409).json({
      success: false,
      error: 'Resource already exists',
      statusCode: 409
    });
    return;
  }

  if (error.message?.includes('foreign key constraint')) {
    res.status(400).json({
      success: false,
      error: 'Invalid reference to related resource',
      statusCode: 400
    });
    return;
  }

  if (error.message?.includes('not found') || error.message?.includes('no rows')) {
    res.status(404).json({
      success: false,
      error: 'Resource not found',
      statusCode: 404
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    statusCode: 500,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
}