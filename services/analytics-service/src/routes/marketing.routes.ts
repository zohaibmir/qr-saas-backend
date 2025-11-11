import { Router, Request, Response } from 'express';
import { CampaignManagementService } from '../services/campaign-management.service';
import { UTMTrackingService } from '../services/utm-tracking.service';
import { RetargetingPixelService } from '../services/retargeting-pixel.service';
import { ILogger } from '../interfaces';

export class MarketingRoutes {
  private router: Router;
  private campaignService: CampaignManagementService;
  private utmService: UTMTrackingService;
  private pixelService: RetargetingPixelService;
  private logger: ILogger;

  constructor(
    campaignService: CampaignManagementService,
    utmService: UTMTrackingService,
    pixelService: RetargetingPixelService,
    logger: ILogger
  ) {
    this.router = Router();
    this.campaignService = campaignService;
    this.utmService = utmService;
    this.pixelService = pixelService;
    this.logger = logger;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Campaign Management Routes
    this.router.post('/campaigns', this.createCampaign.bind(this));
    this.router.get('/campaigns', this.getUserCampaigns.bind(this));
    this.router.get('/campaigns/:campaignId', this.getCampaign.bind(this));
    this.router.put('/campaigns/:campaignId', this.updateCampaign.bind(this));
    this.router.delete('/campaigns/:campaignId', this.deleteCampaign.bind(this));
    this.router.post('/campaigns/:campaignId/activate', this.activateCampaign.bind(this));
    this.router.post('/campaigns/:campaignId/pause', this.pauseCampaign.bind(this));
    this.router.post('/campaigns/:campaignId/archive', this.archiveCampaign.bind(this));
    
    // Campaign QR Code Management
    this.router.post('/campaigns/:campaignId/qr-codes', this.addQRCodeToCampaign.bind(this));
    this.router.get('/campaigns/:campaignId/qr-codes', this.getCampaignQRCodes.bind(this));
    this.router.delete('/campaigns/:campaignId/qr-codes/:qrCodeId', this.removeQRCodeFromCampaign.bind(this));
    
    // Campaign Analytics and Dashboard
    this.router.get('/campaigns/:campaignId/dashboard', this.getCampaignDashboard.bind(this));
    this.router.get('/overview', this.getMarketingOverview.bind(this));

    // UTM Tracking Routes
    this.router.post('/utm', this.createUTMTracking.bind(this));
    this.router.get('/utm/:utmTrackingId', this.getUTMTracking.bind(this));
    this.router.put('/utm/:utmTrackingId', this.updateUTMTracking.bind(this));
    this.router.delete('/utm/:utmTrackingId', this.deleteUTMTracking.bind(this));
    this.router.get('/qr-codes/:qrCodeId/utm', this.getUTMTrackingByQRCode.bind(this));
    this.router.post('/utm/events', this.trackUTMEvent.bind(this));
    this.router.get('/utm/:utmTrackingId/events', this.getUTMEvents.bind(this));
    this.router.get('/utm/:utmTrackingId/analytics', this.getUTMAnalytics.bind(this));
    this.router.get('/campaigns/:campaignId/utm-performance', this.getCampaignUTMPerformance.bind(this));
    
    // UTM URL Generation
    this.router.post('/utm/generate-url', this.generateUTMUrl.bind(this));

    // Retargeting Pixel Routes
    this.router.post('/pixels', this.createRetargetingPixel.bind(this));
    this.router.get('/pixels', this.getUserRetargetingPixels.bind(this));
    this.router.get('/pixels/:pixelId', this.getRetargetingPixel.bind(this));
    this.router.put('/pixels/:pixelId', this.updateRetargetingPixel.bind(this));
    this.router.delete('/pixels/:pixelId', this.deleteRetargetingPixel.bind(this));
    this.router.post('/pixels/:pixelId/activate', this.activateRetargetingPixel.bind(this));
    this.router.post('/pixels/:pixelId/deactivate', this.deactivateRetargetingPixel.bind(this));
    
    // Pixel Events and Analytics
    this.router.post('/pixels/fire', this.fireRetargetingPixel.bind(this));
    this.router.get('/pixels/:pixelId/events', this.getRetargetingPixelEvents.bind(this));
    this.router.get('/pixels/:pixelId/analytics', this.getRetargetingPixelAnalytics.bind(this));
    
    // Pixel Code Generation
    this.router.post('/pixels/generate-code', this.generateRetargetingPixelCode.bind(this));
    this.router.post('/pixels/:pixelId/validate-event', this.validatePixelEvent.bind(this));
  }

  // ===============================================
  // CAMPAIGN MANAGEMENT HANDLERS
  // ===============================================

  private async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const campaignData = req.body;

      const result = await this.campaignService.createCampaign(userId, campaignData);

