// Express.js type extensions for team service
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        subscriptionTier?: string;
      };
      requestId?: string;
    }
  }
}

export {};