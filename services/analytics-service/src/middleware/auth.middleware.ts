/**
 * Analytics Service Authentication Context Extraction
 * Clean Architecture - Following QR Service Pattern Exactly
 * 
 * API Gateway → JWT Validation → x-auth-* headers → Simple extraction → req.auth
 * NO authentication logic here - just context extraction
 */

import { Request, Response, NextFunction } from 'express';

/**
 * User context from API Gateway headers (same as QR service)
 */
export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  subscriptionTier: 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
  isEmailVerified: boolean;
  permissions?: string[];
  organizationId?: string;
}

/**
 * Extend Express Request with auth context (same as QR service)
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

/**
 * Extract auth context from API Gateway headers
 * This middleware ONLY extracts - it doesn't validate or authenticate
 */
export const extractAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-auth-user-id'] as string;
  const email = req.headers['x-auth-email'] as string;
  const username = req.headers['x-auth-username'] as string;
  const subscriptionTier = req.headers['x-auth-subscription'] as string || 'free';
  const isEmailVerified = req.headers['x-auth-email-verified'] === 'true';
  const organizationId = req.headers['x-auth-organization-id'] as string;
  const permissionsHeader = req.headers['x-auth-permissions'] as string;

  // Parse permissions if present
  let permissions: string[] = [];
  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader);
    } catch {
      permissions = [];
    }
  }

  // If we have user context from API Gateway, attach it
  if (userId && email) {
    req.auth = {
      userId,
      email,
      username: username || email.split('@')[0],
      subscriptionTier: subscriptionTier as 'free' | 'starter' | 'pro' | 'business' | 'enterprise',
      isEmailVerified,
      permissions,
      organizationId
    };
  }
  // If no auth context, continue without user (for guest analytics)

  next();
};

/**
 * Require authentication for protected endpoints
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth?.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        statusCode: 401
      }
    });
    return;
  }
  next();
};

/**
 * Require specific subscription tier (same logic as QR service)
 */
export const requireSubscriptionTier = (requiredTier: 'starter' | 'pro' | 'business' | 'enterprise') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth?.userId) {
      return requireAuth(req, res, next);
    }

    const userTier = req.auth.subscriptionTier;
    const tierHierarchy = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const requiredLevel = tierHierarchy.indexOf(requiredTier);
    const userLevel = tierHierarchy.indexOf(userTier);

    if (userLevel < requiredLevel) {
      res.status(402).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
          message: `This analytics feature requires ${requiredTier} subscription or higher. Current: ${userTier}`,
          statusCode: 402,
          upgradeRequired: requiredTier
        }
      });
      return;
    }

    next();
  };
};