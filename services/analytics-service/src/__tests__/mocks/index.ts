import { Pool } from 'pg';
import { ILogger } from '../../interfaces';

// Mock database pool
export const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

// Mock logger
export const mockLogger: ILogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock Redis client
export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
};

// Mock WebSocket server
export const mockWebSocketServer = {
  on: jest.fn(),
  clients: new Set(),
  broadcast: jest.fn(),
  close: jest.fn(),
};

// Sample data for testing
export const sampleScanEvent = {
  id: 'scan_123',
  qrCodeId: 'qr_456',
  timestamp: new Date('2025-10-15T12:00:00Z'),
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  location: {
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
  },
  platform: 'desktop',
  device: 'Chrome 118',
  referrer: 'https://example.com',
};

export const sampleAnalyticsSummary = {
  qrCodeId: 'qr_456',
  startDate: new Date('2025-10-01T00:00:00Z'),
  endDate: new Date('2025-10-15T23:59:59Z'),
  totalScans: 1000,
  uniqueScans: 750,
  platformBreakdown: {
    desktop: 400,
    mobile: 500,
    tablet: 100,
  },
  deviceBreakdown: {
    'Chrome 118': 300,
    'Safari 17': 200,
    'Firefox 119': 150,
    'Edge 118': 100,
    'Other': 250,
  },
  geographicData: [
    {
      country: 'US',
      scans: 400,
      percentage: 40,
    },
    {
      country: 'CA',
      scans: 200,
      percentage: 20,
    },
    {
      country: 'UK',
      scans: 150,
      percentage: 15,
    },
  ],
  timeSeriesData: [
    {
      date: new Date('2025-10-15T00:00:00Z'),
      scans: 100,
    },
  ],
  topPlatform: 'mobile',
  topCountry: 'US',
  createdAt: new Date('2025-10-15T12:00:00Z'),
};

export const sampleConversionGoal = {
  id: 'goal_123',
  qrCodeId: 'qr_456',
  name: 'Newsletter Signup',
  type: 'form_submit' as const,
  targetUrl: 'https://example.com/newsletter',
  targetValue: 100,
  isActive: true,
  createdAt: new Date('2025-10-15T12:00:00Z'),
  updatedAt: new Date('2025-10-15T12:00:00Z'),
};

export const sampleConversionEvent = {
  id: 'event_123',
  goalId: 'goal_123',
  scanEventId: 'scan_123',
  qrCodeId: 'qr_456',
  userId: 'user_789',
  conversionValue: 50,
  conversionData: { email: 'test@example.com' },
  attributionModel: 'first_touch' as const,
  timeToConversion: 120000, // 2 minutes in milliseconds
  createdAt: new Date('2025-10-15T12:02:00Z'),
};

export const samplePeakTimeAnalysis = {
  hourlyDistribution: [
    {
      hour: 9,
      scans: 150,
      percentage: 15,
      isBusinessHour: true,
    },
    {
      hour: 14,
      scans: 200,
      percentage: 20,
      isBusinessHour: true,
    },
  ],
  dailyDistribution: [
    {
      dayOfWeek: 1,
      dayName: 'Monday',
      scans: 500,
      percentage: 20,
      isWeekend: false,
    },
  ],
  seasonalTrends: [
    {
      month: 10,
      monthName: 'October',
      scans: 2500,
      percentage: 25,
      growthRate: 15,
    },
  ],
  peakHours: [
    {
      hour: 14,
      scans: 200,
      efficiency: 95,
    },
  ],
  recommendations: [
    {
      type: 'timing' as const,
      message: 'Peak activity occurs between 2-4 PM',
      impact: 'high' as const,
    },
  ],
};

export const sampleHeatmapData = {
  id: 'heatmap_123',
  type: 'geographic' as const,
  qrCodeId: 'qr_456',
  dataPoints: [
    {
      x: 40.7128,
      y: -74.0060,
      value: 25,
      intensity: 0.8,
      metadata: {
        city: 'New York',
        country: 'USA',
      },
    },
  ],
  maxValue: 100,
  minValue: 1,
  averageValue: 25,
  generatedAt: new Date('2025-10-15T12:00:00Z'),
  timeRange: {
    startDate: new Date('2025-10-08T12:00:00Z'),
    endDate: new Date('2025-10-15T12:00:00Z'),
  },
};

// Database query result mocks
export const mockQueryResult = {
  rows: [sampleScanEvent],
  rowCount: 1,
  command: 'SELECT',
  oid: 0,
  fields: [],
};

export const mockAnalyticsSummaryQueryResult = {
  rows: [
    {
      qr_code_id: 'qr_456',
      start_date: '2025-10-01T00:00:00Z',
      end_date: '2025-10-15T23:59:59Z',
      total_scans: 1000,
      unique_scans: 750,
      platform_breakdown: JSON.stringify({ desktop: 400, mobile: 500, tablet: 100 }),
      device_breakdown: JSON.stringify({ 'Chrome 118': 300, 'Safari 17': 200 }),
      geographic_data: JSON.stringify([{ country: 'US', scans: 400, percentage: 40 }]),
      time_series_data: JSON.stringify([{ date: '2025-10-15T00:00:00Z', scans: 100 }]),
      top_platform: 'mobile',
      top_country: 'US',
      created_at: '2025-10-15T12:00:00Z',
    },
  ],
  rowCount: 1,
  command: 'SELECT',
  oid: 0,
  fields: [],
};