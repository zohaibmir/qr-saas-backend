/**
 * Express Type Extensions
 * 
 * Type definitions for extending Express.js types to include custom properties
 * like authenticated user information for the business tools service.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        organizationId?: string;
      };
      requestId?: string;
      startTime?: number;
    }
  }
}

// Re-export commonly used Express types for convenience
export type { Request, Response, NextFunction } from 'express';
export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    role?: string;
    organizationId?: string;
  };
};