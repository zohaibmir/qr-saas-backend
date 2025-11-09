import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ValidationError, AppError } from '../interfaces';

// Additional error classes for subscription validation
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

// Simple logger for the middleware
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.log(`[DEBUG] ${message}`, meta || '')
};

interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  plan: {
    id: string;
    name: string;
    price: number;
    qrLimit: number;
    analyticsRetentionDays: number;
    features: string[];
    isActive: boolean;
  };
}

interface SubscriptionUsage {
  qrCodesUsed: number;
  qrCodesLimit: number;
  analyticsRetentionDays: number;
  features: string[];
}

export class SubscriptionMiddleware {
  private userServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  }

  /**
   * Validates user subscription and adds subscription info to request
   */
  validateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['user-id'] as string;
      
      if (!userId) {
        throw new UnauthorizedError('User ID is required in headers');
      }

      // Get user subscription from user service
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new ForbiddenError('No active subscription found');
      }

      // Validate subscription is active
      if (subscription.status !== 'active') {
        throw new ForbiddenError('Subscription is not active');
      }

      // Check if subscription has expired
      const now = new Date();
      if (new Date(subscription.currentPeriodEnd) < now) {
        throw new ForbiddenError('Subscription has expired');
      }

      // Add subscription info to request for downstream use
      (req as any).subscription = subscription;
      (req as any).userId = userId;

      logger.info('Subscription validated successfully', {
        userId,
        planName: subscription.plan.name,
        retentionDays: subscription.plan.analyticsRetentionDays
      });

      next();
    } catch (error: any) {
      logger.error('Subscription validation failed', {
        userId: req.headers['user-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_VALIDATION_FAILED',
            message: 'Failed to validate subscription',
            statusCode: 500
          }
        });
      }
    }
  };

  /**
   * Validates if user has access to specific analytics features
   */
  validateAnalyticsFeature = (requiredFeature: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const subscription = (req as any).subscription as UserSubscription;
        
        if (!subscription) {
          throw new ForbiddenError('Subscription information not found');
        }

        // Check if user has access to the required feature
        if (!subscription.plan.features.includes(requiredFeature)) {
          throw new ForbiddenError(`Feature '${requiredFeature}' is not available in your subscription plan`);
        }

        logger.info('Analytics feature access validated', {
          userId: (req as any).userId,
          feature: requiredFeature,
          planName: subscription.plan.name
        });

        next();
      } catch (error: any) {
        logger.error('Analytics feature validation failed', {
          userId: (req as any).userId,
          feature: requiredFeature,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (error instanceof ForbiddenError) {
          res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              statusCode: error.statusCode
            }
          });
        } else {
          res.status(500).json({
            success: false,
            error: {
              code: 'FEATURE_VALIDATION_FAILED',
              message: 'Failed to validate feature access',
              statusCode: 500
            }
          });
        }
      }
    };
  };

  /**
   * Validates analytics data retention based on subscription plan
   */
  validateDataRetention = (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = (req as any).subscription as UserSubscription;
      const { startDate } = req.query;
      
      if (!subscription) {
        throw new ForbiddenError('Subscription information not found');
      }

      // If startDate is provided, validate it's within retention period
      if (startDate) {
        const requestedStartDate = new Date(startDate as string);
        const retentionDays = subscription.plan.analyticsRetentionDays;
        
        // If retention is unlimited (-1), allow any date
        if (retentionDays > 0) {
          const earliestAllowedDate = new Date();
          earliestAllowedDate.setDate(earliestAllowedDate.getDate() - retentionDays);
          
          if (requestedStartDate < earliestAllowedDate) {
            throw new ForbiddenError(
              `Analytics data is only available for the last ${retentionDays} days in your subscription plan`
            );
          }
        }
      }

      // Add retention info to request
      (req as any).analyticsRetentionDays = subscription.plan.analyticsRetentionDays;

      logger.info('Data retention validated', {
        userId: (req as any).userId,
        retentionDays: subscription.plan.analyticsRetentionDays,
        requestedStartDate: startDate
      });

      next();
    } catch (error: any) {
      logger.error('Data retention validation failed', {
        userId: (req as any).userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ForbiddenError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'RETENTION_VALIDATION_FAILED',
            message: 'Failed to validate data retention',
            statusCode: 500
          }
        });
      }
    }
  };

  /**
   * Validates QR code ownership and access rights
   */
  validateQRCodeAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const qrCodeId = req.params.qrCodeId || req.body.qrCodeId || req.query.qrCodeId;
      
      if (!qrCodeId) {
        throw new ValidationError('QR Code ID is required');
      }

      // Check if user owns the QR code by calling QR service
      const hasAccess = await this.validateQRCodeOwnership(userId, qrCodeId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this QR code');
      }

      // Add QR code ID to request
      (req as any).qrCodeId = qrCodeId;

      logger.info('QR code access validated', {
        userId,
        qrCodeId
      });

      next();
    } catch (error: any) {
      logger.error('QR code access validation failed', {
        userId: (req as any).userId,
        qrCodeId: req.params.qrCodeId || req.body.qrCodeId || req.query.qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || error instanceof ForbiddenError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'QR_ACCESS_VALIDATION_FAILED',
            message: 'Failed to validate QR code access',
            statusCode: 500
          }
        });
      }
    }
  };

  /**
   * Gets user subscription from user service
   */
  private async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/subscriptions/user/${userId}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch user subscription', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // If user service is down or user has no subscription, treat as no subscription
      return null;
    }
  }

  /**
   * Validates QR code ownership by calling QR service
   */
  private async validateQRCodeOwnership(userId: string, qrCodeId: string): Promise<boolean> {
    try {
      const qrServiceUrl = process.env.QR_SERVICE_URL || 'http://localhost:3001';
      
      const response = await axios.get(`${qrServiceUrl}/api/qr/${qrCodeId}/owner/${userId}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.success && response.data.data.hasAccess;
    } catch (error) {
      logger.error('Failed to validate QR code ownership', {
        userId,
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // If QR service is down or validation fails, deny access for security
      return false;
    }
  }
}

export const subscriptionMiddleware = new SubscriptionMiddleware();