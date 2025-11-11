import { 
  ServiceResponse,
  ValidationError,
  NotFoundError,
  AppError,
  ILogger,
  IAnalyticsRepository
} from '../interfaces';
import {
  RetargetingPixel,
  RetargetingPixelEvent,
  CreateRetargetingPixelRequest,
  FireRetargetingPixelRequest
} from '../../../../shared/src/types/marketing.types';

export interface IRetargetingPixelService {
  createPixel(userId: string, pixelData: CreateRetargetingPixelRequest): Promise<ServiceResponse<RetargetingPixel>>;
  getPixel(pixelId: string, userId: string): Promise<ServiceResponse<RetargetingPixel>>;
  getUserPixels(userId: string, limit?: number, offset?: number): Promise<ServiceResponse<RetargetingPixel[]>>;
  updatePixel(pixelId: string, userId: string, updateData: Partial<RetargetingPixel>): Promise<ServiceResponse<RetargetingPixel>>;
  deletePixel(pixelId: string, userId: string): Promise<ServiceResponse<boolean>>;
  activatePixel(pixelId: string, userId: string): Promise<ServiceResponse<RetargetingPixel>>;
  deactivatePixel(pixelId: string, userId: string): Promise<ServiceResponse<RetargetingPixel>>;
  firePixel(eventData: FireRetargetingPixelRequest): Promise<ServiceResponse<RetargetingPixelEvent>>;
  getPixelEvents(pixelId: string, limit?: number, offset?: number): Promise<ServiceResponse<RetargetingPixelEvent[]>>;
  getPixelAnalytics(pixelId: string, startDate?: Date, endDate?: Date): Promise<ServiceResponse<any>>;
  generatePixelCode(pixelType: RetargetingPixel['pixelType'], pixelId: string, customParameters?: Record<string, any>): Promise<ServiceResponse<string>>;
  validatePixelEvent(pixelId: string, eventType: string, eventData?: Record<string, any>): Promise<ServiceResponse<boolean>>;
}

export class RetargetingPixelService implements IRetargetingPixelService {
  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async createPixel(
    userId: string,
    pixelData: CreateRetargetingPixelRequest
  ): Promise<ServiceResponse<RetargetingPixel>> {
    try {
      this.validatePixelData(pixelData);

      const pixel: RetargetingPixel = {
        id: this.generateId(),
        userId,
        campaignId: pixelData.campaignId,
        name: pixelData.name,
        pixelType: pixelData.pixelType,
        pixelId: pixelData.pixelId,
        pixelCode: pixelData.pixelCode,
        triggerEvents: pixelData.triggerEvents || ['page_view'],
        targetQrCodes: pixelData.targetQrCodes,
        targetCampaigns: pixelData.targetCampaigns,
        isTestMode: pixelData.isTestMode || false,
        customParameters: pixelData.customParameters || {},
        firesCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store pixel in database
      const savedPixel = await this.storePixel(pixel);

      this.logger.info('Retargeting pixel created', {
        pixelId: pixel.id,
        userId,
        name: pixel.name,
        pixelType: pixel.pixelType
      });

      return {
        success: true,
        data: savedPixel,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to create retargeting pixel:', error);
      
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
          code: 'PIXEL_CREATION_FAILED',
          message: 'Failed to create retargeting pixel',
          statusCode: 500
        }
      };
    }
  }

