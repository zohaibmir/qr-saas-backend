/**
 * Authentication Domain Interfaces
 * Following Dependency Inversion Principle from SOLID
 */

import { AuthUser } from '../entities/auth-user.entity';

// JWT Token Service Interface
export interface IJwtTokenService {
  verifyToken(token: string): Promise<AuthUser>;
  isTokenExpired(token: string): boolean;
  decodeTokenUnsafe(token: string): any;
}

// Authentication Context Repository Interface
export interface IAuthContextRepository {
  storeAuthContext(requestId: string, authUser: AuthUser): Promise<void>;
  getAuthContext(requestId: string): Promise<AuthUser | null>;
  clearAuthContext(requestId: string): Promise<void>;
}

// Route Classification Service Interface
export interface IRouteClassificationService {
  isPublicRoute(method: string, path: string): boolean;
  isProtectedRoute(method: string, path: string): boolean;
  isOptionalAuthRoute(method: string, path: string): boolean;
  getRequiredPermissions(method: string, path: string): string[];
  getMinimumSubscriptionTier(method: string, path: string): string | null;
  getRouteConfig(method: string, path: string): RouteConfigResult;
}

// Route configuration result type
export interface RouteConfigResult {
  isPublic: boolean;
  isProtected: boolean;
  isOptionalAuth: boolean;
  requiredPermissions: string[];
  minimumSubscriptionTier: string | null;
  requiresEmailVerification: boolean;
  isOrganizationScoped: boolean;
}

// Authentication Strategy Interface (Strategy Pattern)
export interface IAuthenticationStrategy {
  authenticate(headers: Record<string, string | string[] | undefined>): Promise<AuthUser | null>;
  getStrategyName(): string;
}

// Authorization Service Interface
export interface IAuthorizationService {
  hasPermission(user: AuthUser, permission: string): boolean;
  hasSubscriptionAccess(user: AuthUser, requiredTier: string): boolean;
  canAccessOrganizationResource(user: AuthUser, organizationId: string): boolean;
}

// Audit Logger Interface (for security events)
export interface IAuthAuditLogger {
  logAuthenticationAttempt(event: AuthenticationEvent): Promise<void>;
  logAuthorizationFailure(event: AuthorizationEvent): Promise<void>;
  logSecurityEvent(event: SecurityEvent): Promise<void>;
}

// Event Types for Audit Logging
export interface AuthenticationEvent {
  userId?: string;
  email?: string;
  method: string;
  path: string;
  success: boolean;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AuthorizationEvent {
  userId: string;
  action: string;
  resource: string;
  success: boolean;
  reason?: string;
  requiredPermission?: string;
  userPermissions: string[];
  ipAddress: string;
  timestamp: Date;
}

export interface SecurityEvent {
  type: 'invalid_token' | 'expired_token' | 'malformed_request' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Authentication Result Types
export interface AuthenticationResult {
  success: boolean;
  user?: AuthUser;
  error?: AuthenticationError;
}

export interface AuthenticationError {
  code: AuthErrorCode;
  message: string;
  statusCode: number;
}

export enum AuthErrorCode {
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_MALFORMED = 'TOKEN_MALFORMED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED',
  ORGANIZATION_ACCESS_DENIED = 'ORGANIZATION_ACCESS_DENIED',
  AUTHENTICATION_SERVICE_ERROR = 'AUTHENTICATION_SERVICE_ERROR'
}

// Route Configuration Types
export interface RouteConfig {
  pattern: string;
  method: string;
  isPublic: boolean;
  requiredPermissions?: string[];
  minimumSubscriptionTier?: string;
  requireEmailVerification?: boolean;
  organizationScoped?: boolean;
}

// Authentication Middleware Configuration
export interface AuthMiddlewareConfig {
  jwtSecret: string;
  jwtIssuer: string;
  enableAuditLogging: boolean;
  enableRequestCaching: boolean;
  publicRoutes: RouteConfig[];
  protectedRoutes: RouteConfig[];
  optionalAuthRoutes: RouteConfig[];
}

// Request Context Interface
export interface IRequestContext {
  requestId: string;
  user?: AuthUser;
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  timestamp: Date;
}