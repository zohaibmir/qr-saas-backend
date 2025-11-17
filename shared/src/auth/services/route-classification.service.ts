/**
 * Route Classification Service
 * Following Open/Closed Principle from SOLID
 * Extensible route classification without modifying existing code
 */

import { IRouteClassificationService, RouteConfig } from '../interfaces/auth.interfaces';

export class RouteClassificationService implements IRouteClassificationService {
  private readonly publicRoutes: RouteConfig[];
  private readonly protectedRoutes: RouteConfig[];
  private readonly optionalAuthRoutes: RouteConfig[];

  constructor(
    publicRoutes: RouteConfig[],
    protectedRoutes: RouteConfig[],
    optionalAuthRoutes: RouteConfig[] = []
  ) {
    this.publicRoutes = this.normalizeRoutes(publicRoutes);
    this.protectedRoutes = this.normalizeRoutes(protectedRoutes);
    this.optionalAuthRoutes = this.normalizeRoutes(optionalAuthRoutes);
  }

  public isPublicRoute(method: string, path: string): boolean {
    return this.matchesRoute(method, path, this.publicRoutes);
  }

  public isProtectedRoute(method: string, path: string): boolean {
    return this.matchesRoute(method, path, this.protectedRoutes);
  }

  public isOptionalAuthRoute(method: string, path: string): boolean {
    return this.matchesRoute(method, path, this.optionalAuthRoutes);
  }

  public getRequiredPermissions(method: string, path: string): string[] {
    const route = this.findMatchingRoute(method, path, this.protectedRoutes);
    return route?.requiredPermissions || [];
  }

  public getMinimumSubscriptionTier(method: string, path: string): string | null {
    const route = this.findMatchingRoute(method, path, this.protectedRoutes);
    return route?.minimumSubscriptionTier || null;
  }

  public requiresEmailVerification(method: string, path: string): boolean {
    const route = this.findMatchingRoute(method, path, this.protectedRoutes);
    return route?.requireEmailVerification || false;
  }

  public isOrganizationScoped(method: string, path: string): boolean {
    const route = this.findMatchingRoute(method, path, this.protectedRoutes);
    return route?.organizationScoped || false;
  }

  private matchesRoute(method: string, path: string, routes: RouteConfig[]): boolean {
    return this.findMatchingRoute(method, path, routes) !== null;
  }

  private findMatchingRoute(method: string, path: string, routes: RouteConfig[]): RouteConfig | null {
    const normalizedMethod = method.toUpperCase();
    const normalizedPath = this.normalizePath(path);

    return routes.find(route => {
      return this.isMethodMatch(normalizedMethod, route.method) &&
             this.isPathMatch(normalizedPath, route.pattern);
    }) || null;
  }

  private isMethodMatch(requestMethod: string, routeMethod: string): boolean {
    if (routeMethod === '*') return true;
    return requestMethod === routeMethod.toUpperCase();
  }

  private isPathMatch(requestPath: string, routePattern: string): boolean {
    // Convert route pattern to regex
    const regexPattern = this.convertPatternToRegex(routePattern);
    return regexPattern.test(requestPath);
  }

