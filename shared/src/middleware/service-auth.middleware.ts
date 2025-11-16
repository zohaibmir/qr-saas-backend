/**
 * Service Authentication Middleware Example
 * Shows how to integrate Clean Architecture auth in microservices
 * Following Single Responsibility Principle from SOLID
 */

import { Request, Response, NextFunction } from 'express';
import { ServiceAuthExtractor, AuthUser } from '../auth';
import { AuthorizationService } from '../auth/services/authorization.service';

// Extend Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export class ServiceAuthMiddleware {
  private readonly authorizationService: AuthorizationService;

  constructor() {
    this.authorizationService = new AuthorizationService();
  }

  /**
   * Extract authentication context from gateway headers
   * Use this on all service endpoints
   */
  public extractAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const auth = ServiceAuthExtractor.extractAuthUser(req.headers);
      if (auth) {
        req.auth = auth;
      }
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_CONTEXT_ERROR',
          message: 'Failed to process authentication context'
        }
      });
    }
  };

  /**
   * Require authentication for protected endpoints
   */
  public requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const auth = ServiceAuthExtractor.requireAuthUser(req.headers);
      req.auth = auth;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'This endpoint requires authentication'
        }
      });
    }
  };

  /**
   * Require specific subscription tier
   */
  public requireSubscription = (minTier: 'free' | 'pro' | 'business' | 'enterprise') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        });
        return;
      }

      if (!this.authorizationService.hasSubscriptionAccess(req.auth, minTier)) {
        res.status(402).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
            message: `This feature requires ${minTier} subscription or higher`,
            currentTier: req.auth.subscriptionTier,
            requiredTier: minTier
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Require specific permission
   */
  public requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        });
        return;
      }

      if (!this.authorizationService.hasPermission(req.auth, permission)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Missing required permission: ${permission}`,
            userPermissions: req.auth.permissions
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Require email verification
   */
  public requireEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!req.auth.isEmailVerified) {
      res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_REQUIRED',
          message: 'Email verification required for this action'
        }
      });
      return;
    }

    next();
  };

  /**
   * Validate organization access
   */
  public requireOrganizationAccess = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const organizationId = req.params.organizationId || req.body?.organizationId;
    
    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ORGANIZATION_ID_REQUIRED',
          message: 'Organization ID is required'
        }
      });
      return;
    }

    if (!req.auth.belongsToOrganization(organizationId)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_ACCESS_DENIED',
          message: 'Access denied to organization resource'
        }
      });
      return;
    }

    next();
  };

  /**
   * Check usage limits based on subscription
   */
  public checkUsageLimits = (resourceType: 'qrCodes' | 'scans' | 'teamMembers' | 'apiCalls') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        });
        return;
      }

      try {
        const limits = this.authorizationService.getUsageLimits(req.auth);
        
        // This is a simplified example - in real implementation,
        // you would check actual usage against these limits
        const limitMap = {
          'qrCodes': limits.qrCodesPerMonth,
          'scans': limits.scansPerMonth,
          'teamMembers': limits.teamMembers,
          'apiCalls': limits.apiCallsPerDay
        };

        const limit = limitMap[resourceType];
        
        // Add limit info to request for service to check
        (req as any).usageLimit = {
          type: resourceType,
          limit: limit,
          unlimited: limit === -1
        };

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'USAGE_LIMIT_CHECK_ERROR',
            message: 'Failed to check usage limits'
          }
        });
      }
    };
  };
}

// Export singleton instance
export const serviceAuth = new ServiceAuthMiddleware();