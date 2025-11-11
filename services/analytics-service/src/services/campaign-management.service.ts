import { 
  ServiceResponse,
  ValidationError,
  NotFoundError,
  AppError,
  ILogger,
  IAnalyticsRepository
} from '../interfaces';
import {
  MarketingCampaign,
  CampaignQRCode,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignDashboardData,
  MarketingOverviewData
} from '../../../../shared/src/types/marketing.types';
import moment from 'moment-timezone';

export interface ICampaignManagementService {
  createCampaign(userId: string, campaignData: CreateCampaignRequest): Promise<ServiceResponse<MarketingCampaign>>;
  getCampaign(campaignId: string, userId: string): Promise<ServiceResponse<MarketingCampaign>>;
  getUserCampaigns(userId: string, limit?: number, offset?: number): Promise<ServiceResponse<MarketingCampaign[]>>;
  updateCampaign(campaignId: string, userId: string, updateData: UpdateCampaignRequest): Promise<ServiceResponse<MarketingCampaign>>;
  deleteCampaign(campaignId: string, userId: string): Promise<ServiceResponse<boolean>>;
  addQRCodeToCampaign(campaignId: string, qrCodeId: string, userId: string): Promise<ServiceResponse<CampaignQRCode>>;
  removeQRCodeFromCampaign(campaignId: string, qrCodeId: string, userId: string): Promise<ServiceResponse<boolean>>;
  getCampaignQRCodes(campaignId: string, userId: string): Promise<ServiceResponse<CampaignQRCode[]>>;
  getCampaignDashboard(campaignId: string, userId: string): Promise<ServiceResponse<CampaignDashboardData>>;
  getMarketingOverview(userId: string): Promise<ServiceResponse<MarketingOverviewData>>;
  activateCampaign(campaignId: string, userId: string): Promise<ServiceResponse<MarketingCampaign>>;
  pauseCampaign(campaignId: string, userId: string): Promise<ServiceResponse<MarketingCampaign>>;
  archiveCampaign(campaignId: string, userId: string): Promise<ServiceResponse<MarketingCampaign>>;
}

export class CampaignManagementService implements ICampaignManagementService {
  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async createCampaign(
    userId: string, 
    campaignData: CreateCampaignRequest
  ): Promise<ServiceResponse<MarketingCampaign>> {
    try {
      this.validateCampaignData(campaignData);

      const campaign: MarketingCampaign = {
        id: this.generateId(),
        userId,
        name: campaignData.name,
        description: campaignData.description,
        campaignType: campaignData.campaignType,
        status: 'draft',
        targetAudience: campaignData.targetAudience,
        geographicTargets: campaignData.geographicTargets,
        deviceTargets: campaignData.deviceTargets,
        startDate: campaignData.startDate ? new Date(campaignData.startDate) : undefined,
        endDate: campaignData.endDate ? new Date(campaignData.endDate) : undefined,
        budgetAmount: campaignData.budgetAmount,
        budgetCurrency: campaignData.budgetCurrency || 'USD',
        targetConversions: campaignData.targetConversions,
        targetCpa: campaignData.targetCpa,
        utmSource: campaignData.utmSource,
        utmMedium: campaignData.utmMedium,
        utmCampaign: campaignData.utmCampaign,
        utmTerm: campaignData.utmTerm,
        utmContent: campaignData.utmContent,
        tags: campaignData.tags || [],
        metadata: campaignData.metadata || {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store campaign in database
      const savedCampaign = await this.storeCampaign(campaign);

      this.logger.info('Marketing campaign created', {
        campaignId: campaign.id,
        userId,
        name: campaign.name,
        type: campaign.campaignType
      });

      return {
        success: true,
        data: savedCampaign,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to create campaign:', error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CAMPAIGN_CREATION_FAILED',
          message: 'Failed to create marketing campaign',
          statusCode: 500
        }
      };
    }
  }

  async getCampaign(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<MarketingCampaign>> {
    try {
      const campaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!campaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      return {
        success: true,
        data: campaign,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get campaign:', error);
      
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_RETRIEVAL_FAILED',
          message: 'Failed to retrieve marketing campaign',
          statusCode: 500
        }
      };
    }
  }

  async getUserCampaigns(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<MarketingCampaign[]>> {
    try {
      const campaigns = await this.retrieveUserCampaigns(userId, limit, offset);

      return {
        success: true,
        data: campaigns,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          pagination: {
            limit,
            offset,
            count: campaigns.length
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user campaigns:', error);
      
      return {
        success: false,
        error: {
          code: 'CAMPAIGNS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve user campaigns',
          statusCode: 500
        }
      };
    }
  }

  async updateCampaign(
    campaignId: string, 
    userId: string, 
    updateData: UpdateCampaignRequest
  ): Promise<ServiceResponse<MarketingCampaign>> {
    try {
      const existingCampaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!existingCampaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      // Validate update data
      if (updateData.name !== undefined) this.validateCampaignName(updateData.name);
      if (updateData.startDate && updateData.endDate) {
        this.validateCampaignDates(new Date(updateData.startDate), new Date(updateData.endDate));
      }

      const updatedCampaign: MarketingCampaign = {
        ...existingCampaign,
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : existingCampaign.startDate,
        endDate: updateData.endDate ? new Date(updateData.endDate) : existingCampaign.endDate,
        updatedAt: new Date()
      };

      // Update campaign in database
      const savedCampaign = await this.updateStoredCampaign(campaignId, updatedCampaign);

      this.logger.info('Marketing campaign updated', {
        campaignId,
        userId,
        updatedFields: Object.keys(updateData)
      });

      return {
        success: true,
        data: savedCampaign,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to update campaign:', error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CAMPAIGN_UPDATE_FAILED',
          message: 'Failed to update marketing campaign',
          statusCode: 500
        }
      };
    }
  }

  async deleteCampaign(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const campaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!campaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      // Soft delete - mark as inactive and archived
      await this.updateStoredCampaign(campaignId, {
        ...campaign,
        status: 'archived',
        isActive: false,
        updatedAt: new Date()
      });

      this.logger.info('Marketing campaign deleted', {
        campaignId,
        userId,
        name: campaign.name
      });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to delete campaign:', error);
      
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_DELETION_FAILED',
          message: 'Failed to delete marketing campaign',
          statusCode: 500
        }
      };
    }
  }

