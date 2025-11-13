import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../interfaces';

// JWT secret - in production, this should come from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const API_KEY_HEADER = 'X-API-Key';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  permissions?: string[];
  iat: number;
  exp: number;
}

interface ApiKey {
  id: string;
  service: string;
  permissions?: string[];
}

// Mock API keys - in production, these should be stored in database
const API_KEYS: Record<string, ApiKey> = {
  'sk_test_analytics_service_12345': {
    id: 'analytics_service',
    service: 'analytics-service',
    permissions: ['read:policies', 'read:executions', 'read:archives']
  },
  'sk_test_qr_service_12345': {
    id: 'qr_service',
    service: 'qr-service',
    permissions: ['read:policies', 'create:requests', 'read:requests']
  },
  'sk_test_admin_service_12345': {
    id: 'admin_service',
    service: 'admin-service',
    permissions: ['*'] // Full access
  }
};

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string || req.headers[API_KEY_HEADER.toLowerCase()] as string;

    // Check for API key (service-to-service communication)
    if (apiKey) {
      // Check environment API key first (legacy support)
      if (apiKey === process.env.API_KEY) {
        req.user = {
          id: 'system',
          email: 'system@qrsaas.com',
          role: 'system',
          permissions: ['*']
        };
        return next();
      }

      // Check predefined API keys
      const keyData = API_KEYS[apiKey];
      if (keyData) {
        req.apiKey = keyData;
        req.logger?.info('API key authentication successful', {
          service: keyData.service,
          permissions: keyData.permissions,
          requestId: req.requestId
        });
        return next();
      }

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
        requestId: req.requestId
      });
      return;
    }

    // Check for JWT token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header required',
        requestId: req.requestId
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!JWT_SECRET) {
      logger.error('JWT_SECRET environment variable not set');
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication configuration error',
        requestId: req.requestId
      });
      return;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      
      req.user = {
        id: payload.id || (payload as any).userId || (payload as any).sub,
        email: payload.email,
        role: payload.role || 'user',
        permissions: payload.permissions || []
      };

      req.logger?.info('JWT authentication successful', {
        userId: req.user.id,
        role: req.user.role,
        requestId: req.requestId
      });

      next();

    } catch (jwtError: any) {
      logger.warn('JWT verification failed', {
        error: jwtError.message,
        requestId: req.requestId
      });

      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          error: 'Token Expired',
          message: 'JWT token has expired. Please refresh your token.',
          requestId: req.requestId
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        res.status(401).json({
          error: 'Invalid Token',
          message: 'JWT token is invalid or malformed.',
          requestId: req.requestId
        });
      } else {
        res.status(401).json({
          error: 'Authentication Failed',
          message: 'Token verification failed.',
          requestId: req.requestId
        });
      }
    }

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication error',
      requestId: req.requestId
    });
  }
};

export const authorize = (requiredRoles: string[] = []) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user && !req.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        requestId: req.requestId
      });
      return;
    }

    // API keys with full permissions bypass role checks
    if (req.apiKey?.permissions?.includes('*')) {
      return next();
    }

    if (requiredRoles.length > 0) {
      const userRole = req.user?.role;
      if (!userRole || (!requiredRoles.includes(userRole) && userRole !== 'admin')) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          requestId: req.requestId
        });
        return;
      }
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    let hasPermission = false;

    // Check JWT user permissions
    if (req.user) {
      const userPermissions = req.user.permissions || [];
      hasPermission = userPermissions.includes(permission) || 
                    userPermissions.includes('*') ||
                    req.user.role === 'admin';
    }

    // Check API key permissions
    if (!hasPermission && req.apiKey) {
      const apiPermissions = req.apiKey.permissions || [];
      hasPermission = apiPermissions.includes(permission) || 
                     apiPermissions.includes('*');
    }

    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        userId: req.user?.id,
        apiKeyService: req.apiKey?.service,
        requiredPermission: permission,
        userPermissions: req.user?.permissions,
        apiPermissions: req.apiKey?.permissions,
        requestId: req.requestId
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required permission: ${permission}`,
        requestId: req.requestId
      });
      return;
    }

    next();
  };
};

// Optional authentication - continues even if no token provided
export const optionalAuthenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string || req.headers[API_KEY_HEADER.toLowerCase()] as string;
  
  if (apiKey || (authHeader && authHeader.startsWith('Bearer '))) {
    authenticate(req, res, next);
  } else {
    // No authentication provided, continue without user
    next();
  }
};

export default authenticate;