  async getPixel(
    pixelId: string,
    userId: string
  ): Promise<ServiceResponse<RetargetingPixel>> {
    try {
      const pixel = await this.retrievePixel(pixelId, userId);
      
      if (!pixel) {
        return {
          success: false,
          error: {
            code: 'PIXEL_NOT_FOUND',
            message: 'Retargeting pixel not found',
            statusCode: 404
          }
        };
      }

      return {
        success: true,
        data: pixel,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get retargeting pixel:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXEL_RETRIEVAL_FAILED',
          message: 'Failed to retrieve retargeting pixel',
          statusCode: 500
        }
      };
    }
  }

  async getUserPixels(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResponse<RetargetingPixel[]>> {
    try {
      const pixels = await this.retrieveUserPixels(userId, limit, offset);

      return {
        success: true,
        data: pixels,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          pagination: {
            limit,
            offset,
            count: pixels.length
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user pixels:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXELS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve user pixels',
          statusCode: 500
        }
      };
    }
  }

  async updatePixel(
    pixelId: string,
    userId: string,
    updateData: Partial<RetargetingPixel>
  ): Promise<ServiceResponse<RetargetingPixel>> {
    try {
      const existingPixel = await this.retrievePixel(pixelId, userId);
      
      if (!existingPixel) {
        return {
          success: false,
          error: {
            code: 'PIXEL_NOT_FOUND',
            message: 'Retargeting pixel not found',
            statusCode: 404
          }
        };
      }

      // Validate update data
      if (updateData.name !== undefined) this.validatePixelName(updateData.name);

      const updatedPixel: RetargetingPixel = {
        ...existingPixel,
        ...updateData,
        updatedAt: new Date()
      };

      // Update pixel in database
      const savedPixel = await this.updateStoredPixel(pixelId, updatedPixel);

      this.logger.info('Retargeting pixel updated', {
        pixelId,
        userId,
        updatedFields: Object.keys(updateData)
      });

      return {
        success: true,
        data: savedPixel,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to update retargeting pixel:', error);
      
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
          code: 'PIXEL_UPDATE_FAILED',
          message: 'Failed to update retargeting pixel',
          statusCode: 500
        }
      };
    }
  }

  async deletePixel(
    pixelId: string,
    userId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const pixel = await this.retrievePixel(pixelId, userId);
      
      if (!pixel) {
        return {
          success: false,
          error: {
            code: 'PIXEL_NOT_FOUND',
            message: 'Retargeting pixel not found',
            statusCode: 404
          }
        };
      }

      // Soft delete - mark as inactive
      await this.updateStoredPixel(pixelId, {
        ...pixel,
        isActive: false,
        updatedAt: new Date()
      });

      this.logger.info('Retargeting pixel deleted', {
        pixelId,
        userId,
        name: pixel.name
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
      this.logger.error('Failed to delete retargeting pixel:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXEL_DELETION_FAILED',
          message: 'Failed to delete retargeting pixel',
          statusCode: 500
        }
      };
    }
  }

  async activatePixel(
    pixelId: string,
    userId: string
  ): Promise<ServiceResponse<RetargetingPixel>> {
    return this.updatePixel(pixelId, userId, { isActive: true });
  }

  async deactivatePixel(
    pixelId: string,
    userId: string
  ): Promise<ServiceResponse<RetargetingPixel>> {
    return this.updatePixel(pixelId, userId, { isActive: false });
  }

  async firePixel(eventData: FireRetargetingPixelRequest): Promise<ServiceResponse<RetargetingPixelEvent>> {
    try {
      const pixel = await this.getPixelById(eventData.pixelId);
      
      if (!pixel || !pixel.isActive) {
        return {
          success: false,
          error: {
            code: 'PIXEL_NOT_FOUND_OR_INACTIVE',
            message: 'Retargeting pixel not found or inactive',
            statusCode: 404
          }
        };
      }

      // Validate event type against pixel's trigger events
      if (!pixel.triggerEvents.includes(eventData.eventType)) {
        return {
          success: false,
          error: {
            code: 'EVENT_TYPE_NOT_ALLOWED',
            message: 'Event type is not configured for this pixel',
            statusCode: 400
          }
        };
      }

      const pixelEvent: RetargetingPixelEvent = {
        id: this.generateId(),
        pixelId: eventData.pixelId,
        qrCodeId: eventData.qrCodeId,
        campaignId: eventData.campaignId,
        eventType: eventData.eventType,
        eventValue: eventData.eventValue,
        eventCurrency: eventData.eventCurrency,
        sessionId: eventData.sessionId,
        userFingerprint: eventData.userFingerprint,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        referrerUrl: eventData.referrerUrl,
        pageUrl: eventData.pageUrl,
        country: eventData.country,
        region: eventData.region,
        city: eventData.city,
        firedAt: new Date()
      };

      // Store pixel event in database
      const savedPixelEvent = await this.storePixelEvent(pixelEvent);

      // Update pixel fire count
      await this.incrementPixelFireCount(eventData.pixelId);

      // Send pixel event to external platform (Facebook, Google, etc.)
      const platformResponse = await this.sendPixelEventToPlatform(pixel, pixelEvent);
      if (platformResponse) {
        pixelEvent.platformEventId = platformResponse.eventId;
        pixelEvent.platformResponse = platformResponse;
        await this.updateStoredPixelEvent(pixelEvent.id, pixelEvent);
      }

      this.logger.info('Retargeting pixel fired', {
        pixelEventId: pixelEvent.id,
        pixelId: eventData.pixelId,
        eventType: eventData.eventType,
        qrCodeId: eventData.qrCodeId
      });

      return {
        success: true,
        data: savedPixelEvent,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to fire retargeting pixel:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXEL_FIRE_FAILED',
          message: 'Failed to fire retargeting pixel',
          statusCode: 500
        }
      };
    }
  }

  async getPixelEvents(
    pixelId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ServiceResponse<RetargetingPixelEvent[]>> {
    try {
      const events = await this.retrievePixelEvents(pixelId, limit, offset);

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
      this.logger.error('Failed to get pixel events:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXEL_EVENTS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve pixel events',
          statusCode: 500
        }
      };
    }
  }

  async getPixelAnalytics(
    pixelId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResponse<any>> {
    try {
      const analytics = await this.buildPixelAnalytics(pixelId, startDate, endDate);

      return {
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get pixel analytics:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXEL_ANALYTICS_FAILED',
          message: 'Failed to retrieve pixel analytics',
          statusCode: 500
        }
      };
    }
  }

  async generatePixelCode(
    pixelType: RetargetingPixel['pixelType'],
    pixelId: string,
    customParameters?: Record<string, any>
  ): Promise<ServiceResponse<string>> {
    try {
      let pixelCode: string;

      switch (pixelType) {
        case 'facebook':
          pixelCode = this.generateFacebookPixelCode(pixelId, customParameters);
          break;
        case 'google':
          pixelCode = this.generateGooglePixelCode(pixelId, customParameters);
          break;
        case 'linkedin':
          pixelCode = this.generateLinkedInPixelCode(pixelId, customParameters);
          break;
        case 'twitter':
          pixelCode = this.generateTwitterPixelCode(pixelId, customParameters);
          break;
        case 'custom':
          pixelCode = this.generateCustomPixelCode(pixelId, customParameters);
          break;
        default:
          throw new ValidationError(`Unsupported pixel type: ${pixelType}`);
      }

      return {
        success: true,
        data: pixelCode,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate pixel code:', error);
      
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
          code: 'PIXEL_CODE_GENERATION_FAILED',
          message: 'Failed to generate pixel code',
          statusCode: 500
        }
      };
    }
  }

  async validatePixelEvent(
    pixelId: string,
    eventType: string,
    eventData?: Record<string, any>
  ): Promise<ServiceResponse<boolean>> {
    try {
      const pixel = await this.getPixelById(pixelId);
      
      if (!pixel || !pixel.isActive) {
        return {
          success: false,
          error: {
            code: 'PIXEL_NOT_FOUND_OR_INACTIVE',
            message: 'Retargeting pixel not found or inactive',
            statusCode: 404
          }
        };
      }

      const isValid = pixel.triggerEvents.includes(eventType);

      return {
        success: true,
        data: isValid,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      this.logger.error('Failed to validate pixel event:', error);
      
      return {
        success: false,
        error: {
          code: 'PIXEL_EVENT_VALIDATION_FAILED',
          message: 'Failed to validate pixel event',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods
  private validatePixelData(pixelData: CreateRetargetingPixelRequest): void {
    this.validatePixelName(pixelData.name);
    
    if (!pixelData.pixelId || pixelData.pixelId.trim().length === 0) {
      throw new ValidationError('Pixel ID is required');
    }

    if (!pixelData.pixelCode || pixelData.pixelCode.trim().length === 0) {
      throw new ValidationError('Pixel code is required');
    }

    if (!['facebook', 'google', 'linkedin', 'twitter', 'custom'].includes(pixelData.pixelType)) {
      throw new ValidationError('Invalid pixel type');
    }
  }

  private validatePixelName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Pixel name is required');
    }
    
    if (name.length > 255) {
      throw new ValidationError('Pixel name must be 255 characters or less');
    }
  }

  private generateId(): string {
    return `pixel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Platform-specific pixel code generators
  private generateFacebookPixelCode(pixelId: string, params?: Record<string, any>): string {
    return `
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
${params ? `fbq('track', 'CustomEvent', ${JSON.stringify(params)});` : ''}
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->
    `.trim();
  }

  private generateGooglePixelCode(pixelId: string, params?: Record<string, any>): string {
    return `
<!-- Google Analytics Global Site Tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${pixelId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${pixelId}');
  ${params ? `gtag('event', 'custom_event', ${JSON.stringify(params)});` : ''}
</script>
<!-- End Google Analytics -->
    `.trim();
  }

  private generateLinkedInPixelCode(pixelId: string, params?: Record<string, any>): string {
    return `
<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "${pixelId}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script><script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${pixelId}&fmt=gif" />
</noscript>
<!-- End LinkedIn Insight Tag -->
    `.trim();
  }

  private generateTwitterPixelCode(pixelId: string, params?: Record<string, any>): string {
    return `
<!-- Twitter universal website tag code -->
<script>
!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='//static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
// Insert Twitter Pixel ID and Standard Event data below
twq('init','${pixelId}');
twq('track','PageView');
${params ? `twq('track','CustomEvent',${JSON.stringify(params)});` : ''}
</script>
<!-- End Twitter universal website tag code -->
    `.trim();
  }

  private generateCustomPixelCode(pixelId: string, params?: Record<string, any>): string {
    return `
<!-- Custom Pixel Code -->
<script>
(function() {
  var pixel = {
    id: '${pixelId}',
    params: ${params ? JSON.stringify(params) : '{}'}
  };
  
  // Custom pixel implementation
  var img = new Image();
  img.src = '/api/analytics/marketing/pixels/fire?id=' + pixel.id + '&event=PageView&params=' + encodeURIComponent(JSON.stringify(pixel.params));
})();
</script>
<!-- End Custom Pixel Code -->
    `.trim();
  }

  // Database operation methods (to be implemented with repository)
  private async storePixel(pixel: RetargetingPixel): Promise<RetargetingPixel> {
    // Implementation will use analyticsRepository
    return pixel;
  }

  private async retrievePixel(pixelId: string, userId: string): Promise<RetargetingPixel | null> {
    // Implementation will use analyticsRepository
    return null;
  }

  private async getPixelById(pixelId: string): Promise<RetargetingPixel | null> {
    // Implementation will use analyticsRepository
    return null;
  }

  private async retrieveUserPixels(userId: string, limit: number, offset: number): Promise<RetargetingPixel[]> {
    // Implementation will use analyticsRepository
    return [];
  }

  private async updateStoredPixel(pixelId: string, pixel: RetargetingPixel): Promise<RetargetingPixel> {
    // Implementation will use analyticsRepository
    return pixel;
  }

  private async storePixelEvent(pixelEvent: RetargetingPixelEvent): Promise<RetargetingPixelEvent> {
    // Implementation will use analyticsRepository
    return pixelEvent;
  }

  private async updateStoredPixelEvent(eventId: string, pixelEvent: RetargetingPixelEvent): Promise<RetargetingPixelEvent> {
    // Implementation will use analyticsRepository
    return pixelEvent;
  }

  private async retrievePixelEvents(pixelId: string, limit: number, offset: number): Promise<RetargetingPixelEvent[]> {
    // Implementation will use analyticsRepository
    return [];
  }

  private async incrementPixelFireCount(pixelId: string): Promise<void> {
    // Implementation will update fire count and last_fired_at
  }

  private async sendPixelEventToPlatform(pixel: RetargetingPixel, event: RetargetingPixelEvent): Promise<any> {
    // Implementation will send events to external platforms
    return null;
  }

  private async buildPixelAnalytics(pixelId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Implementation will aggregate pixel event data
    return {
      totalFires: 0,
      uniqueUsers: 0,
      eventsByType: {},
      conversionValue: 0,
      topPages: [],
      firesByHour: [],
      firesByDay: [],
      deviceBreakdown: {},
      geographicBreakdown: {}
    };
  }
}