import { 
  ServiceResponse,
  ValidationError,
  NotFoundError,
  AppError,
  ILogger,
  IAnalyticsRepository
} from '../interfaces';
import {
  UTMTracking,
  UTMEvent,
  CreateUTMTrackingRequest,
  TrackUTMEventRequest
} from '../../../../shared/src/types/marketing.types';

export interface IUTMTrackingService {
  createUTMTracking(userId: string, utmData: CreateUTMTrackingRequest): Promise<ServiceResponse<UTMTracking>>;
  getUTMTracking(utmTrackingId: string, userId: string): Promise<ServiceResponse<UTMTracking>>;
  getUTMTrackingByQRCode(qrCodeId: string, userId: string): Promise<ServiceResponse<UTMTracking[]>>;
  updateUTMTracking(utmTrackingId: string, userId: string, updateData: Partial<UTMTracking>): Promise<ServiceResponse<UTMTracking>>;
  deleteUTMTracking(utmTrackingId: string, userId: string): Promise<ServiceResponse<boolean>>;
  trackUTMEvent(eventData: TrackUTMEventRequest): Promise<ServiceResponse<UTMEvent>>;
  getUTMEvents(utmTrackingId: string, limit?: number, offset?: number): Promise<ServiceResponse<UTMEvent[]>>;
  generateUTMUrl(originalUrl: string, utmParams: { source: string; medium: string; campaign: string; term?: string; content?: string }): string;
  getUTMAnalytics(utmTrackingId: string, startDate?: Date, endDate?: Date): Promise<ServiceResponse<any>>;
  getCampaignUTMPerformance(campaignId: string, userId: string): Promise<ServiceResponse<any>>;
}

export class UTMTrackingService implements IUTMTrackingService {
  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async createUTMTracking(
    userId: string,
    utmData: CreateUTMTrackingRequest
  ): Promise<ServiceResponse<UTMTracking>> {
    try {
      this.validateUTMData(utmData);

      // Generate UTM URL
      const utmUrl = this.generateUTMUrl(utmData.originalUrl, {
        source: utmData.utmSource,
        medium: utmData.utmMedium,
        campaign: utmData.utmCampaign,
        term: utmData.utmTerm,
        content: utmData.utmContent
      });

      const utmTracking: UTMTracking = {
        id: this.generateId(),
        qrCodeId: utmData.qrCodeId,
        campaignId: utmData.campaignId,
        utmSource: utmData.utmSource,
        utmMedium: utmData.utmMedium,
        utmCampaign: utmData.utmCampaign,
        utmTerm: utmData.utmTerm,
        utmContent: utmData.utmContent,
        originalUrl: utmData.originalUrl,
        utmUrl,
        clicksCount: 0,
        uniqueClicksCount: 0,
        conversionsCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store UTM tracking in database
      const savedUTMTracking = await this.storeUTMTracking(utmTracking);

      this.logger.info('UTM tracking created', {
        utmTrackingId: utmTracking.id,
        qrCodeId: utmData.qrCodeId,
        campaignId: utmData.campaignId,
        utmSource: utmData.utmSource
      });

      return {
        success: true,
        data: savedUTMTracking,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to create UTM tracking:', error);
      
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
          code: 'UTM_TRACKING_CREATION_FAILED',
          message: 'Failed to create UTM tracking',
          statusCode: 500
        }
      };
    }
  }