  async addQRCodeToCampaign(
    campaignId: string, 
    qrCodeId: string, 
    userId: string
  ): Promise<ServiceResponse<CampaignQRCode>> {
    try {
      const campaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!campaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      // Check if QR code is already in campaign
      const existingAssociation = await this.getCampaignQRCodeAssociation(campaignId, qrCodeId);
      if (existingAssociation) {
        return {
          success: false,
          error: {
            code: 'QR_CODE_ALREADY_IN_CAMPAIGN',
            message: 'QR code is already associated with this campaign',
            statusCode: 400
          }
        };
      }

      const campaignQRCode: CampaignQRCode = {
        id: this.generateId(),
        campaignId,
        qrCodeId,
        addedAt: new Date(),
        scansCount: 0,
        conversionsCount: 0,
        isActive: true
      };

      // Store association in database
      const savedAssociation = await this.storeCampaignQRCode(campaignQRCode);

      this.logger.info('QR code added to campaign', {
        campaignId,
        qrCodeId,
        userId
      });

      return {
        success: true,
        data: savedAssociation,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to add QR code to campaign:', error);
      
      return {
        success: false,
        error: {
          code: 'QR_CODE_ASSOCIATION_FAILED',
          message: 'Failed to add QR code to campaign',
          statusCode: 500
        }
      };
    }
  }

  async removeQRCodeFromCampaign(
    campaignId: string, 
    qrCodeId: string, 
    userId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const campaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!campaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      const success = await this.removeCampaignQRCodeAssociation(campaignId, qrCodeId);

      if (!success) {
        return {
          success: false,
          error: {
            code: 'QR_CODE_NOT_IN_CAMPAIGN',
            message: 'QR code is not associated with this campaign',
            statusCode: 404
          }
        };
      }

      this.logger.info('QR code removed from campaign', {
        campaignId,
        qrCodeId,
        userId
      });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to remove QR code from campaign:', error);
      
      return {
        success: false,
        error: {
          code: 'QR_CODE_REMOVAL_FAILED',
          message: 'Failed to remove QR code from campaign',
          statusCode: 500
        }
      };
    }
  }

