import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier?: string;
  };
}

// Simple auth middleware following API Gateway pattern
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // First check for x-user-id header (from API Gateway)
    const userIdHeader = req.header('x-user-id') || req.header('user-id');
    
    if (userIdHeader) {
      // Use user ID from header (API Gateway pattern)
      req.user = {
        id: userIdHeader,
        email: `user-${userIdHeader}@example.com`, // Placeholder email
        subscriptionTier: 'free' // Default tier
      };
      next();
      return;
    }
    
    // Fallback to JWT token authentication
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token or user ID required'
        }
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
    return;
  }
};