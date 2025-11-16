/**
 * Authentication Middleware for API Gateway
 * Following Dependency Inversion and Single Responsibility from SOLID
 * Clean Architecture Application Layer Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { 
  IJwtTokenService, 
  IRouteClassificationService,
  IAuthorizationService,
  IAuthAuditLogger,
  AuthenticationResult,
  AuthErrorCode,
  IRequestContext
} from '../interfaces/auth.interfaces';
import { AuthUser } from '../entities/auth-user.entity';

// Extend Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      requestContext?: IRequestContext;
    }
  }
}

export class AuthenticationMiddleware {
  constructor(
    private readonly jwtTokenService: IJwtTokenService,
    private readonly routeClassificationService: IRouteClassificationService,
    private readonly authorizationService: IAuthorizationService,
    private readonly auditLogger?: IAuthAuditLogger
  ) {}

  /**
   * Main authentication middleware factory
   */
  public createAuthMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Create request context
        const requestContext = this.createRequestContext(req);
        req.requestContext = requestContext;

        // Check route classification
        const routeConfig = this.routeClassificationService.getRouteConfig(req.method, req.path);

        if (routeConfig.isPublic) {
          // Public route - no authentication required
          await this.logEvent('public_route_access', requestContext, true);
          next();
          return;
        }

        // Extract and validate authentication
        const authResult = await this.authenticateRequest(req);

        if (!authResult.success) {
          await this.handleAuthenticationFailure(authResult, req, res, requestContext);
          return;
        }

        const user = authResult.user!;
        req.auth = user;

        // For optional auth routes, proceed even if no user
        if (routeConfig.isOptionalAuth && !user) {
          next();
          return;
        }

        // Authorization checks for protected routes
        if (routeConfig.isProtected) {
          const authzResult = await this.authorizeRequest(user, req, routeConfig);
          
          if (!authzResult.allowed) {
            await this.handleAuthorizationFailure(authzResult, user, req, res, requestContext);
            return;
          }
        }

        // Add user context to headers for downstream services
        this.setAuthHeaders(req, user);

        await this.logEvent('authenticated_request', requestContext, true, user);
        next();

      } catch (error) {
        await this.handleMiddlewareError(error, req, res);
      }
    };
  }

  /**
   * Optional authentication middleware for routes that work better with auth
   */
  public createOptionalAuthMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const requestContext = this.createRequestContext(req);
        req.requestContext = requestContext;

        const authResult = await this.authenticateRequest(req);
        
        if (authResult.success && authResult.user) {
          req.auth = authResult.user;
          this.setAuthHeaders(req, authResult.user);
          await this.logEvent('optional_auth_success', requestContext, true, authResult.user);
        } else {
          await this.logEvent('optional_auth_none', requestContext, true);
        }

        next();
      } catch (error) {
        // For optional auth, don't fail on auth errors
        await this.logEvent('optional_auth_error', this.createRequestContext(req), false);
        next();
      }
    };
  }

  /**
   * Authenticate the request and extract user
   */
  private async authenticateRequest(req: Request): Promise<AuthenticationResult> {
    try {
      const authHeader = req.headers['authorization'];
      
      if (!authHeader) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_MISSING,
            message: 'Authorization header missing',
            statusCode: 401
          }
        };
      }

      if (!authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_MALFORMED,
            message: 'Invalid authorization header format',
            statusCode: 400
          }
        };
      }

      const token = authHeader.substring(7);
      const user = await this.jwtTokenService.verifyToken(token);

      // Check if token is expired (additional check)
      if (user.isTokenExpired()) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED,
            message: 'Token has expired',
            statusCode: 401
          }
        };
      }

      return {
        success: true,
        user
      };

    } catch (error: any) {
      if (error.code && error.statusCode) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: AuthErrorCode.AUTHENTICATION_SERVICE_ERROR,
          message: 'Authentication service error',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Authorize the authenticated user for the requested resource
   */
  private async authorizeRequest(user: AuthUser, req: Request, routeConfig: any): Promise<{
    allowed: boolean;
    reason?: string;
    upgradeRequired?: string;
  }> {
    // Check email verification requirement
    if (routeConfig.requiresEmailVerification && !user.isEmailVerified) {
      return {
        allowed: false,
        reason: 'Email verification required'
      };
    }

    // Check required permissions
    if (routeConfig.requiredPermissions.length > 0) {
      const hasPermission = user.hasAnyPermission(routeConfig.requiredPermissions);
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Missing required permissions: ${routeConfig.requiredPermissions.join(', ')}`
        };
      }
    }

    // Check subscription tier
    if (routeConfig.minimumSubscriptionTier) {
      const hasSubscriptionAccess = this.authorizationService.hasSubscriptionAccess(
        user, 
        routeConfig.minimumSubscriptionTier
      );
      
      if (!hasSubscriptionAccess) {
        return {
          allowed: false,
          reason: 'Subscription upgrade required',
          upgradeRequired: routeConfig.minimumSubscriptionTier
        };
      }
    }

    // Check organization scope
    if (routeConfig.isOrganizationScoped) {
      const orgId = req.params.organizationId || req.body?.organizationId;
      if (orgId && !user.belongsToOrganization(orgId)) {
        return {
          allowed: false,
          reason: 'Access denied to organization resource'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Set authentication headers for downstream services
   */
  private setAuthHeaders(req: Request, user: AuthUser): void {
    const authHeaders = user.toServiceHeaders();
    
    Object.entries(authHeaders).forEach(([key, value]) => {
      req.headers[key] = value;
    });

    // Add request context
    req.headers['x-request-id'] = req.requestContext?.requestId || `req_${Date.now()}`;
  }

  /**
   * Create request context for logging and tracking
   */
  private createRequestContext(req: Request): IRequestContext {
    return {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ipAddress: (req.ip || req.connection.remoteAddress || 'unknown'),
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      path: req.path,
      timestamp: new Date()
    };
  }

  /**
   * Handle authentication failures
   */
  private async handleAuthenticationFailure(
    authResult: AuthenticationResult,
    req: Request,
    res: Response,
    requestContext: IRequestContext
  ): Promise<void> {
    const error = authResult.error!;
    
    await this.logEvent('authentication_failure', requestContext, false, undefined, error.code);

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle authorization failures
   */
  private async handleAuthorizationFailure(
    authzResult: any,
    user: AuthUser,
    req: Request,
    res: Response,
    requestContext: IRequestContext
  ): Promise<void> {
    await this.logEvent('authorization_failure', requestContext, false, user, authzResult.reason);

    const statusCode = authzResult.upgradeRequired ? 402 : 403;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: authzResult.upgradeRequired ? 'SUBSCRIPTION_UPGRADE_REQUIRED' : 'INSUFFICIENT_PERMISSIONS',
        message: authzResult.reason,
        upgradeRequired: authzResult.upgradeRequired,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle middleware errors
   */
  private async handleMiddlewareError(
    error: any,
    req: Request,
    res: Response
  ): Promise<void> {
    console.error('Authentication middleware error:', error);

    await this.logEvent(
      'middleware_error', 
      this.createRequestContext(req), 
      false, 
      undefined, 
      error.message
    );

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_SERVICE_ERROR',
        message: 'Internal authentication error',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log authentication events
   */
  private async logEvent(
    eventType: string,
    requestContext: IRequestContext,
    success: boolean,
    user?: AuthUser,
    error?: string
  ): Promise<void> {
    if (!this.auditLogger) {
      return; // Audit logging not enabled
    }

    try {
      const event = {
        userId: user?.userId,
        email: user?.email,
        method: requestContext.method,
        path: requestContext.path,
        success,
        reason: error,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        timestamp: requestContext.timestamp
      };

      await this.auditLogger.logAuthenticationAttempt(event);
    } catch (auditError) {
      console.error('Failed to log authentication event:', auditError);
    }
  }

  /**
   * Create middleware instance factory
   */
  public static create(
    jwtTokenService: IJwtTokenService,
    routeClassificationService: IRouteClassificationService,
    authorizationService: IAuthorizationService,
    auditLogger?: IAuthAuditLogger
  ): AuthenticationMiddleware {
    return new AuthenticationMiddleware(
      jwtTokenService,
      routeClassificationService,
      authorizationService,
      auditLogger
    );
  }
}