      if (result.success) {
        this.logger.info('Campaign created successfully via API', { 
          campaignId: result.data?.id,
          userId 
        });
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in createCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_CREATION_FAILED',
          message: 'Failed to create campaign',
          statusCode: 500
        }
      });
    }
  }

  private async getUserCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { limit = '20', offset = '0' } = req.query;

      const result = await this.campaignService.getUserCampaigns(
        userId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getUserCampaigns handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGNS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve campaigns',
          statusCode: 500
        }
      });
    }
  }

  private async getCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.getCampaign(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_RETRIEVAL_FAILED',
          message: 'Failed to retrieve campaign',
          statusCode: 500
        }
      });
    }
  }

  private async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;
      const updateData = req.body;

      const result = await this.campaignService.updateCampaign(campaignId, userId, updateData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in updateCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_UPDATE_FAILED',
          message: 'Failed to update campaign',
          statusCode: 500
        }
      });
    }
  }

  private async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.deleteCampaign(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in deleteCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_DELETION_FAILED',
          message: 'Failed to delete campaign',
          statusCode: 500
        }
      });
    }
  }

  private async activateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.activateCampaign(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in activateCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_ACTIVATION_FAILED',
          message: 'Failed to activate campaign',
          statusCode: 500
        }
      });
    }
  }

  private async pauseCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.pauseCampaign(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in pauseCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_PAUSE_FAILED',
          message: 'Failed to pause campaign',
          statusCode: 500
        }
      });
    }
  }

  private async archiveCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.archiveCampaign(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in archiveCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_ARCHIVE_FAILED',
          message: 'Failed to archive campaign',
          statusCode: 500
        }
      });
    }
  }

  private async addQRCodeToCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;
      const { qrCodeId } = req.body;

      if (!qrCodeId) {
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

      const result = await this.campaignService.addQRCodeToCampaign(campaignId, qrCodeId, userId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in addQRCodeToCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QR_CODE_ASSOCIATION_FAILED',
          message: 'Failed to add QR code to campaign',
          statusCode: 500
        }
      });
    }
  }

  private async getCampaignQRCodes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.getCampaignQRCodes(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getCampaignQRCodes handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QR_CODES_RETRIEVAL_FAILED',
          message: 'Failed to retrieve campaign QR codes',
          statusCode: 500
        }
      });
    }
  }

  private async removeQRCodeFromCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId, qrCodeId } = req.params;

      const result = await this.campaignService.removeQRCodeFromCampaign(campaignId, qrCodeId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in removeQRCodeFromCampaign handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'QR_CODE_REMOVAL_FAILED',
          message: 'Failed to remove QR code from campaign',
          statusCode: 500
        }
      });
    }
  }

  private async getCampaignDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.campaignService.getCampaignDashboard(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getCampaignDashboard handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_RETRIEVAL_FAILED',
          message: 'Failed to retrieve campaign dashboard',
          statusCode: 500
        }
      });
    }
  }

  private async getMarketingOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      const result = await this.campaignService.getMarketingOverview(userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getMarketingOverview handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OVERVIEW_RETRIEVAL_FAILED',
          message: 'Failed to retrieve marketing overview',
          statusCode: 500
        }
      });
    }
  }

  // ===============================================
  // UTM TRACKING HANDLERS
  // ===============================================

  private async createUTMTracking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const utmData = req.body;

      const result = await this.utmService.createUTMTracking(userId, utmData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in createUTMTracking handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_TRACKING_CREATION_FAILED',
          message: 'Failed to create UTM tracking',
          statusCode: 500
        }
      });
    }
  }

  private async getUTMTracking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { utmTrackingId } = req.params;

      const result = await this.utmService.getUTMTracking(utmTrackingId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getUTMTracking handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_TRACKING_RETRIEVAL_FAILED',
          message: 'Failed to retrieve UTM tracking',
          statusCode: 500
        }
      });
    }
  }

  private async updateUTMTracking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { utmTrackingId } = req.params;
      const updateData = req.body;

      const result = await this.utmService.updateUTMTracking(utmTrackingId, userId, updateData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in updateUTMTracking handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_TRACKING_UPDATE_FAILED',
          message: 'Failed to update UTM tracking',
          statusCode: 500
        }
      });
    }
  }

  private async deleteUTMTracking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { utmTrackingId } = req.params;

      const result = await this.utmService.deleteUTMTracking(utmTrackingId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in deleteUTMTracking handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_TRACKING_DELETION_FAILED',
          message: 'Failed to delete UTM tracking',
          statusCode: 500
        }
      });
    }
  }

  private async getUTMTrackingByQRCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { qrCodeId } = req.params;

      const result = await this.utmService.getUTMTrackingByQRCode(qrCodeId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getUTMTrackingByQRCode handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_TRACKING_RETRIEVAL_FAILED',
          message: 'Failed to retrieve UTM tracking for QR code',
          statusCode: 500
        }
      });
    }
  }

  private async trackUTMEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData = req.body;

      const result = await this.utmService.trackUTMEvent(eventData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in trackUTMEvent handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_EVENT_TRACKING_FAILED',
          message: 'Failed to track UTM event',
          statusCode: 500
        }
      });
    }
  }

  private async getUTMEvents(req: Request, res: Response): Promise<void> {
    try {
      const { utmTrackingId } = req.params;
      const { limit = '100', offset = '0' } = req.query;

      const result = await this.utmService.getUTMEvents(
        utmTrackingId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getUTMEvents handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_EVENTS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve UTM events',
          statusCode: 500
        }
      });
    }
  }

  private async getUTMAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { utmTrackingId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.utmService.getUTMAnalytics(utmTrackingId, start, end);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getUTMAnalytics handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_ANALYTICS_FAILED',
          message: 'Failed to retrieve UTM analytics',
          statusCode: 500
        }
      });
    }
  }

  private async getCampaignUTMPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { campaignId } = req.params;

      const result = await this.utmService.getCampaignUTMPerformance(campaignId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getCampaignUTMPerformance handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CAMPAIGN_UTM_PERFORMANCE_FAILED',
          message: 'Failed to retrieve campaign UTM performance',
          statusCode: 500
        }
      });
    }
  }

  private async generateUTMUrl(req: Request, res: Response): Promise<void> {
    try {
      const { originalUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = req.body;

      if (!originalUrl || !utmSource || !utmMedium || !utmCampaign) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Original URL, UTM source, medium, and campaign are required',
            statusCode: 400
          }
        });
        return;
      }

      const utmUrl = this.utmService.generateUTMUrl(originalUrl, {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        term: utmTerm,
        content: utmContent
      });

      res.json({
        success: true,
        data: { utmUrl },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      });
    } catch (error) {
      this.logger.error('Error in generateUTMUrl handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UTM_URL_GENERATION_FAILED',
          message: 'Failed to generate UTM URL',
          statusCode: 500
        }
      });
    }
  }

  // ===============================================
  // RETARGETING PIXEL HANDLERS
  // ===============================================

  private async createRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const pixelData = req.body;

      const result = await this.pixelService.createPixel(userId, pixelData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in createRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_CREATION_FAILED',
          message: 'Failed to create retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async getUserRetargetingPixels(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { limit = '20', offset = '0' } = req.query;

      const result = await this.pixelService.getUserPixels(
        userId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getUserRetargetingPixels handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXELS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve retargeting pixels',
          statusCode: 500
        }
      });
    }
  }

  private async getRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { pixelId } = req.params;

      const result = await this.pixelService.getPixel(pixelId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_RETRIEVAL_FAILED',
          message: 'Failed to retrieve retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async updateRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { pixelId } = req.params;
      const updateData = req.body;

      const result = await this.pixelService.updatePixel(pixelId, userId, updateData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in updateRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_UPDATE_FAILED',
          message: 'Failed to update retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async deleteRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { pixelId } = req.params;

      const result = await this.pixelService.deletePixel(pixelId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in deleteRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_DELETION_FAILED',
          message: 'Failed to delete retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async activateRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { pixelId } = req.params;

      const result = await this.pixelService.activatePixel(pixelId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in activateRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_ACTIVATION_FAILED',
          message: 'Failed to activate retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async deactivateRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { pixelId } = req.params;

      const result = await this.pixelService.deactivatePixel(pixelId, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in deactivateRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_DEACTIVATION_FAILED',
          message: 'Failed to deactivate retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async fireRetargetingPixel(req: Request, res: Response): Promise<void> {
    try {
      const eventData = req.body;

      const result = await this.pixelService.firePixel(eventData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in fireRetargetingPixel handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_FIRE_FAILED',
          message: 'Failed to fire retargeting pixel',
          statusCode: 500
        }
      });
    }
  }

  private async getRetargetingPixelEvents(req: Request, res: Response): Promise<void> {
    try {
      const { pixelId } = req.params;
      const { limit = '100', offset = '0' } = req.query;

      const result = await this.pixelService.getPixelEvents(
        pixelId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getRetargetingPixelEvents handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_EVENTS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve pixel events',
          statusCode: 500
        }
      });
    }
  }

  private async getRetargetingPixelAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { pixelId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const result = await this.pixelService.getPixelAnalytics(pixelId, start, end);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getRetargetingPixelAnalytics handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_ANALYTICS_FAILED',
          message: 'Failed to retrieve pixel analytics',
          statusCode: 500
        }
      });
    }
  }

  private async generateRetargetingPixelCode(req: Request, res: Response): Promise<void> {
    try {
      const { pixelType, pixelId, customParameters } = req.body;

      if (!pixelType || !pixelId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Pixel type and pixel ID are required',
            statusCode: 400
          }
        });
        return;
      }

      const result = await this.pixelService.generatePixelCode(pixelType, pixelId, customParameters);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in generateRetargetingPixelCode handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_CODE_GENERATION_FAILED',
          message: 'Failed to generate pixel code',
          statusCode: 500
        }
      });
    }
  }

  private async validatePixelEvent(req: Request, res: Response): Promise<void> {
    try {
      const { pixelId } = req.params;
      const { eventType, eventData } = req.body;

      if (!eventType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Event type is required',
            statusCode: 400
          }
        });
        return;
      }

      const result = await this.pixelService.validatePixelEvent(pixelId, eventType, eventData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      this.logger.error('Error in validatePixelEvent handler:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIXEL_EVENT_VALIDATION_FAILED',
          message: 'Failed to validate pixel event',
          statusCode: 500
        }
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}