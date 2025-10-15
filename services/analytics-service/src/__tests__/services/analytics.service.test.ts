import { AnalyticsService } from '../../services/analytics.service';
import { IAnalyticsRepository } from '../../interfaces';
import { AnalyticsSummary, ConversionGoal, ConversionEvent, PeakTimeAnalysis } from '@qr-saas/shared/types/analytics.types';
import { ErrorType } from '@qr-saas/shared/types/common.types';

// Mock repository with all required methods
const mockRepository = {
  createScanEvent: jest.fn(),
  getAnalyticsSummary: jest.fn(),
  createConversionGoal: jest.fn(),
  createConversionEvent: jest.fn(),
  getPeakTimeAnalysis: jest.fn(),
  savePeakTimeAnalysis: jest.fn(),
  getRealtimeMetrics: jest.fn(),
  cacheRealtimeMetric: jest.fn(),
  updateHeatmapData: jest.fn(),
  getHeatmapData: jest.fn(),
  getConversionGoalsByQR: jest.fn(),
  recordConversionEvent: jest.fn(),
  getPlatformStatistics: jest.fn(),
  getEngagementMetrics: jest.fn(),
  getAdvancedAnalytics: jest.fn(),
  executeCustomQuery: jest.fn(),
  getRetentionAnalysis: jest.fn(),
  getUserJourneyAnalysis: jest.fn(),
  getAttributionAnalysis: jest.fn()
} as jest.Mocked<IAnalyticsRepository>;

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Sample data
const sampleScanEvent = {
  id: 'scan_123',
  qr_code_id: 'qr_123',
  user_id: 'user_123',
  timestamp: new Date(),
  location: 'New York',
  device_info: 'iPhone',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0'
};

const sampleAnalyticsSummary: AnalyticsSummary = {
  qrCodeId: 'qr_123',
  totalScans: 100,
  uniqueScans: 80,
  scansByDate: {},
  scansByLocation: {},
  scansByDevice: {},
  conversionRate: 15.5,
  averageSessionDuration: 120,
  peakScanTimes: [],
  recentActivity: []
};

