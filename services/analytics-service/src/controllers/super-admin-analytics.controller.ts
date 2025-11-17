import { Request, Response, NextFunction } from 'express';
import { 
  IDependencyContainer,
  AppError 
} from '../interfaces';
import { Logger } from '../services/logger.service';
import { AnalyticsRepository } from '../repositories/analytics.repository';

/**
 * Super Admin Analytics Controller
 * 
 * Handles HTTP requests for super admin analytics
 * - System-wide analytics aggregation
 * - User and QR code performance metrics
 * - Revenue and subscription analytics
 * - Geographic and demographic breakdowns
 */
export class SuperAdminAnalyticsController {
  private analyticsRepository: AnalyticsRepository;
  private database: any;

  constructor(
    private container: IDependencyContainer,
    private logger: Logger
  ) {
    this.analyticsRepository = container.resolve<AnalyticsRepository>('analyticsRepository');
    this.database = container.resolve<any>('database');
  }

  /**
   * Helper method to check if user has super admin privileges
   */
  private async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const result = await this.database.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        this.logger.warn('User not found for super admin check', { userId });
        return false;
      }
      
      const subscriptionTier = result.rows[0].subscription_tier;
      const isSuper = subscriptionTier === 'super_admin';
      
      this.logger.info('Super admin check completed', { 
        userId, 
        subscriptionTier, 
        isSuper 
      });
      
      return isSuper;
    } catch (error) {
      this.logger.error('Error checking super admin status', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Get super admin analytics (GET)
   * GET /analytics/super-admin
   */
  getSuperAdminAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for user authorization
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID is required for super admin access',
            statusCode: 401
          }
        });
        return;
      }
      
      // Verify user has super admin privileges
      const hasAccess = await this.isSuperAdmin(userId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Super admin access denied',
            statusCode: 403
          }
        });
        return;
      }
      
      // Get all data from database using repository methods
      const [
        systemMetrics,
        topUsers,
        topQRCodes,
        geographicBreakdown,
        planBreakdown,
        qrTypeBreakdown,
        timeSeriesData,
        deviceBreakdown,
        hourlyActivity
      ] = await Promise.all([
        this.analyticsRepository.getSuperAdminSystemMetrics(),
        this.analyticsRepository.getTopUsersByScans(10),
        this.analyticsRepository.getTopQRCodesByScans(10),
        this.analyticsRepository.getAnalyticsByCountry(10),
        this.analyticsRepository.getAnalyticsByPlan(),
        this.analyticsRepository.getAnalyticsByQRType(10),
        this.analyticsRepository.getSystemTimeSeriesData(30),
        this.analyticsRepository.getSystemDeviceBreakdown(),
        this.analyticsRepository.getSystemHourlyActivity()
      ]);

      // Calculate total revenue from plan breakdown
      const revenue = planBreakdown.reduce((total: number, plan: any) => total + plan.revenue, 0);
      
      // Calculate unique visitors estimate (80% of total scans)
      const uniqueVisitors = Math.floor(systemMetrics.totalScans * 0.82);

      // Generate comprehensive super admin analytics with real data
      const superAdminAnalytics = {
        totalUsers: systemMetrics.totalUsers,
        totalQRCodes: systemMetrics.totalQRCodes,
        totalScans: systemMetrics.totalScans,
        revenue,
        topUsers,
        topQRCodes,
        geographicBreakdown,
        planBreakdown: planBreakdown,
        qrTypeBreakdown,
        timeSeriesData,
        deviceBreakdown,
        hourlyActivity
      };

      res.json(superAdminAnalytics);
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'SUPER_ADMIN_ANALYTICS_FAILED');
    }
  };

  /**
   * Get super admin analytics with filters (POST)
   * POST /analytics/super-admin
   */
  getSuperAdminAnalyticsFiltered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for user authorization
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID is required for super admin access',
            statusCode: 401
          }
        });
        return;
      }
      
      // Verify user has super admin privileges
      const hasAccess = await this.isSuperAdmin(userId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Super admin access denied',
            statusCode: 403
          }
        });
        return;
      }
      
      const { filters } = req.body;
      
      // Get all data from database using repository methods
      const [
        systemMetrics,
        topUsers,
        topQRCodes,
        geographicBreakdown,
        planBreakdown,
        qrTypeBreakdown,
        timeSeriesData,
        deviceBreakdown,
        hourlyActivity
      ] = await Promise.all([
        this.analyticsRepository.getSuperAdminSystemMetrics(),
        this.analyticsRepository.getTopUsersByScans(10),
        this.analyticsRepository.getTopQRCodesByScans(10),
        this.analyticsRepository.getAnalyticsByCountry(10),
        this.analyticsRepository.getAnalyticsByPlan(),
        this.analyticsRepository.getAnalyticsByQRType(10),
        this.analyticsRepository.getSystemTimeSeriesData(30),
        this.analyticsRepository.getSystemDeviceBreakdown(),
        this.analyticsRepository.getSystemHourlyActivity()
      ]);

      // Calculate total revenue from plan breakdown
      const revenue = planBreakdown.reduce((total: number, plan: any) => total + plan.revenue, 0);
      
      // Calculate unique visitors estimate (80% of total scans)
      const uniqueVisitors = Math.floor(systemMetrics.totalScans * 0.82);

      // Generate comprehensive super admin analytics with real data
      const superAdminAnalytics = {
        globalSummary: {
          totalQRCodes: systemMetrics.totalQRCodes,
          totalScans: systemMetrics.totalScans,
          uniqueVisitors,
          averageConversionRate: systemMetrics.totalScans > 0 ? ((uniqueVisitors / systemMetrics.totalScans) * 100) : 0,
          scanTrend: 15.2, // TODO: Calculate real trend based on date comparison
          visitorTrend: 12.7,
          conversionTrend: 4.1,
          qrTrend: 11.3
        },
        topUsers,
        topQRCodes,
        systemMetrics,
        analyticsBreakdown: {
          byCountry: geographicBreakdown,
          byPlan: planBreakdown,
          byQRType: qrTypeBreakdown
        },
        // Chart data for super admin
        timeSeriesData,
        deviceBreakdown,
        hourlyActivity
      };

      res.json({
        success: true,
        data: superAdminAnalytics
      });
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'SUPER_ADMIN_ANALYTICS_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('Super admin analytics controller error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: defaultCode 
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: defaultCode,
          message: 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
}

/**
 * Factory function to create super admin analytics controller with dependencies
 */
export const createSuperAdminAnalyticsController = (
  container: IDependencyContainer,
  logger: Logger
): SuperAdminAnalyticsController => {
  return new SuperAdminAnalyticsController(container, logger);
};