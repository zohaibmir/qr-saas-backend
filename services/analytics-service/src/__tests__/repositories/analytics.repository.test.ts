import { AnalyticsRepository } from '../../repositories/analytics.repository';
import { 
  mockPool, 
  mockLogger, 
  sampleScanEvent, 
  sampleAnalyticsSummary,
  sampleConversionGoal,
  sampleConversionEvent,
  mockQueryResult,
  mockAnalyticsSummaryQueryResult
} from '../mocks';

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;

  beforeEach(() => {
    repository = new AnalyticsRepository(mockPool, mockLogger);
    jest.clearAllMocks();
  });

  describe('createScanEvent', () => {
    it('should create a scan event successfully', async () => {
      const scanEventData = {
        qrCodeId: sampleScanEvent.qrCodeId,
        timestamp: sampleScanEvent.timestamp,
        ipAddress: sampleScanEvent.ipAddress,
        userAgent: sampleScanEvent.userAgent,
        location: sampleScanEvent.location,
        platform: sampleScanEvent.platform,
        device: sampleScanEvent.device,
        referrer: sampleScanEvent.referrer,
      };

      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult);

      const result = await repository.createScanEvent(scanEventData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scan_events'),
        expect.arrayContaining([
          scanEventData.qrCodeId,
          scanEventData.timestamp,
          scanEventData.ipAddress,
          scanEventData.userAgent,
          scanEventData.location?.country,
          scanEventData.location?.region,
          scanEventData.location?.city,
          scanEventData.location?.latitude,
          scanEventData.location?.longitude,
          scanEventData.platform,
          scanEventData.device,
          scanEventData.referrer,
        ])
      );

      expect(result).toEqual(sampleScanEvent);
    });

    it('should handle database errors', async () => {
      const scanEventData = {
        qrCodeId: 'qr_456',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      };

      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.createScanEvent(scanEventData)).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating scan event:', dbError);
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should retrieve analytics summary successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockAnalyticsSummaryQueryResult);

      const result = await repository.getAnalyticsSummary(
        'qr_456',
        new Date('2025-10-01'),
        new Date('2025-10-15')
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['qr_456'])
      );

      expect(result).toEqual(expect.objectContaining({
        qrCodeId: 'qr_456',
        totalScans: 1000,
        uniqueScans: 750,
      }));
    });

    it('should handle missing analytics data', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await repository.getAnalyticsSummary(
        'nonexistent_qr',
        new Date('2025-10-01'),
        new Date('2025-10-15')
      );

      expect(result).toBeNull();
    });
  });

  describe('createConversionGoal', () => {
    it('should create a conversion goal successfully', async () => {
      const mockResult = {
        rows: [{
          id: sampleConversionGoal.id,
          qr_code_id: sampleConversionGoal.qrCodeId,
          name: sampleConversionGoal.name,
          goal_type: sampleConversionGoal.type,
          target_url: sampleConversionGoal.targetUrl,
          target_value: sampleConversionGoal.targetValue,
          is_active: sampleConversionGoal.isActive,
          created_at: sampleConversionGoal.createdAt,
          updated_at: sampleConversionGoal.updatedAt,
        }]
      };

      (mockPool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await repository.createConversionGoal(sampleConversionGoal);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversion_goals'),
        expect.arrayContaining([
          sampleConversionGoal.id,
          sampleConversionGoal.qrCodeId,
          sampleConversionGoal.name,
          sampleConversionGoal.type,
          sampleConversionGoal.targetUrl,
          sampleConversionGoal.targetValue,
          sampleConversionGoal.isActive,
        ])
      );

      expect(result).toEqual(expect.objectContaining({
        id: sampleConversionGoal.id,
        qrCodeId: sampleConversionGoal.qrCodeId,
        name: sampleConversionGoal.name,
        type: sampleConversionGoal.type,
      }));
    });

    it('should handle validation errors', async () => {
      const invalidGoal = { ...sampleConversionGoal, name: '' };

      const validationError = new Error('Name cannot be empty');
      (mockPool.query as jest.Mock).mockRejectedValue(validationError);

      await expect(repository.createConversionGoal(invalidGoal)).rejects.toThrow('Name cannot be empty');
    });
  });

  describe('createConversionEvent', () => {
    it('should create a conversion event successfully', async () => {
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

      const mockResult = {
        rows: [{
          id: sampleConversionEvent.id,
          goal_id: sampleConversionEvent.goalId,
          scan_event_id: sampleConversionEvent.scanEventId,
          qr_code_id: sampleConversionEvent.qrCodeId,
          user_id: sampleConversionEvent.userId,
          conversion_value: sampleConversionEvent.conversionValue,
          conversion_data: JSON.stringify(sampleConversionEvent.conversionData),
          attribution_model: sampleConversionEvent.attributionModel,
          time_to_conversion: sampleConversionEvent.timeToConversion,
          created_at: sampleConversionEvent.createdAt,
        }]
      };

      (mockPool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await repository.createConversionEvent(eventData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversion_events'),
        expect.arrayContaining([
          eventData.goalId,
          eventData.scanEventId,
          eventData.qrCodeId,
          eventData.userId,
          eventData.conversionValue,
          JSON.stringify(eventData.conversionData),
          eventData.attributionModel,
          eventData.timeToConversion,
        ])
      );

      expect(result).toEqual(expect.objectContaining({
        id: sampleConversionEvent.id,
        goalId: sampleConversionEvent.goalId,
        qrCodeId: sampleConversionEvent.qrCodeId,
      }));
    });
  });

  describe('getConversionFunnelData', () => {
    it('should retrieve conversion funnel data', async () => {
      const goalData = {
        rows: [{
          id: 'goal_123',
          name: 'Newsletter Signup',
        }]
      };

      const funnelData = {
        rows: [
          {
            step_number: 1,
            step_name: 'Page Visit',
            completions: 1000,
            unique_users: 1000,
            conversion_rate: 100,
            dropoff_rate: 0,
            average_value: 0,
          },
          {
            step_number: 2,
            step_name: 'Email Entered',
            completions: 750,
            unique_users: 750,
            conversion_rate: 75,
            dropoff_rate: 25,
            average_value: 50,
          },
        ]
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(goalData)
        .mockResolvedValueOnce(funnelData);

      const result = await repository.getConversionFunnelData(
        'goal_123',
        new Date('2025-10-01'),
        new Date('2025-10-15')
      );

      expect(result).toEqual(expect.objectContaining({
        goalId: 'goal_123',
        goalName: 'Newsletter Signup',
        stages: expect.arrayContaining([
          expect.objectContaining({
            stage: 'Step 1',
            count: 1000,
            conversionRate: 100,
            dropOffRate: 0,
          }),
          expect.objectContaining({
            stage: 'Step 2',
            count: 750,
            conversionRate: 75,
            dropOffRate: 25,
          }),
        ]),
        totalConversions: 750,
        averageTimeToConversion: 25,
        topConvertingSegments: [],
      }));
    });
  });

  describe('cacheRealtimeMetric', () => {
    it('should cache real-time metric successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await repository.cacheRealtimeMetric('qr_456', 'active_scans', 42, JSON.stringify({ source: 'test' }));

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO realtime_metrics_cache'),
        expect.arrayContaining([
          'qr_456',
          'active_scans',
          42,
          JSON.stringify({ source: 'test' }),
        ])
      );
    });
  });

  describe('updateHeatmapData', () => {
    it('should update heatmap data successfully', async () => {
      const dataPoints = [
        { x: 40.7128, y: -74.0060, value: 25, intensity: 0.8 }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await repository.updateHeatmapData('qr_456', 'geographic', JSON.stringify(dataPoints), Date.now(), 100);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO heatmap_data'),
        expect.arrayContaining([
          'qr_456',
          'geographic',
          JSON.stringify(dataPoints),
        ])
      );
    });
  });
});