  async getUTMTracking(
    utmTrackingId: string,
    userId: string
  ): Promise<ServiceResponse<UTMTracking>> {
    try {
      const utmTracking = await this.retrieveUTMTracking(utmTrackingId, userId);
      
      if (!utmTracking) {
        return {
          success: false,
          error: {
            code: 'UTM_TRACKING_NOT_FOUND',
            message: 'UTM tracking not found',
            statusCode: 404
          }
        };
      }

      return {
        success: true,
        data: utmTracking,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get UTM tracking:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_TRACKING_RETRIEVAL_FAILED',
          message: 'Failed to retrieve UTM tracking',
          statusCode: 500
        }
      };
    }
  }

  async getUTMTrackingByQRCode(
    qrCodeId: string,
    userId: string
  ): Promise<ServiceResponse<UTMTracking[]>> {
    try {
      const utmTrackings = await this.retrieveUTMTrackingByQRCode(qrCodeId, userId);

      return {
        success: true,
        data: utmTrackings,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: utmTrackings.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get UTM tracking by QR code:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_TRACKING_RETRIEVAL_FAILED',
          message: 'Failed to retrieve UTM tracking for QR code',
          statusCode: 500
        }
      };
    }
  }

  async updateUTMTracking(
    utmTrackingId: string,
    userId: string,
    updateData: Partial<UTMTracking>
  ): Promise<ServiceResponse<UTMTracking>> {
    try {
      const existingUTM = await this.retrieveUTMTracking(utmTrackingId, userId);
      
      if (!existingUTM) {
        return {
          success: false,
          error: {
            code: 'UTM_TRACKING_NOT_FOUND',
            message: 'UTM tracking not found',
            statusCode: 404
          }
        };
      }

      // If UTM parameters are being updated, regenerate the UTM URL
      let updatedUTM = { ...existingUTM, ...updateData, updatedAt: new Date() };
      
      if (updateData.utmSource || updateData.utmMedium || updateData.utmCampaign || 
          updateData.utmTerm || updateData.utmContent) {
        updatedUTM.utmUrl = this.generateUTMUrl(updatedUTM.originalUrl, {
          source: updatedUTM.utmSource,
          medium: updatedUTM.utmMedium,
          campaign: updatedUTM.utmCampaign,
          term: updatedUTM.utmTerm,
          content: updatedUTM.utmContent
        });
      }

      // Update UTM tracking in database
      const savedUTMTracking = await this.updateStoredUTMTracking(utmTrackingId, updatedUTM);

      this.logger.info('UTM tracking updated', {
        utmTrackingId,
        updatedFields: Object.keys(updateData)
      });

      return {
        success: true,
        data: savedUTMTracking,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to update UTM tracking:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_TRACKING_UPDATE_FAILED',
          message: 'Failed to update UTM tracking',
          statusCode: 500
        }
      };
    }
  }

  async deleteUTMTracking(
    utmTrackingId: string,
    userId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const utmTracking = await this.retrieveUTMTracking(utmTrackingId, userId);
      
      if (!utmTracking) {
        return {
          success: false,
          error: {
            code: 'UTM_TRACKING_NOT_FOUND',
            message: 'UTM tracking not found',
            statusCode: 404
          }
        };
      }

      // Soft delete - mark as inactive
      await this.updateStoredUTMTracking(utmTrackingId, {
        ...utmTracking,
        isActive: false,
        updatedAt: new Date()
      });

      this.logger.info('UTM tracking deleted', {
        utmTrackingId,
        qrCodeId: utmTracking.qrCodeId
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
      this.logger.error('Failed to delete UTM tracking:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_TRACKING_DELETION_FAILED',
          message: 'Failed to delete UTM tracking',
          statusCode: 500
        }
      };
    }
  }

  async trackUTMEvent(eventData: TrackUTMEventRequest): Promise<ServiceResponse<UTMEvent>> {
    try {
      const utmEvent: UTMEvent = {
        id: this.generateId(),
        utmTrackingId: eventData.utmTrackingId,
        qrCodeId: eventData.qrCodeId,
        sessionId: eventData.sessionId,
        utmSource: eventData.utmSource,
        utmMedium: eventData.utmMedium,
        utmCampaign: eventData.utmCampaign,
        utmTerm: eventData.utmTerm,
        utmContent: eventData.utmContent,
        eventType: eventData.eventType,
        referrerUrl: eventData.referrerUrl,
        landingPageUrl: eventData.landingPageUrl,
        userAgent: eventData.userAgent,
        ipAddress: eventData.ipAddress,
        attributionType: eventData.attributionType || 'last_click',
        attributionValue: eventData.attributionValue,
        country: eventData.country,
        region: eventData.region,
        city: eventData.city,
        timestamp: new Date()
      };

      // Store UTM event in database
      const savedUTMEvent = await this.storeUTMEvent(utmEvent);

      // Update UTM tracking statistics
      await this.updateUTMTrackingStats(eventData.utmTrackingId, eventData.eventType);

      this.logger.info('UTM event tracked', {
        utmEventId: utmEvent.id,
        utmTrackingId: eventData.utmTrackingId,
        eventType: eventData.eventType,
        qrCodeId: eventData.qrCodeId
      });

      return {
        success: true,
        data: savedUTMEvent,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to track UTM event:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_EVENT_TRACKING_FAILED',
          message: 'Failed to track UTM event',
          statusCode: 500
        }
      };
    }
  }

  async getUTMEvents(
    utmTrackingId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ServiceResponse<UTMEvent[]>> {
    try {
      const events = await this.retrieveUTMEvents(utmTrackingId, limit, offset);

      return {
        success: true,
        data: events,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          pagination: {
            limit,
            offset,
            count: events.length
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get UTM events:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_EVENTS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve UTM events',
          statusCode: 500
        }
      };
    }
  }

  generateUTMUrl(
    originalUrl: string,
    utmParams: { source: string; medium: string; campaign: string; term?: string; content?: string }
  ): string {
    try {
      const url = new URL(originalUrl);
      
      // Add UTM parameters
      url.searchParams.set('utm_source', utmParams.source);
      url.searchParams.set('utm_medium', utmParams.medium);
      url.searchParams.set('utm_campaign', utmParams.campaign);
      
      if (utmParams.term) {
        url.searchParams.set('utm_term', utmParams.term);
      }
      
      if (utmParams.content) {
        url.searchParams.set('utm_content', utmParams.content);
      }

      return url.toString();
    } catch (error) {
      this.logger.error('Failed to generate UTM URL:', error);
      throw new ValidationError('Invalid URL format');
    }
  }

  async getUTMAnalytics(
    utmTrackingId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResponse<any>> {
    try {
      const analytics = await this.buildUTMAnalytics(utmTrackingId, startDate, endDate);

      return {
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get UTM analytics:', error);
      
      return {
        success: false,
        error: {
          code: 'UTM_ANALYTICS_FAILED',
          message: 'Failed to retrieve UTM analytics',
          statusCode: 500
        }
      };
    }
  }

  async getCampaignUTMPerformance(
    campaignId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      const performance = await this.buildCampaignUTMPerformance(campaignId, userId);

      return {
        success: true,
        data: performance,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get campaign UTM performance:', error);
      
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_UTM_PERFORMANCE_FAILED',
          message: 'Failed to retrieve campaign UTM performance',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods
  private validateUTMData(utmData: CreateUTMTrackingRequest): void {
    if (!utmData.qrCodeId) {
      throw new ValidationError('QR Code ID is required');
    }

    if (!utmData.utmSource || utmData.utmSource.trim().length === 0) {
      throw new ValidationError('UTM source is required');
    }

    if (!utmData.utmMedium || utmData.utmMedium.trim().length === 0) {
      throw new ValidationError('UTM medium is required');
    }

    if (!utmData.utmCampaign || utmData.utmCampaign.trim().length === 0) {
      throw new ValidationError('UTM campaign is required');
    }

    if (!utmData.originalUrl) {
      throw new ValidationError('Original URL is required');
    }

    // Validate URL format
    try {
      new URL(utmData.originalUrl);
    } catch {
      throw new ValidationError('Invalid original URL format');
    }
  }

  private generateId(): string {
    return `utm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Database operation methods (to be implemented with repository)
  private async storeUTMTracking(utmTracking: UTMTracking): Promise<UTMTracking> {
    // Implementation will use analyticsRepository
    return utmTracking;
  }

  private async retrieveUTMTracking(utmTrackingId: string, userId: string): Promise<UTMTracking | null> {
    // Implementation will use analyticsRepository
    return null;
  }

  private async retrieveUTMTrackingByQRCode(qrCodeId: string, userId: string): Promise<UTMTracking[]> {
    // Implementation will use analyticsRepository
    return [];
  }

  private async updateStoredUTMTracking(utmTrackingId: string, utmTracking: UTMTracking): Promise<UTMTracking> {
    // Implementation will use analyticsRepository
    return utmTracking;
  }

  private async storeUTMEvent(utmEvent: UTMEvent): Promise<UTMEvent> {
    // Implementation will use analyticsRepository
    return utmEvent;
  }

  private async retrieveUTMEvents(utmTrackingId: string, limit: number, offset: number): Promise<UTMEvent[]> {
    // Implementation will use analyticsRepository
    return [];
  }

  private async updateUTMTrackingStats(utmTrackingId: string, eventType: string): Promise<void> {
    // Implementation will update click/conversion counts
  }

  private async buildUTMAnalytics(utmTrackingId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Implementation will aggregate UTM event data
    return {
      totalClicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      conversionRate: 0,
      topReferrers: [],
      clicksByHour: [],
      clicksByDay: [],
      deviceBreakdown: {},
      geographicBreakdown: {}
    };
  }

  private async buildCampaignUTMPerformance(campaignId: string, userId: string): Promise<any> {
    // Implementation will aggregate campaign UTM performance
    return {
      totalUTMTracks: 0,
      bestPerformingUTM: {},
      utmSourcePerformance: [],
      utmMediumPerformance: [],
      utmContentPerformance: [],
      timeSeriesData: []
    };
  }
}