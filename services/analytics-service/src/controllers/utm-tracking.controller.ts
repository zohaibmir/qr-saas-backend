import { Request, Response, NextFunction } from 'express';
import { UTMTrackingService } from '../services/utm-tracking.service';
import { Logger } from '../services/logger.service';
import { AppError } from '../interfaces';

/**
 * UTM Tracking Controller
 * 
 * Handles HTTP requests for UTM tracking
 * - UTM parameter tracking
 * - Campaign source analysis
 * - Marketing attribution
 */
export class UTMTrackingController {
  constructor(
    private utmService: UTMTrackingService,
    private logger: Logger
  ) {}

  /**
   * Track UTM parameters
   * POST /utm/track
   */
  trackUTM = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.utmService.trackUTMEvent(req.body);
      const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'UTM_TRACKING_FAILED');
    }
  };

  /**
   * Get UTM analytics
   * GET /utm/analytics
   */
  getUTMAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { utmTrackingId, startDate, endDate } = req.query;
      const result = await this.utmService.getUTMAnalytics(
        utmTrackingId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'UTM_ANALYTICS_FAILED');
    }
  };

  /**
   * Get campaign attribution
   * GET /utm/attribution/:campaignId
   */
  getCampaignAttribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { campaignId } = req.params;
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID is required',
            statusCode: 401
          }
        });
        return;
      }
      
      const result = await this.utmService.getCampaignUTMPerformance(campaignId, userId);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'CAMPAIGN_ATTRIBUTION_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('UTM tracking controller error', { 
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
 * Factory function to create UTM tracking controller with dependencies
 */
export const createUTMTrackingController = (
  utmService: UTMTrackingService,
  logger: Logger
): UTMTrackingController => {
  return new UTMTrackingController(utmService, logger);
};