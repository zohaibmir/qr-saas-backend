/**
 * Authentication Middleware
 * 
 * Express middleware for JWT token validation and user authentication.
 * Verifies tokens, extracts user information, and attaches to request object.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import '../types/express.d'; // Import type extensions
import { config } from '../config/environment.config';
import { logger } from '../utils/logger';

interface JWTPayload {
  id: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token is required',
        statusCode: 401
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      
      // Attach user information to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user'
      };

      logger.debug('User authenticated successfully', {
        userId: req.user.id,
        email: req.user.email,
        route: req.path,
        method: req.method
      });

      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token provided', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        route: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        statusCode: 401
      });
    }
  } catch (error) {
    logger.error('Error in authentication middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      route: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      statusCode: 500
    });
  }
}