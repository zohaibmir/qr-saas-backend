import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';

export const errorHandler = (
  error: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const requestLogger = req.logger || logger;
  
  // Log the error
  requestLogger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
    apiKeyService: req.apiKey?.service
  });

  // Determine error status and message
  let status = error.status || error.statusCode || 500;
  let message = error.message || 'An unexpected error occurred';
  let errorType = 'Internal Server Error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    errorType = 'Validation Error';
    message = error.details ? error.details.map((d: any) => d.message).join(', ') : message;
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    status = 401;
    errorType = 'Unauthorized';
    message = 'Authentication failed';
  } else if (error.name === 'ForbiddenError') {
    status = 403;
    errorType = 'Forbidden';
    message = 'Insufficient permissions';
  } else if (error.name === 'NotFoundError') {
    status = 404;
    errorType = 'Not Found';
    message = 'Resource not found';
  } else if (error.name === 'ConflictError') {
    status = 409;
    errorType = 'Conflict';
  } else if (error.name === 'TooManyRequestsError') {
    status = 429;
    errorType = 'Rate Limit Exceeded';
    message = 'Too many requests. Please slow down.';
  }

  // Database errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        status = 409;
        errorType = 'Conflict';
        message = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        status = 400;
        errorType = 'Validation Error';
        message = 'Invalid reference to related resource';
        break;
      case '23502': // Not null violation
        status = 400;
        errorType = 'Validation Error';
        message = 'Required field is missing';
        break;
      case '42P01': // Undefined table
        status = 500;
        errorType = 'Database Error';
        message = 'Database configuration error';
        break;
      default:
        if (error.code.startsWith('23')) {
          status = 400;
          errorType = 'Validation Error';
          message = 'Data validation failed';
        }
        break;
    }
  }

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: any = {
    error: errorType,
    message: message,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };

  // Add additional details for development
  if (isDevelopment) {
    errorResponse.details = {
      originalError: error.name,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    };
  }

  // Add validation details if available
  if (error.details) {
    errorResponse.validationErrors = error.details;
  }

  res.status(status).json(errorResponse);
};

// Custom error classes
export class ValidationError extends Error {
  status = 400;
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends Error {
  status = 429;
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}

export default errorHandler;