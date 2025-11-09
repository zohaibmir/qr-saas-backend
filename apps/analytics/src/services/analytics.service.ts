import { ApiResponse, AnalyticsData } from '@qr-saas/shared';
import { getApiUrl, features, apiConfig } from '../config/analytics.config';

// Service Request/Response Types for Analytics App
export interface TrackScanRequest {
  qrCodeId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  platform?: string;
  device?: string;
  referrer?: string;
}

export interface GetAnalyticsRequest {
  qrCodeId: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
  includeRealTime?: boolean;
}

export interface AnalyticsListParams {
  page?: number;
  limit?: number;
  qrCodeIds?: string[];
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'totalScans' | 'uniqueScans' | 'conversionRate' | 'lastScan';
  sortOrder?: 'asc' | 'desc';
}

// Analytics Service - Backend Integration Ready
class AnalyticsService {
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = getApiUrl(endpoint);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get QR Analytics - Ready for backend integration
   */
  async getQRAnalytics(qrId: string): Promise<ApiResponse<AnalyticsData>> {
    // For now, return mock data. Will connect to backend endpoint
    return {
      success: true,
      data: {
        totalScans: Math.floor(Math.random() * 1000) + 100,
        uniqueScans: Math.floor(Math.random() * 500) + 50,
        platformBreakdown: {
          'Mobile': Math.floor(Math.random() * 300) + 100,
          'Desktop': Math.floor(Math.random() * 150) + 50,
          'Tablet': Math.floor(Math.random() * 50) + 10,
        },
        geographicData: [
          { country: 'United States', count: Math.floor(Math.random() * 200) + 50 },
          { country: 'Canada', count: Math.floor(Math.random() * 100) + 20 },
          { country: 'United Kingdom', count: Math.floor(Math.random() * 80) + 15 },
        ],
        timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scans: Math.floor(Math.random() * 50),
        })),
      } as AnalyticsData,
    };
  }

  /**
   * Get User Analytics - Ready for backend integration
   */
  async getUserAnalytics(): Promise<ApiResponse<AnalyticsData[]>> {
    // Mock data for multiple QR codes
    const mockData: AnalyticsData[] = Array.from({ length: 5 }, (_, i) => ({
      totalScans: Math.floor(Math.random() * 1000) + 100,
      uniqueScans: Math.floor(Math.random() * 500) + 50,
      platformBreakdown: {
        'Mobile': Math.floor(Math.random() * 300) + 100,
        'Desktop': Math.floor(Math.random() * 150) + 50,
        'Tablet': Math.floor(Math.random() * 50) + 10,
      },
      geographicData: [
        { country: 'United States', count: Math.floor(Math.random() * 200) + 50 },
        { country: 'Canada', count: Math.floor(Math.random() * 100) + 20 },
        { country: 'United Kingdom', count: Math.floor(Math.random() * 80) + 15 },
      ],
      timeSeriesData: Array.from({ length: 30 }, (_, j) => ({
        date: new Date(Date.now() - j * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scans: Math.floor(Math.random() * 50),
      })),
    }));

    return {
      success: true,
      data: mockData,
    };
  }

  /**
   * Export Analytics - Ready for backend integration
   */
  async exportAnalytics(format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<ApiResponse<{download_url: string}>> {
    // Mock export functionality
    return {
      success: true,
      data: {
        download_url: getApiUrl(`/exports/analytics-${Date.now()}.${format}`),
      },
    };
  }

  /**
   * Get Peak Time Analysis - Ready for backend integration
   */
  async getPeakTimeAnalysis(qrId?: string): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        qrCodeId: qrId,
        peakHours: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          scans: Math.floor(Math.random() * 100),
        })),
        peakDays: [
          { day: 'Monday', scans: Math.floor(Math.random() * 500) + 100 },
          { day: 'Tuesday', scans: Math.floor(Math.random() * 500) + 100 },
          { day: 'Wednesday', scans: Math.floor(Math.random() * 500) + 100 },
          { day: 'Thursday', scans: Math.floor(Math.random() * 500) + 100 },
          { day: 'Friday', scans: Math.floor(Math.random() * 500) + 100 },
          { day: 'Saturday', scans: Math.floor(Math.random() * 500) + 100 },
          { day: 'Sunday', scans: Math.floor(Math.random() * 500) + 100 },
        ],
      },
    };
  }

  /**
   * Get Conversion Tracking - Ready for backend integration
   */
  async getConversionTracking(qrId: string): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        qrCodeId: qrId,
        totalConversions: Math.floor(Math.random() * 100) + 10,
        conversionRate: Math.random() * 15 + 5,
        conversionsByGoal: [
          { goal: 'Website Visit', conversions: Math.floor(Math.random() * 50) + 10 },
          { goal: 'Newsletter Signup', conversions: Math.floor(Math.random() * 30) + 5 },
          { goal: 'Purchase', conversions: Math.floor(Math.random() * 20) + 2 },
        ],
      },
    };
  }

  /**
   * Get Heatmap Data - Ready for backend integration
   */
  async getHeatmapData(qrId: string, type: 'geographic' | 'temporal' = 'geographic'): Promise<ApiResponse<any>> {
    const mockHeatmapData = {
      geographic: {
        points: Array.from({ length: 50 }, () => ({
          lat: Math.random() * 180 - 90,
          lng: Math.random() * 360 - 180,
          intensity: Math.random(),
        })),
      },
      temporal: {
        hours: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          intensity: Math.random(),
        })),
        days: Array.from({ length: 7 }, (_, i) => ({
          day: i,
          intensity: Math.random(),
        })),
      },
    };

    return {
      success: true,
      data: {
        qrCodeId: qrId,
        type,
        ...mockHeatmapData[type],
      },
    };
  }

  /**
   * Get Realtime Analytics - Ready for backend integration
   */
  async getRealtimeAnalytics(qrId?: string): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        qrCodeId: qrId,
        currentActiveUsers: Math.floor(Math.random() * 50) + 5,
        scansLast5Minutes: Math.floor(Math.random() * 20),
        scansLast1Hour: Math.floor(Math.random() * 100) + 10,
        scansToday: Math.floor(Math.random() * 500) + 50,
        recentScans: Array.from({ length: 10 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          location: 'United States',
          device: Math.random() > 0.5 ? 'Mobile' : 'Desktop',
        })),
      },
    };
  }

  /**
   * Get Performance Metrics - Ready for backend integration
   */
  async getPerformanceMetrics(qrId: string, timeRange: string = '7d'): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        qrCodeId: qrId,
        timeRange,
        metrics: {
          totalScans: Math.floor(Math.random() * 1000) + 100,
          uniqueScans: Math.floor(Math.random() * 500) + 50,
          averageScansPerDay: Math.floor(Math.random() * 50) + 10,
          peakDay: new Date().toISOString().split('T')[0],
          growthRate: Math.random() * 20 - 10, // Can be negative for decline
        },
      },
    };
  }

  /**
   * Get Dashboard Summary - Ready for backend integration
   */
  async getDashboardSummary(timeRange: string = '30d'): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        timeRange,
        summary: {
          totalQRCodes: Math.floor(Math.random() * 50) + 10,
          totalScans: Math.floor(Math.random() * 5000) + 1000,
          totalUniqueScans: Math.floor(Math.random() * 2500) + 500,
          averageConversionRate: Math.random() * 15 + 5,
          topPerformingQR: {
            qrCodeId: 'qr_top_1',
            scans: Math.floor(Math.random() * 1000) + 500,
          },
          recentActivity: Array.from({ length: 5 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 3600000).toISOString(),
            event: 'QR Code Scanned',
            qrCodeId: `qr_${i + 1}`,
            location: 'United States',
          })),
        },
      },
    };
  }

  // Additional Analytics App-specific methods
  /**
   * Get Analytics for multiple QR codes with custom params
   */
  async getMultipleQRAnalytics(params?: AnalyticsListParams): Promise<ApiResponse<AnalyticsData[]>> {
    return this.getUserAnalytics();
  }

  /**
   * Track scan event - Ready for backend integration
   */
  async trackScan(data: TrackScanRequest): Promise<ApiResponse<{ eventId: string }>> {
    // For now, just return success. Will connect to backend endpoint
    console.log('Track scan:', data);
    return {
      success: true,
      data: { eventId: `event_${Date.now()}` }
    };
  }

  /**
   * Get analytics time range helper
   */
  getAnalyticsTimeRange(range: 'today' | '7days' | '30days' | '90days' | 'custom'): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
    }

    return { startDate, endDate };
  }
}

// Create and export the service instance
export const analyticsService = new AnalyticsService();

// Export utility functions

// Utility functions following QR service patterns
export const formatAnalyticsNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export const formatAnalyticsPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

export const formatAnalyticsDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatAnalyticsTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getAnalyticsTimeRange = (range: 'today' | '7days' | '30days' | '90days' | 'custom'): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case '30days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      break;
    case '90days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate };
};

export const validateAnalyticsRequest = (request: GetAnalyticsRequest): { isValid: boolean; error?: string } => {
  if (!request.qrCodeId) {
    return { isValid: false, error: 'QR Code ID is required' };
  }

  if (request.startDate && request.endDate && request.startDate > request.endDate) {
    return { isValid: false, error: 'Start date cannot be after end date' };
  }

  return { isValid: true };
};

export const getHeatmapColorScale = (type: 'geographic' | 'temporal' | 'device'): string[] => {
  const colorScales = {
    geographic: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'],
    temporal: ['#ffffcc', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84'],
    device: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45'],
  };
  return colorScales[type];
};

export default analyticsService;