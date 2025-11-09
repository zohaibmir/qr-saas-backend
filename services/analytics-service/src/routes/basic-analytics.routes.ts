import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { SubscriptionAwareAnalyticsService } from '../services/subscription-aware-analytics.service';
import { subscriptionMiddleware } from '../middleware/subscription.middleware';
import { ILogger } from '../interfaces';

class BasicAnalyticsRoutes {
  private router: Router;
  private analyticsService: AnalyticsService;
  private subscriptionAwareService: SubscriptionAwareAnalyticsService;
  private logger: ILogger;

  constructor(analyticsService: AnalyticsService, logger: ILogger) {
    this.router = Router();
    this.analyticsService = analyticsService;
    this.subscriptionAwareService = new SubscriptionAwareAnalyticsService(
      analyticsService,
      (analyticsService as any).analyticsRepository,
      logger
    );
    this.logger = logger;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Track scan endpoint (no subscription check needed for tracking)
    this.router.post('/track', this.trackScan.bind(this));

    // Analytics retrieval endpoints with subscription validation
    this.router.get('/qr/:qrCodeId', 
      subscriptionMiddleware.validateSubscription,
      subscriptionMiddleware.validateQRCodeAccess,
      subscriptionMiddleware.validateDataRetention,
      this.getQRAnalytics.bind(this)
    );

    this.router.get('/user', 
      subscriptionMiddleware.validateSubscription,
      this.getUserAnalytics.bind(this)
    );

    // Export endpoints with feature validation
    this.router.get('/qr/:qrCodeId/export', 
      subscriptionMiddleware.validateSubscription,
      subscriptionMiddleware.validateQRCodeAccess,
      subscriptionMiddleware.validateAnalyticsFeature('data_export'),
      subscriptionMiddleware.validateDataRetention,
      this.exportAnalytics.bind(this)
    );

    // Subscription info endpoint
    this.router.get('/subscription-info', 
      subscriptionMiddleware.validateSubscription,
      this.getSubscriptionInfo.bind(this)
    );

    // Health check endpoint (no auth needed)
    this.router.get('/health', this.healthCheck.bind(this));
  }

  // Track scan endpoint
  private async trackScan(req: Request, res: Response): Promise<void> {
    try {
      const scanData = req.body;
      
      if (!scanData.qrCodeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'QR Code ID is required',
            statusCode: 400
          }
        });
        return;
      }

      const result = await this.analyticsService.trackScan(scanData);
      
      if (result.success) {
        this.logger.info('Scan tracked successfully', { qrCodeId: scanData.qrCodeId });
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error tracking scan:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SCAN_TRACKING_FAILED',
          message: 'Failed to track scan',
          statusCode: 500
        }
      });
    }
  }

  // Get QR analytics with subscription filtering
  private async getQRAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const { startDate, endDate, groupBy } = req.query;
      const userId = (req as any).userId;
      const subscription = (req as any).subscription;
      
      const request = {
        qrCodeId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        groupBy: groupBy as 'day' | 'week' | 'month' | undefined
      };

      const result = await this.subscriptionAwareService.getQRAnalytics(request, userId);
      
      if (result.success) {
        this.logger.info('QR analytics retrieved successfully', { 
          qrCodeId, 
          userId,
          planName: subscription?.plan?.name 
        });
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error getting QR analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QR_ANALYTICS_FAILED',
          message: 'Failed to get QR analytics',
          statusCode: 500
        }
      });
    }
  }

  // Get user analytics with subscription filtering
  private async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req as any).userId;
      const subscription = (req as any).subscription;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.subscriptionAwareService.getUserAnalytics(userId, start, end);
      
      if (result.success) {
        this.logger.info('User analytics retrieved successfully', { 
          userId,
          planName: subscription?.plan?.name 
        });
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ANALYTICS_FAILED',
          message: 'Failed to get user analytics',
          statusCode: 500
        }
      });
    }
  }

  // Export analytics with subscription validation
  private async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const { format = 'csv', startDate, endDate } = req.query;
      const userId = (req as any).userId;
      
      if (!['json', 'csv'].includes(format as string)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid format. Must be json or csv',
            statusCode: 400
          }
        });
        return;
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.subscriptionAwareService.exportAnalytics(
        qrCodeId, 
        format as 'json' | 'csv',
        start,
        end,
        userId
      );
      
      if (result.success) {
        this.logger.info('Analytics exported successfully', { 
          qrCodeId, 
          userId,
          format 
        });

        // Set appropriate headers for file download
        const fileName = `analytics_${qrCodeId}_${Date.now()}.${format}`;
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(result.data);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export analytics',
          statusCode: 500
        }
      });
    }
  }

  // Get subscription information and analytics capabilities
  private async getSubscriptionInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      const result = await this.subscriptionAwareService.getSubscriptionAnalyticsInfo(userId);
      
      if (result.success) {
        this.logger.info('Subscription info retrieved successfully', { userId });
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error getting subscription info:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_INFO_FAILED',
          message: 'Failed to get subscription information',
          statusCode: 500
        }
      });
    }
  }

  // Health check endpoint
  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          service: 'analytics-service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.SERVICE_VERSION || '1.0.0'
        }
      });
    } catch (error) {
      this.logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Service health check failed',
          statusCode: 500
        }
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}

export { BasicAnalyticsRoutes };