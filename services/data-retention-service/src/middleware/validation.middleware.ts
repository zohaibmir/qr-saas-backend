import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';

export const validateRequest = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Log the request
    req.logger.info(`Processing ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      
      if (!contentType || !contentType.includes('application/json')) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Content-Type must be application/json',
          requestId: req.requestId
        });
        return;
      }

      // Check for empty body when required
      if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Request body is required',
          requestId: req.requestId
        });
        return;
      }
    }

    // Validate common parameters
    if (req.params.id) {
      const id = req.params.id.trim();
      if (!id || id.length < 3 || id.length > 100) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid ID parameter format',
          requestId: req.requestId
        });
        return;
      }

      // Basic format validation for policy and execution IDs
      if (!id.match(/^(policy_|exec_|archive_|report_|request_)[a-zA-Z0-9_]+$/)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'ID parameter has invalid format',
          requestId: req.requestId
        });
        return;
      }
    }

    // Validate pagination parameters
    if (req.query.page) {
      const page = parseInt(req.query.page as string);
      if (isNaN(page) || page < 1) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Page parameter must be a positive integer',
          requestId: req.requestId
        });
        return;
      }
    }

    if (req.query.limit) {
      const limit = parseInt(req.query.limit as string);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Limit parameter must be between 1 and 100',
          requestId: req.requestId
        });
        return;
      }
    }

    // Validate sort parameters
    if (req.query.sort_order) {
      const sortOrder = req.query.sort_order as string;
      if (!['ASC', 'DESC'].includes(sortOrder.toUpperCase())) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Sort order must be ASC or DESC',
          requestId: req.requestId
        });
        return;
      }
    }

    next();

  } catch (error) {
    logger.error('Request validation error:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Request validation failed',
      requestId: req.requestId
    });
  }
};

export const validateApiVersion = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const acceptHeader = req.get('Accept');
  const apiVersion = req.get('API-Version') || 'v1';

  // Only allow v1 for now
  if (apiVersion !== 'v1') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Unsupported API version. Only v1 is supported.',
      requestId: req.requestId
    });
    return;
  }

  // Ensure JSON response is expected
  if (acceptHeader && !acceptHeader.includes('application/json') && !acceptHeader.includes('*/*')) {
    res.status(406).json({
      error: 'Not Acceptable',
      message: 'Only application/json response format is supported',
      requestId: req.requestId
    });
    return;
  }

  next();
};

export const sanitizeInput = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Recursively sanitize object properties
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Basic XSS prevention - remove/escape dangerous characters
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitize(obj[key]);
          }
        }
        
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitize(req.query);
    }

    next();

  } catch (error) {
    logger.error('Input sanitization error:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Request processing failed',
      requestId: req.requestId
    });
  }
};

export default validateRequest;