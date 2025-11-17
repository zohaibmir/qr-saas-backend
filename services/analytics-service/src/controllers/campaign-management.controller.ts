import { Request, Response, NextFunction } from 'express';
import { CampaignManagementService } from '../services/campaign-management.service';
import { Logger } from '../services/logger.service';
import { AppError } from '../interfaces';

/**
 * Campaign Management Controller
 * 
 * Handles HTTP requests for campaign management
 * - Campaign creation and management
 * - Campaign analytics
 * - Campaign performance tracking
 */
export class CampaignManagementController {
  constructor(
    private campaignService: CampaignManagementService,
    private logger: Logger
  ) {}

  /**
   * Create a new campaign
   * POST /campaigns
   */
  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use auth context from API Gateway (same pattern as QR service)
      if (!req.auth?.userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required to create campaigns'
          }
        });
        return;
      }
      
      const result = await this.campaignService.createCampaign(req.auth.userId, req.body);
      const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'CAMPAIGN_CREATE_FAILED');
    }
  };

  /**
   * Get campaigns for a user
   * GET /campaigns
   */
  getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      
      const result = await this.campaignService.getUserCampaigns(userId, limit, offset);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'CAMPAIGN_FETCH_FAILED');
    }
  };

  /**
   * Get campaign analytics/dashboard
   * GET /campaigns/:id/analytics
   */
  getCampaignAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
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
      
      const result = await this.campaignService.getCampaignDashboard(id, userId);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'CAMPAIGN_ANALYTICS_FAILED');
    }
  };

  /**
   * Update campaign
   * PUT /campaigns/:id
   */
  updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
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
      
      const result = await this.campaignService.updateCampaign(id, userId, req.body);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'CAMPAIGN_UPDATE_FAILED');
    }
  };

  /**
   * Delete campaign
   * DELETE /campaigns/:id
   */
  deleteCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
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
      
      const result = await this.campaignService.deleteCampaign(id, userId);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'CAMPAIGN_DELETE_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('Campaign management controller error', { 
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
 * Factory function to create campaign management controller with dependencies
 */
export const createCampaignManagementController = (
  campaignService: CampaignManagementService,
  logger: Logger
): CampaignManagementController => {
  return new CampaignManagementController(campaignService, logger);
};