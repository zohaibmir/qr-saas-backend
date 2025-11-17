import { Request, Response, NextFunction } from 'express';
import { 
  IAnalyticsService, 
  TrackScanRequest, 
  GetAnalyticsRequest, 
  AnalyticsSummary,
  ServiceResponse,
  AppError 
} from '../interfaces';
import { Logger } from '../services/logger.service';

/**
 * Analytics Controller
 * 
 * Handles HTTP requests for analytics tracking and retrieval
 * - Scan tracking
 * - QR analytics retrieval
 * - Analytics export
 * - User analytics aggregation
 * - Batch analytics processing
 */
export class AnalyticsController {
  constructor(
    private analyticsService: IAnalyticsService,
    private logger: Logger
  ) {}

  /**
   * Track scan event
   * POST /analytics/track
   */
  trackScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scanData: TrackScanRequest = {
        ...req.body,
        ipAddress: req.ip
      };
      
      const result = await this.analyticsService.trackScan(scanData);
      
      const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'SCAN_TRACKING_FAILED');
    }
  };

  /**
   * Get QR code analytics
   * GET /analytics/:qrCodeId
   */
  getQRAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const request: GetAnalyticsRequest = {
        qrCodeId: req.params.qrCodeId,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day'
      };
      
      const result = await this.analyticsService.getQRAnalytics(request);
      
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'ANALYTICS_FETCH_FAILED');
    }
  };

  /**
   * Export analytics data
   * GET /analytics/:qrCodeId/export
   */
  exportAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId } = req.params;
      const { format = 'json', startDate, endDate } = req.query;
      
      const result = await this.analyticsService.exportAnalytics(
        qrCodeId,
        format as 'json' | 'csv',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      if (!result.success) {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
        return;
      }

      // Set appropriate headers for file download
      const filename = `analytics-${qrCodeId}-${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result.data);
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'ANALYTICS_EXPORT_FAILED');
    }
  };

  /**
   * Get user analytics (aggregate data for all users or specific user's QR codes)
   * GET /analytics/user
   */
  getUserAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.query.userId as string; // Optional - if not provided, returns data for all users
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const result = await this.analyticsService.getUserAnalytics(userId, startDate, endDate);
      
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'USER_ANALYTICS_FAILED');
    }
  };

  /**
   * Get analytics summary for multiple QR codes (batch endpoint)
   * POST /analytics/batch
   */
  getBatchAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeIds, startDate, endDate } = req.body;
      
      if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'qrCodeIds must be a non-empty array',
            statusCode: 400
          }
        });
        return;
      }

      const promises = qrCodeIds.map(qrCodeId => 
        this.analyticsService.getQRAnalytics({
          qrCodeId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        })
      );

      const results = await Promise.all(promises);
      
      const batchResponse = {
        success: true,
        data: results.reduce((acc, result, index) => {
          acc[qrCodeIds[index]] = result;
          return acc;
        }, {} as Record<string, ServiceResponse<AnalyticsSummary>>)
      };

      res.json(batchResponse);
      
    } catch (error) {
      this.handleControllerError(error, res, next, 'BATCH_ANALYTICS_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('Analytics controller error', { 
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
 * Factory function to create analytics controller with dependencies
 */
export const createAnalyticsController = (
  analyticsService: IAnalyticsService,
  logger: Logger
): AnalyticsController => {
  return new AnalyticsController(analyticsService, logger);
};