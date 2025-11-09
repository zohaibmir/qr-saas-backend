import { 
  ScanEvent, 
  AnalyticsSummary, 
  TrackScanRequest,
  GetAnalyticsRequest,
  IAnalyticsService, 
  IAnalyticsRepository,
  ILogger,
  ServiceResponse,
  ValidationError,
  NotFoundError,
  AppError
} from '../interfaces';
import axios from 'axios';

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

interface SubscriptionFilterOptions {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  retentionDays: number;
  features: string[];
}

/**
 * Subscription-aware analytics service that filters data based on user subscription tiers
 */
class SubscriptionAwareAnalyticsService implements IAnalyticsService {
  private userServiceUrl: string;

  constructor(
    private baseAnalyticsService: IAnalyticsService,
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  }

  async trackScan(scanData: TrackScanRequest): Promise<ServiceResponse<ScanEvent>> {
    // Scan tracking doesn't need subscription filtering - just pass through
    return this.baseAnalyticsService.trackScan(scanData);
  }

  async getQRAnalytics(request: GetAnalyticsRequest, userId?: string): Promise<ServiceResponse<AnalyticsSummary>> {
    try {
      if (!userId) {
        this.logger.warn('No user ID provided for subscription-aware analytics', { qrCodeId: request.qrCodeId });
        return this.baseAnalyticsService.getQRAnalytics(request);
      }

      // Get user subscription to determine data access limits
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        this.logger.info('No subscription found, using free tier limits', { userId });
        // Apply free tier restrictions (30 days retention)
        const restrictedRequest = this.applySubscriptionLimits(request, { 
          retentionDays: 30, 
          features: ['basic_analytics'],
          userId 
        });
        return this.baseAnalyticsService.getQRAnalytics(restrictedRequest);
      }

      // Apply subscription-based filtering
      const filteredRequest = this.applySubscriptionLimits(request, {
        userId,
        retentionDays: subscription.plan.analyticsRetentionDays,
        features: subscription.plan.features
      });

      this.logger.info('Applying subscription-based analytics filtering', {
        userId,
        planName: subscription.plan.name,
        retentionDays: subscription.plan.analyticsRetentionDays,
        originalStartDate: request.startDate,
        filteredStartDate: filteredRequest.startDate
      });

      return this.baseAnalyticsService.getQRAnalytics(filteredRequest);

    } catch (error) {
      this.logger.error('Failed to get subscription-aware QR analytics', {
        userId,
        qrCodeId: request.qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
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
          code: 'SUBSCRIPTION_ANALYTICS_FAILED',
          message: 'Failed to get subscription-aware analytics',
          statusCode: 500
        }
      };
    }
  }

  async getUserAnalytics(userId?: string, startDate?: Date, endDate?: Date): Promise<ServiceResponse<AnalyticsSummary>> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required for user analytics');
      }

      // Get user subscription to determine data access limits
      const subscription = await this.getUserSubscription(userId);
      let retentionDays = 30; // Free tier default
      let features = ['basic_analytics'];

      if (subscription) {
        retentionDays = subscription.plan.analyticsRetentionDays;
        features = subscription.plan.features;
      }

      // Apply subscription-based date filtering
      const { filteredStartDate, filteredEndDate } = this.applyRetentionLimits(
        startDate, 
        endDate, 
        retentionDays
      );

      this.logger.info('Getting subscription-aware user analytics', {
        userId,
        retentionDays,
        originalStartDate: startDate,
        filteredStartDate,
        planName: subscription?.plan.name || 'free'
      });

      return this.baseAnalyticsService.getUserAnalytics(userId, filteredStartDate, filteredEndDate);

    } catch (error) {
      this.logger.error('Failed to get subscription-aware user analytics', {
        userId,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
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
          code: 'USER_ANALYTICS_FAILED',
          message: 'Failed to get user analytics',
          statusCode: 500
        }
      };
    }
  }

  async exportAnalytics(qrCodeId: string, format: 'json' | 'csv', startDate?: Date, endDate?: Date, userId?: string): Promise<ServiceResponse<string>> {
    try {
      if (!userId) {
        this.logger.warn('No user ID provided for subscription-aware export', { qrCodeId });
        return this.baseAnalyticsService.exportAnalytics(qrCodeId, format, startDate, endDate);
      }

      // Check if user has export feature access
      const subscription = await this.getUserSubscription(userId);
      let canExport = false;
      let retentionDays = 30; // Free tier default

      if (subscription) {
        canExport = subscription.plan.features.includes('data_export') || 
                   subscription.plan.features.includes('advanced_export');
        retentionDays = subscription.plan.analyticsRetentionDays;
      }

      // Free tier users can only export basic CSV
      if (!subscription && format !== 'csv') {
        throw new ValidationError('Advanced export formats require a paid subscription');
      }

      if (subscription && !canExport) {
        throw new ValidationError('Data export is not available in your subscription plan');
      }

      // Apply retention limits
      const { filteredStartDate, filteredEndDate } = this.applyRetentionLimits(
        startDate, 
        endDate, 
        retentionDays
      );

      this.logger.info('Performing subscription-aware analytics export', {
        userId,
        qrCodeId,
        format,
        retentionDays,
        planName: subscription?.plan.name || 'free'
      });

      return this.baseAnalyticsService.exportAnalytics(
        qrCodeId, 
        format, 
        filteredStartDate, 
        filteredEndDate
      );

    } catch (error) {
      this.logger.error('Failed to export subscription-aware analytics', {
        userId,
        qrCodeId,
        format,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
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
          code: 'EXPORT_FAILED',
          message: 'Failed to export analytics',
          statusCode: 500
        }
      };
    }
  }

  async getAdvancedAnalytics(request: any, userId?: string): Promise<any> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required for advanced analytics');
      }

      // Check if user has access to advanced analytics
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new ValidationError('Advanced analytics requires a paid subscription');
      }

      const hasAdvancedFeatures = subscription.plan.features.includes('advanced_analytics') ||
                                 subscription.plan.features.includes('premium_analytics');

      if (!hasAdvancedFeatures) {
        throw new ValidationError('Advanced analytics is not available in your subscription plan');
      }

      // Apply retention limits to the request if it has date ranges
      if (request.startDate && request.endDate) {
        const { filteredStartDate, filteredEndDate } = this.applyRetentionLimits(
          request.startDate, 
          request.endDate, 
          subscription.plan.analyticsRetentionDays
        );
        
        request.startDate = filteredStartDate;
        request.endDate = filteredEndDate;
      }

      this.logger.info('Getting advanced analytics with subscription filtering', {
        userId,
        planName: subscription.plan.name,
        retentionDays: subscription.plan.analyticsRetentionDays
      });

      return this.baseAnalyticsService.getAdvancedAnalytics(request);

    } catch (error) {
      this.logger.error('Failed to get advanced analytics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
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
          code: 'ADVANCED_ANALYTICS_FAILED',
          message: 'Failed to get advanced analytics',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Gets subscription information with analytics capabilities
   */
  async getSubscriptionAnalyticsInfo(userId: string): Promise<ServiceResponse<{
    planName: string;
    retentionDays: number;
    features: string[];
    qrLimit: number;
    currentUsage: number;
    canUpgrade: boolean;
    limitations: string[];
  }>> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return {
          success: true,
          data: {
            planName: 'Free',
            retentionDays: 30,
            features: ['basic_analytics'],
            qrLimit: 10,
            currentUsage: 0, // Would need to query QR service
            canUpgrade: true,
            limitations: [
              '30-day analytics retention',
              'Basic analytics only',
              'Limited to 10 QR codes',
              'CSV export only'
            ]
          }
        };
      }

      const limitations = this.getSubscriptionLimitations(subscription.plan);

      return {
        success: true,
        data: {
          planName: subscription.plan.name,
          retentionDays: subscription.plan.analyticsRetentionDays,
          features: subscription.plan.features,
          qrLimit: subscription.plan.qrLimit,
          currentUsage: 0, // Would need to query QR service
          canUpgrade: subscription.plan.name !== 'Enterprise',
          limitations
        }
      };

    } catch (error) {
      this.logger.error('Failed to get subscription analytics info', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_INFO_FAILED',
          message: 'Failed to get subscription information',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Private helper methods
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
      this.logger.error('Failed to fetch user subscription', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return null;
    }
  }

  private applySubscriptionLimits(request: GetAnalyticsRequest, options: SubscriptionFilterOptions): GetAnalyticsRequest {
    const { retentionDays } = options;
    
    // Apply retention limits
    const { filteredStartDate } = this.applyRetentionLimits(
      request.startDate,
      request.endDate,
      retentionDays
    );

    return {
      ...request,
      startDate: filteredStartDate,
      endDate: request.endDate
    };
  }

  private applyRetentionLimits(startDate?: Date, endDate?: Date, retentionDays?: number): {
    filteredStartDate?: Date;
    filteredEndDate?: Date;
  } {
    const now = new Date();
    const filteredEndDate = endDate || now;

    // If retention is unlimited (-1), return original dates
    if (!retentionDays || retentionDays === -1) {
      return { filteredStartDate: startDate, filteredEndDate };
    }

    // Calculate earliest allowed date based on retention period
    const earliestAllowedDate = new Date();
    earliestAllowedDate.setDate(earliestAllowedDate.getDate() - retentionDays);

    // If no start date provided, use earliest allowed
    if (!startDate) {
      return { filteredStartDate: earliestAllowedDate, filteredEndDate };
    }

    // If requested start date is too old, use earliest allowed
    const filteredStartDate = startDate < earliestAllowedDate ? earliestAllowedDate : startDate;

    return { filteredStartDate, filteredEndDate };
  }

  private getSubscriptionLimitations(plan: any): string[] {
    const limitations: string[] = [];

    switch (plan.name) {
      case 'Free':
        limitations.push('30-day analytics retention');
        limitations.push('Basic analytics only');
        limitations.push('Limited to 10 QR codes');
        limitations.push('CSV export only');
        break;
      case 'Pro':
        limitations.push('1-year analytics retention');
        limitations.push('Limited to 500 QR codes');
        break;
      case 'Business':
        limitations.push('3-year analytics retention');
        break;
      case 'Enterprise':
        limitations.push('No limitations');
        break;
      default:
        limitations.push('Unknown plan limitations');
    }

    return limitations;
  }
}

export { SubscriptionAwareAnalyticsService };