  async getCampaignQRCodes(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<CampaignQRCode[]>> {
    try {
      const campaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!campaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      const qrCodes = await this.retrieveCampaignQRCodes(campaignId);

      return {
        success: true,
        data: qrCodes,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: qrCodes.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get campaign QR codes:', error);
      
      return {
        success: false,
        error: {
          code: 'QR_CODES_RETRIEVAL_FAILED',
          message: 'Failed to retrieve campaign QR codes',
          statusCode: 500
        }
      };
    }
  }

  async getCampaignDashboard(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<CampaignDashboardData>> {
    try {
      const campaign = await this.retrieveCampaign(campaignId, userId);
      
      if (!campaign) {
        return {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Marketing campaign not found',
            statusCode: 404
          }
        };
      }

      // Get campaign analytics and performance data
      const dashboard = await this.buildCampaignDashboard(campaign);

      return {
        success: true,
        data: dashboard,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get campaign dashboard:', error);
      
      return {
        success: false,
        error: {
          code: 'DASHBOARD_RETRIEVAL_FAILED',
          message: 'Failed to retrieve campaign dashboard',
          statusCode: 500
        }
      };
    }
  }

  async getMarketingOverview(userId: string): Promise<ServiceResponse<MarketingOverviewData>> {
    try {
      const overview = await this.buildMarketingOverview(userId);

      return {
        success: true,
        data: overview,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get marketing overview:', error);
      
      return {
        success: false,
        error: {
          code: 'OVERVIEW_RETRIEVAL_FAILED',
          message: 'Failed to retrieve marketing overview',
          statusCode: 500
        }
      };
    }
  }

  async activateCampaign(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<MarketingCampaign>> {
    return this.updateCampaignStatus(campaignId, userId, 'active');
  }

  async pauseCampaign(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<MarketingCampaign>> {
    return this.updateCampaignStatus(campaignId, userId, 'paused');
  }

  async archiveCampaign(
    campaignId: string, 
    userId: string
  ): Promise<ServiceResponse<MarketingCampaign>> {
    return this.updateCampaignStatus(campaignId, userId, 'archived');
  }

  // Private helper methods
  private async updateCampaignStatus(
    campaignId: string, 
    userId: string, 
    status: MarketingCampaign['status']
  ): Promise<ServiceResponse<MarketingCampaign>> {
    return this.updateCampaign(campaignId, userId, { status });
  }

  private validateCampaignData(campaignData: CreateCampaignRequest): void {
    this.validateCampaignName(campaignData.name);
    
    if (campaignData.startDate && campaignData.endDate) {
      this.validateCampaignDates(new Date(campaignData.startDate), new Date(campaignData.endDate));
    }

    if (campaignData.budgetAmount && campaignData.budgetAmount <= 0) {
      throw new ValidationError('Budget amount must be greater than 0');
    }

    if (campaignData.targetConversions && campaignData.targetConversions <= 0) {
      throw new ValidationError('Target conversions must be greater than 0');
    }

    if (campaignData.targetCpa && campaignData.targetCpa <= 0) {
      throw new ValidationError('Target CPA must be greater than 0');
    }
  }

  private validateCampaignName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Campaign name is required');
    }
    
    if (name.length > 255) {
      throw new ValidationError('Campaign name must be 255 characters or less');
    }
  }

  private validateCampaignDates(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    if (startDate < new Date()) {
      throw new ValidationError('Start date cannot be in the past');
    }
  }

  private generateId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Database operation methods (to be implemented with repository)
  private async storeCampaign(campaign: MarketingCampaign): Promise<MarketingCampaign> {
    // Implementation will use analyticsRepository
    return campaign;
  }

  private async retrieveCampaign(campaignId: string, userId: string): Promise<MarketingCampaign | null> {
    // Implementation will use analyticsRepository
    return null;
  }

  private async retrieveUserCampaigns(userId: string, limit: number, offset: number): Promise<MarketingCampaign[]> {
    // Implementation will use analyticsRepository
    return [];
  }

  private async updateStoredCampaign(campaignId: string, campaign: MarketingCampaign): Promise<MarketingCampaign> {
    // Implementation will use analyticsRepository
    return campaign;
  }

  private async storeCampaignQRCode(campaignQRCode: CampaignQRCode): Promise<CampaignQRCode> {
    // Implementation will use analyticsRepository
    return campaignQRCode;
  }

  private async getCampaignQRCodeAssociation(campaignId: string, qrCodeId: string): Promise<CampaignQRCode | null> {
    // Implementation will use analyticsRepository
    return null;
  }

  private async removeCampaignQRCodeAssociation(campaignId: string, qrCodeId: string): Promise<boolean> {
    // Implementation will use analyticsRepository
    return true;
  }

  private async retrieveCampaignQRCodes(campaignId: string): Promise<CampaignQRCode[]> {
    // Implementation will use analyticsRepository
    return [];
  }

  private async buildCampaignDashboard(campaign: MarketingCampaign): Promise<CampaignDashboardData> {
    // Implementation will aggregate analytics data
    return {
      campaign,
      analytics: {
        id: '',
        campaignId: campaign.id,
        analyticsDate: new Date(),
        impressions: 0,
        clicks: 0,
        uniqueClicks: 0,
        scans: 0,
        uniqueScans: 0,
        conversions: 0,
        conversionValue: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        costPerClick: 0,
        costPerConversion: 0,
        returnOnAdSpend: 0,
        mobilePercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      performance: {
        totalScans: 0,
        totalConversions: 0,
        conversionRate: 0,
        averageTimeToConversion: '0 minutes',
        topPerformingQrCodes: [],
        utmPerformance: {
          bestSource: '',
          bestMedium: '',
          bestContent: ''
        },
        geographicPerformance: [],
        temporalPerformance: []
      },
      retargetingPixels: [],
      recentActivity: []
    };
  }

  private async buildMarketingOverview(userId: string): Promise<MarketingOverviewData> {
    // Implementation will aggregate user's marketing data
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalScans: 0,
      totalConversions: 0,
      averageConversionRate: 0,
      topPerformingCampaign: {} as MarketingCampaign,
      recentCampaigns: [],
      campaignsByType: [],
      monthlyTrends: []
    };
  }
}