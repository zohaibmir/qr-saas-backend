import { Request, Response, NextFunction } from 'express';
import { AdminService, AdminUser } from '../services/admin.service';
import { logger, logSecurityEvent } from '../utils/logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
      adminPermissions?: string[];
    }
  }
}

/**
 * Middleware to authenticate admin requests using JWT tokens
 */
export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication token required'
      });
      return;
    }

    // Verify token and get admin user
    const admin = await AdminService.verifyToken(token);

    if (!admin) {
      logSecurityEvent({
        type: 'permission_denied',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Invalid or expired token'
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired admin authentication token'
      });
      return;
    }

    // Attach admin data to request
    req.admin = admin;
    req.adminPermissions = AdminService.getPermissions(admin.role);

    // Log token refresh if needed (optional)
    if (req.path === '/auth/refresh') {
      logSecurityEvent({
        type: 'token_refresh',
        adminId: admin.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    next();

  } catch (error) {
    logger.error('Admin authentication middleware error:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service error'
    });
  }
};

/**
 * Middleware to check if admin has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.admin || !req.adminPermissions) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin authentication required'
        });
        return;
      }

      if (!req.adminPermissions.includes(permission)) {
        logSecurityEvent({
          type: 'permission_denied',
          adminId: req.admin.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: `Missing permission: ${permission}`
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions for this action',
          requiredPermission: permission
        });
        return;
      }

      next();

    } catch (error) {
      logger.error('Permission check middleware error:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Permission validation error'
      });
    }
  };
};

/**
 * Middleware to check if admin has any of the specified permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.admin || !req.adminPermissions) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin authentication required'
        });
        return;
      }

      const hasPermission = permissions.some(permission => 
        req.adminPermissions!.includes(permission)
      );

      if (!hasPermission) {
        logSecurityEvent({
          type: 'permission_denied',
          adminId: req.admin.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: `Missing any of permissions: ${permissions.join(', ')}`
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions for this action',
          requiredPermissions: permissions
        });
        return;
      }

      next();

    } catch (error) {
      logger.error('Permission check middleware error:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Permission validation error'
      });
    }
  };
};

/**
 * Middleware to check if admin has specific role
 */
export const requireRole = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.admin) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin authentication required'
        });
        return;
      }

      if (!requiredRoles.includes(req.admin.role)) {
        logSecurityEvent({
          type: 'permission_denied',
          adminId: req.admin.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: `Role ${req.admin.role} not in required roles: ${requiredRoles.join(', ')}`
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient role for this action',
          requiredRoles,
          currentRole: req.admin.role
        });
        return;
      }

      next();

    } catch (error) {
      logger.error('Role check middleware error:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Role validation error'
      });
    }
  };
};

/**
 * Middleware to ensure only super admin can access
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Middleware to log admin activity for certain routes
 */
export const logActivity = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        next();
        return;
      }

      // Store activity details for later logging
      req.adminActivity = {
        action,
        resource,
        resourceId: req.params.id,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: action.includes('read') ? undefined : req.body // Don't log body for read operations
        }
      };

      next();

    } catch (error) {
      logger.error('Activity logging middleware error:', error);
      next();
    }
  };
};

// Extend Express Request interface for activity logging
declare global {
  namespace Express {
    interface Request {
      adminActivity?: {
        action: string;
        resource: string;
        resourceId?: string;
        details?: any;
      };
    }
  }
}