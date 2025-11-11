import { Request, Response, NextFunction } from 'express';
import { logger, logRequest } from '../utils/logger';
import { AdminService } from '../services/admin.service';

interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Global error handler middleware
 */
export const errorHandler = async (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Default error values
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_ERROR';
    
    // Log the error
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.error('Request error', {
      errorId,
      method: req.method,
      url: req.url,
      adminId: req.admin?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      status,
      message: err.message,
      stack: err.stack,
      details: err.details
    });

    // Handle specific error types
    switch (err.name) {
      case 'ValidationError':
        status = 400;
        code = 'VALIDATION_ERROR';
        message = 'Invalid request data';
        break;
        
      case 'JsonWebTokenError':
        status = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
        break;
        
      case 'TokenExpiredError':
        status = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Authentication token expired';
        break;
        
      case 'CastError':
        status = 400;
        code = 'INVALID_ID';
        message = 'Invalid resource ID format';
        break;
        
      case 'MongoError':
      case 'PostgresError':
        status = 500;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
        break;
        
      case 'MulterError':
        status = 400;
        code = 'FILE_UPLOAD_ERROR';
        message = 'File upload failed';
        break;
    }

    // Handle PostgreSQL specific errors
    if (err.code) {
      switch (err.code) {
        case '23505': // Unique constraint violation
          status = 409;
          code = 'DUPLICATE_RESOURCE';
          message = 'Resource already exists';
          break;
          
        case '23503': // Foreign key constraint violation
          status = 400;
          code = 'INVALID_REFERENCE';
          message = 'Invalid reference to related resource';
          break;
          
        case '23502': // Not null constraint violation
          status = 400;
          code = 'MISSING_REQUIRED_FIELD';
          message = 'Required field is missing';
          break;
          
        case '22001': // String data too long
          status = 400;
          code = 'DATA_TOO_LONG';
          message = 'Data exceeds maximum length';
          break;
      }
    }

    // Prepare error response
    const errorResponse: any = {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && {
          errorId,
          details: err.details,
          stack: err.stack
        })
      }
    };

    // Add request info for client errors (4xx)
    if (status >= 400 && status < 500) {
      errorResponse.error.requestInfo = {
        body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
        params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
        query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined
      };
    }

    // Log admin activity for errors
    if (req.admin && req.adminActivity) {
      await AdminService.logActivity(
        req.admin.id,
        req.adminActivity.action,
        req.adminActivity.resource,
        req.adminActivity.resourceId,
        req.adminActivity.details,
        req.ip,
        req.get('User-Agent'),
        false, // success = false
        message
      );
    }

    // Log request completion
    const duration = Date.now() - startTime;
    logRequest({
      method: req.method,
      url: req.url,
      adminId: req.admin?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      duration,
      statusCode: status,
      error: message
    });

    res.status(status).json(errorResponse);

  } catch (handlerError) {
    // If error handler itself fails, send basic response
    logger.error('Error handler failed:', handlerError);
    
    res.status(500).json({
      error: {
        code: 'HANDLER_ERROR',
        message: 'Error processing request',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }
};

/**
 * Middleware to handle async route errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const message = `Route ${req.method} ${req.path} not found`;
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    adminId: req.admin?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      availableEndpoints: [
        'GET /health',
        'POST /auth/login',
        'GET /api/dashboard',
        'GET /api/content',
        'GET /api/users',
        'GET /api/analytics',
        'GET /api/admin'
      ]
    }
  });
};

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  public status = 400;
  public code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public status = 401;
  public code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public status = 403;
  public code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public status = 404;
  public code = 'NOT_FOUND_ERROR';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public status = 409;
  public code = 'CONFLICT_ERROR';
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ServiceUnavailableError extends Error {
  public status = 503;
  public code = 'SERVICE_UNAVAILABLE';
  
  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}