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

export class AnalyticsService implements IAnalyticsService {
  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async trackScan(scanData: TrackScanRequest): Promise<ServiceResponse<ScanEvent>> {
    try {
      // Validate input
      if (!scanData.qrCodeId) {
        throw new ValidationError('QR Code ID is required');
      }

      // Process scan data
      const processedData = this.processScanData(scanData);
      
      const scanEventData: Omit<ScanEvent, 'id'> = {
        qrCodeId: scanData.qrCodeId,
        timestamp: new Date(),
        ipAddress: this.hashIP(scanData.ipAddress || ''),
        userAgent: scanData.userAgent,
        location: scanData.location || processedData.location,
        platform: scanData.platform || processedData.platform,
        device: scanData.device || processedData.device,
        referrer: scanData.referrer
      };

      const scanEvent = await this.analyticsRepository.createScanEvent(scanEventData);
      
      this.logger.info('Scan tracked successfully', { 
        scanEventId: scanEvent.id,
        qrCodeId: scanData.qrCodeId 
      });

      return {
        success: true,
        data: scanEvent,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to track scan', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId: scanData.qrCodeId 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'ANALYTICS_TRACKING_FAILED',
          message: 'Failed to track scan event',
          statusCode: 500
        }
      };
    }
  }

  async getQRAnalytics(request: GetAnalyticsRequest): Promise<ServiceResponse<AnalyticsSummary>> {
    try {
      // Validate input
      if (!request.qrCodeId) {
        throw new ValidationError('QR Code ID is required');
      }

      // Validate date range
      if (request.startDate && request.endDate && request.startDate > request.endDate) {
        throw new ValidationError('Start date cannot be after end date');
      }

      const analytics = await this.analyticsRepository.getAnalyticsSummary(
        request.qrCodeId, 
        request.startDate, 
        request.endDate
      );
      
      this.logger.info('Analytics retrieved successfully', { 
        qrCodeId: request.qrCodeId,
        totalScans: analytics.totalScans,
        startDate: request.startDate,
        endDate: request.endDate
      });

      return {
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get analytics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId: request.qrCodeId 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: 'Failed to fetch analytics data',
          statusCode: 500
        }
      };
    }
  }

  async exportAnalytics(qrCodeId: string, format: 'json' | 'csv', startDate?: Date, endDate?: Date): Promise<ServiceResponse<string>> {
    try {
      if (!qrCodeId) {
        throw new ValidationError('QR Code ID is required');
      }

      const analytics = await this.analyticsRepository.getAnalyticsSummary(qrCodeId, startDate, endDate);
      
      let exportedData: string;
      
      if (format === 'csv') {
        exportedData = this.convertToCSV(analytics);
      } else {
        exportedData = JSON.stringify(analytics, null, 2);
      }

      this.logger.info('Analytics exported successfully', { 
        qrCodeId,
        format,
        totalScans: analytics.totalScans
      });

      return {
        success: true,
        data: exportedData,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to export analytics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId,
        format 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'ANALYTICS_EXPORT_FAILED',
          message: 'Failed to export analytics data',
          statusCode: 500
        }
      };
    }
  }

  private processScanData(scanData: TrackScanRequest): {
    platform?: string;
    device?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  } {
    const userAgent = scanData.userAgent || '';
    
    // Parse platform
    let platform = 'Unknown';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      platform = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      platform = 'Tablet';
    } else {
      platform = 'Desktop';
    }

    // Parse device
    let device = 'Unknown';
    if (userAgent.includes('iPhone')) {
      device = 'iPhone';
    } else if (userAgent.includes('iPad')) {
      device = 'iPad';
    } else if (userAgent.includes('Android')) {
      device = 'Android';
    } else if (userAgent.includes('Windows')) {
      device = 'Windows';
    } else if (userAgent.includes('Mac')) {
      device = 'Mac';
    } else if (userAgent.includes('Linux')) {
      device = 'Linux';
    }

    return {
      platform,
      device,
      location: {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown'
      }
    };
  }

  private hashIP(ip: string): string {
    if (!ip) return '';
    
    const crypto = require('crypto');
    const salt = process.env.IP_SALT || 'default-salt';
    return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
  }

  private convertToCSV(analytics: AnalyticsSummary): string {
    let csv = 'Date,Scans,Unique Scans\n';
    
    analytics.timeSeriesData.forEach(data => {
      csv += `${data.timestamp},${data.scans},${data.uniqueScans}\n`;
    });

    csv += '\nPlatform,Count\n';
    Object.entries(analytics.platformBreakdown).forEach(([platform, count]) => {
      csv += `${platform},${count}\n`;
    });

    csv += '\nDevice,Count\n';
    Object.entries(analytics.deviceBreakdown).forEach(([device, count]) => {
      csv += `${device},${count}\n`;
    });

    csv += '\nCountry,Scans,Percentage\n';
    analytics.geographicData.forEach(geo => {
      csv += `${geo.country},${geo.scans},${geo.percentage}%\n`;
    });

    return csv;
  }
}