  private convertPatternToRegex(pattern: string): RegExp {
    // Handle exact matches
    if (!pattern.includes('*') && !pattern.includes(':')) {
      return new RegExp(`^${this.escapeRegex(pattern)}$`);
    }

    // Replace wildcards and parameters
    let regexPattern = this.escapeRegex(pattern);
    
    // Replace named parameters (:param) with regex group
    regexPattern = regexPattern.replace(/:([^/]+)/g, '([^/]+)');
    
    // Replace wildcards (*) with regex
    regexPattern = regexPattern.replace(/\\\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizePath(path: string): string {
    // Remove trailing slash except for root
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return path;
  }

  private normalizeRoutes(routes: RouteConfig[]): RouteConfig[] {
    return routes.map(route => ({
      ...route,
      method: route.method.toUpperCase(),
      pattern: this.normalizePath(route.pattern)
    }));
  }

  // Helper method to get route configuration for debugging
  public getRouteConfig(method: string, path: string): {
    isPublic: boolean;
    isProtected: boolean;
    isOptionalAuth: boolean;
    requiredPermissions: string[];
    minimumSubscriptionTier: string | null;
    requiresEmailVerification: boolean;
    isOrganizationScoped: boolean;
  } {
    return {
      isPublic: this.isPublicRoute(method, path),
      isProtected: this.isProtectedRoute(method, path),
      isOptionalAuth: this.isOptionalAuthRoute(method, path),
      requiredPermissions: this.getRequiredPermissions(method, path),
      minimumSubscriptionTier: this.getMinimumSubscriptionTier(method, path),
      requiresEmailVerification: this.requiresEmailVerification(method, path),
      isOrganizationScoped: this.isOrganizationScoped(method, path)
    };
  }
}

// Default route configurations
export const DEFAULT_PUBLIC_ROUTES: RouteConfig[] = [
  // Authentication routes
  { pattern: '/api/auth/login', method: 'POST', isPublic: true },
  { pattern: '/api/auth/register', method: 'POST', isPublic: true },
  { pattern: '/api/auth/forgot-password', method: 'POST', isPublic: true },
  { pattern: '/api/auth/reset-password', method: 'POST', isPublic: true },
  { pattern: '/api/auth/verify-email', method: 'GET', isPublic: true },
  
  // Public QR access
  { pattern: '/r/:shortId', method: 'GET', isPublic: true },
  { pattern: '/p/:slug', method: 'GET', isPublic: true },
  { pattern: '/uploads/qr-images/*', method: 'GET', isPublic: true },
  
  // Health and system (specific health endpoints must come before wildcard patterns)
  { pattern: '/health', method: 'GET', isPublic: true },
  { pattern: '/health/*', method: 'GET', isPublic: true },
  { pattern: '/api/files/health', method: 'GET', isPublic: true },
  { pattern: '/api/files/health/*', method: 'GET', isPublic: true },
  { pattern: '/api/*/health', method: 'GET', isPublic: true },
  { pattern: '/api/*/health/*', method: 'GET', isPublic: true },
  { pattern: '/', method: 'GET', isPublic: true },
  { pattern: '/api-docs', method: 'GET', isPublic: true },
  { pattern: '/api-docs/*', method: 'GET', isPublic: true },
  
  // Public API endpoints (may use API key auth instead)
  { pattern: '/api/public/*', method: '*', isPublic: true },
];

export const DEFAULT_OPTIONAL_AUTH_ROUTES: RouteConfig[] = [
  // Templates work better with auth but don't require it
  { pattern: '/api/templates', method: 'GET', isPublic: false },
  { pattern: '/api/landing-templates', method: 'GET', isPublic: false },
];

export const DEFAULT_PROTECTED_ROUTES: RouteConfig[] = [
  // User management
  { pattern: '/api/users', method: '*', isPublic: false },
  { pattern: '/api/users/*', method: '*', isPublic: false },
  
  // QR management
  { pattern: '/api/qr', method: 'POST', isPublic: false },
  { pattern: '/api/qr', method: 'PUT', isPublic: false },
  { pattern: '/api/qr', method: 'DELETE', isPublic: false },
  { pattern: '/api/qr/*', method: 'POST', isPublic: false },
  { pattern: '/api/qr/*', method: 'PUT', isPublic: false },
  { pattern: '/api/qr/*', method: 'DELETE', isPublic: false },
  
  // Analytics
  { pattern: '/api/analytics', method: '*', isPublic: false },
  { pattern: '/api/analytics/*', method: '*', isPublic: false },
  
  // File management (exclude health endpoints which are public)
  { pattern: '/api/files', method: '*', isPublic: false },
  { pattern: '/api/files/*', method: '*', isPublic: false },
  
  // Teams (Pro tier and above)
  { 
    pattern: '/api/teams', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'pro'
  },
  { 
    pattern: '/api/teams/*', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'pro'
  },
  
  // Payments
  { pattern: '/api/payments', method: '*', isPublic: false },
  { pattern: '/api/payments/*', method: '*', isPublic: false },
  
  // Admin routes (special permissions required)
  { 
    pattern: '/api/admin/*', 
    method: '*', 
    isPublic: false,
    requiredPermissions: ['admin_access']
  },
  
  // Business tools (Business tier and above)
  { 
    pattern: '/api/business/*', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'business'
  },
  { 
    pattern: '/api/domains', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'business'
  },
  { 
    pattern: '/api/domains/*', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'business'
  },
  
  // White label (Enterprise only)
  { 
    pattern: '/api/white-label', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'enterprise'
  },
  { 
    pattern: '/api/white-label/*', 
    method: '*', 
    isPublic: false,
    minimumSubscriptionTier: 'enterprise'
  },
];