const sampleConversionGoal: ConversionGoal = {
  id: 'goal_123',
  qr_code_id: 'qr_123',
  name: 'Website Visit',
  description: 'Track website visits',
  target_url: 'https://example.com',
  target_value: 100,
  current_value: 50,
  conversion_rate: 50,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

const sampleConversionEvent: ConversionEvent = {
  id: 'event_123',
  goal_id: 'goal_123',
  qr_code_id: 'qr_123',
  user_id: 'user_123',
  value: 1,
  timestamp: new Date(),
  event_data: {}
};

const samplePeakTimeAnalysis: PeakTimeAnalysis = {
  qrCodeId: 'qr_123',
  date: new Date(),
  hourlyData: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    scans: Math.floor(Math.random() * 50),
    uniqueUsers: Math.floor(Math.random() * 30)
  })),
  peakHours: [12, 18, 20],
  insights: ['Peak activity during lunch hours', 'High engagement in evening']
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockRepository: jest.Mocked<Partial<IAnalyticsRepository>>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new AnalyticsService(mockRepository as IAnalyticsRepository, mockLogger);
    jest.clearAllMocks();
  });

  describe('trackScan', () => {
    it('should track scan successfully', async () => {
      const scanData = {
        qrCodeId: 'qr_456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        referrer: 'https://example.com',
      };

      mockRepository.createScanEvent.mockResolvedValue(sampleScanEvent);

      const result = await service.trackScan(scanData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleScanEvent);
      expect(mockRepository.createScanEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          qrCodeId: scanData.qrCodeId,
          ipAddress: expect.any(String), // Hashed IP
          userAgent: scanData.userAgent,
          referrer: scanData.referrer,
        })
      );
    });

    it('should handle missing qrCodeId', async () => {
      const scanData = {
        qrCodeId: '',
        ipAddress: '192.168.1.1',
      };

      await expect(service.trackScan(scanData)).rejects.toThrow('QR Code ID is required');
      expect(mockRepository.createScanEvent).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const scanData = {
        qrCodeId: 'qr_456',
        ipAddress: '192.168.1.1',
      };

      const dbError = new Error('Database error');
      mockRepository.createScanEvent.mockRejectedValue(dbError);

      await expect(service.trackScan(scanData)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error tracking scan:', dbError);
    });
  });

  describe('getAnalytics', () => {
    it('should retrieve analytics successfully', async () => {
      const request = {
        qrCodeId: 'qr_456',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-15'),
      };

      mockRepository.getAnalyticsSummary.mockResolvedValue(sampleAnalyticsSummary);

      const result = await service.getAnalytics(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleAnalyticsSummary);
      expect(mockRepository.getAnalyticsSummary).toHaveBeenCalledWith(
        request.qrCodeId,
        request.startDate,
        request.endDate
      );
    });

    it('should handle missing QR code', async () => {
      const request = {
        qrCodeId: '',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-15'),
      };

      await expect(service.getAnalytics(request)).rejects.toThrow('QR Code ID is required');
      expect(mockRepository.getAnalyticsSummary).not.toHaveBeenCalled();
    });

    it('should handle no data found', async () => {
      const request = {
        qrCodeId: 'nonexistent_qr',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-15'),
      };

      mockRepository.getAnalyticsSummary.mockResolvedValue(null);

      await expect(service.getAnalytics(request)).rejects.toThrow('No analytics data found');
    });
  });

  describe('createConversionGoal', () => {
    it('should create conversion goal successfully', async () => {
      mockRepository.createConversionGoal.mockResolvedValue(sampleConversionGoal);

      const result = await service.createConversionGoal(sampleConversionGoal);

      expect(result).toEqual(sampleConversionGoal);
      expect(mockRepository.createConversionGoal).toHaveBeenCalledWith(sampleConversionGoal);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database constraint violation');
      mockRepository.createConversionGoal.mockRejectedValue(error);

      await expect(service.createConversionGoal(sampleConversionGoal)).rejects.toThrow('Database constraint violation');
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating conversion goal:', error);
    });
  });

  describe('recordConversionEvent', () => {
    it('should record conversion event successfully', async () => {
      const eventData = {
        goalId: sampleConversionEvent.goalId,
        scanEventId: sampleConversionEvent.scanEventId,
        qrCodeId: sampleConversionEvent.qrCodeId,
        userId: sampleConversionEvent.userId,
        conversionValue: sampleConversionEvent.conversionValue,
        conversionData: sampleConversionEvent.conversionData,
        attributionModel: sampleConversionEvent.attributionModel,
        timeToConversion: sampleConversionEvent.timeToConversion,
      };

      mockRepository.createConversionEvent.mockResolvedValue(sampleConversionEvent);

      const result = await service.recordConversionEvent(eventData);

      expect(result).toEqual(sampleConversionEvent);
      expect(mockRepository.createConversionEvent).toHaveBeenCalledWith(eventData);
    });
  });

  describe('getPeakTimeAnalysis', () => {
    it('should retrieve peak time analysis successfully', async () => {
      mockRepository.getPeakTimeAnalysis.mockResolvedValue(samplePeakTimeAnalysis);

      const result = await service.getPeakTimeAnalysis('qr_456');

      expect(result).toEqual(samplePeakTimeAnalysis);
      expect(mockRepository.getPeakTimeAnalysis).toHaveBeenCalledWith('qr_456');
    });

    it('should handle missing analysis', async () => {
      mockRepository.getPeakTimeAnalysis.mockResolvedValue(null);

      const result = await service.getPeakTimeAnalysis('nonexistent_qr');

      expect(result).toBeNull();
    });
  });

  describe('generatePeakTimeAnalysis', () => {
    it('should generate and save peak time analysis', async () => {
      mockRepository.getPeakTimeAnalysis.mockResolvedValue(null);
      mockRepository.savePeakTimeAnalysis.mockResolvedValue();

      const result = await service.generatePeakTimeAnalysis(
        'qr_456',
        new Date('2025-10-01'),
        new Date('2025-10-15')
      );

      expect(result).toEqual(expect.objectContaining({
        hourlyDistribution: [],
        dailyDistribution: [],
        seasonalTrends: [],
        peakHours: [],
        recommendations: [],
      }));

      expect(mockRepository.savePeakTimeAnalysis).toHaveBeenCalledWith('qr_456', result);
    });

    it('should return existing analysis if available', async () => {
      mockRepository.getPeakTimeAnalysis.mockResolvedValue(samplePeakTimeAnalysis);

      const result = await service.generatePeakTimeAnalysis(
        'qr_456',
        new Date('2025-10-01'),
        new Date('2025-10-15')
      );

      expect(result).toEqual(samplePeakTimeAnalysis);
      expect(mockRepository.savePeakTimeAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('getRealtimeMetrics', () => {
    it('should retrieve real-time metrics successfully', async () => {
      const mockMetrics = [
        {
          qrCodeId: 'qr_456',
          metricName: 'active_scans',
          metricValue: 42,
          lastUpdated: new Date(),
          ttl: 300,
        }
      ];

      mockRepository.getRealtimeMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getRealtimeMetrics('qr_456', 'active_scans');

      expect(result).toEqual(mockMetrics);
      expect(mockRepository.getRealtimeMetrics).toHaveBeenCalledWith('qr_456', ['active_scans']);
    });

    it('should handle undefined metric name', async () => {
      const mockMetrics = [
        {
          qrCodeId: 'qr_456',
          metricName: 'all_metrics',
          metricValue: 100,
          lastUpdated: new Date(),
          ttl: 300,
        }
      ];

      mockRepository.getRealtimeMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getRealtimeMetrics('qr_456');

      expect(result).toEqual(mockMetrics);
      expect(mockRepository.getRealtimeMetrics).toHaveBeenCalledWith('qr_456', undefined);
    });
  });

  describe('createAdvancedExport', () => {
    it('should create export job successfully', async () => {
      const jobId = await service.createAdvancedExport(
        'qr_456',
        'detailed_analytics',
        new Date('2025-10-01'),
        new Date('2025-10-15'),
        'csv'
      );

      expect(jobId).toMatch(/^export_\d+_[a-z0-9]+$/);
    });
  });

  describe('getAdvancedExportStatus', () => {
    it('should return export job status', async () => {
      const result = await service.getAdvancedExportStatus('export_123_abc');

      expect(result).toEqual(expect.objectContaining({
        jobId: 'export_123_abc',
        status: 'completed',
        progress: 100,
        createdAt: expect.any(Date),
        completedAt: expect.any(Date),
      }));
    });
  });

  describe('downloadAdvancedExport', () => {
    it('should return download URL', async () => {
      const result = await service.downloadAdvancedExport('export_123_abc');

      expect(result).toBe('https://example.com/downloads/export_123_abc.csv');
    });
  });

  describe('cacheRealtimeMetric', () => {
    it('should cache metric successfully', async () => {
      mockRepository.cacheRealtimeMetric.mockResolvedValue();

      await service.cacheRealtimeMetric('qr_456', 'active_scans', 42, { source: 'test' });

      expect(mockRepository.cacheRealtimeMetric).toHaveBeenCalledWith(
        'qr_456',
        'active_scans',
        42,
        JSON.stringify({ source: 'test' })
      );
    });
  });
});