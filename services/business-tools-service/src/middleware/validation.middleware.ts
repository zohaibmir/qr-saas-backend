/**
 * Validation Middleware
 * 
 * Express middleware for request validation using Joi schemas.
 * Validates request body, params, and query parameters with detailed error messages.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

type ValidationTarget = 'body' | 'params' | 'query';

export function validateRequest(
  schema: Joi.ObjectSchema,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[target];
      
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Request validation failed', {
          target,
          errors: validationErrors,
          route: req.path,
          method: req.method,
          userId: req.user?.id
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
          statusCode: 400
        });
        return;
      }

      // Replace the original data with validated and sanitized data
      (req as any)[target] = value;

      next();
    } catch (validationError) {
      logger.error('Error in validation middleware', {
        error: validationError instanceof Error ? validationError.message : 'Unknown validation error',
        target,
        route: req.path,
        method: req.method,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  };
}