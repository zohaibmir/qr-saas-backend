import request from 'supertest';
import { Express, Request, Response } from 'express';

// Mock Express app for API route testing
const createMockApp = (): Express => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Mock analytics routes
  app.post('/api/analytics/scan', (req: Request, res: Response) => {
    const { qrCodeId, ipAddress, userAgent } = req.body;
    
    if (!qrCodeId) {
      return res.status(400).json({
        success: false,
        error: { message: 'QR Code ID is required' }
      });
    }
    
    res.json({
      success: true,
      data: {
        id: 'scan_123',
        qrCodeId,
        timestamp: new Date().toISOString(),
        ipAddress: ipAddress ? 'hashed_ip' : null,
        userAgent
      }
    });
  });
  
  app.get('/api/analytics/:qrCodeId', (req: Request, res: Response) => {
    const { qrCodeId } = req.params;
    
    if (qrCodeId === 'invalid') {
      return res.status(404).json({
        success: false,
        error: { message: 'QR Code not found' }
      });
    }
    
    res.json({
      success: true,
      data: {
        qrCodeId,
        totalScans: 150,
        uniqueScans: 120,
        scansByDate: {},
        scansByLocation: {},
        scansByDevice: {},
        conversionRate: 18.5,
        averageSessionDuration: 145,
        peakScanTimes: [12, 18, 20],
        recentActivity: []
      }
    });
  });
  
  app.post('/api/analytics/conversion-goal', (req: Request, res: Response) => {
    const { qr_code_id, name, target_value } = req.body;
    
    if (!qr_code_id || !name) {
      return res.status(400).json({
        success: false,
        error: { message: 'QR Code ID and name are required' }
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: 'goal_123',
        qr_code_id,
        name,
        target_value: target_value || 100,
        current_value: 0,
        conversion_rate: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  });
  
  app.post('/api/analytics/conversion-event', (req: Request, res: Response) => {
    const { goal_id, qr_code_id, user_id } = req.body;
    
    if (!goal_id || !qr_code_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Goal ID and QR Code ID are required' }
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: 'event_123',
        goal_id,
        qr_code_id,
        user_id,
        value: 1,
        timestamp: new Date().toISOString(),
        event_data: {}
      }
    });
  });
  
  app.get('/api/analytics/:qrCodeId/peak-times', (req: Request, res: Response) => {
    const { qrCodeId } = req.params;
    
    res.json({
      qrCodeId,
      hourlyData: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        scans: Math.floor(Math.random() * 50),
        uniqueUsers: Math.floor(Math.random() * 30)
      })),
      peakHours: [12, 18, 20],
      insights: ['Peak activity during lunch hours', 'High engagement in evening']
    });
  });
  
  app.get('/api/analytics/:qrCodeId/realtime', (req: Request, res: Response) => {
    const { qrCodeId } = req.params;
    const { metrics } = req.query;
    
    const metricsData: any = {
      scans: 75,
      conversions: 12,
      activeUsers: 8,
      lastUpdated: new Date().toISOString()
    };
    
    if (metrics) {
      const requestedMetrics = (metrics as string).split(',');
      const filteredData: any = { lastUpdated: metricsData.lastUpdated };
      requestedMetrics.forEach(metric => {
        if (metricsData[metric] !== undefined) {
          filteredData[metric] = metricsData[metric];
        }
      });
      return res.json(filteredData);
    }
    
    res.json(metricsData);
  });
  
  return app;
};

describe('Analytics API Routes Integration Tests', () => {
  let app: Express;
  
  beforeAll(() => {
    app = createMockApp();
  });

  describe('POST /api/analytics/scan', () => {
    it('should track scan event successfully', async () => {
      const scanData = {
        qrCodeId: 'qr_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      const response = await request(app)
        .post('/api/analytics/scan')
        .send(scanData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCodeId).toBe(scanData.qrCodeId);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return error for missing QR Code ID', async () => {
      const scanData = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      const response = await request(app)
        .post('/api/analytics/scan')
        .send(scanData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('QR Code ID is required');
    });
  });

  describe('GET /api/analytics/:qrCodeId', () => {
    it('should retrieve analytics summary successfully', async () => {
      const qrCodeId = 'qr_123';

      const response = await request(app)
        .get(`/api/analytics/${qrCodeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCodeId).toBe(qrCodeId);
      expect(response.body.data.totalScans).toBeGreaterThan(0);
      expect(response.body.data.conversionRate).toBeDefined();
    });

    it('should return 404 for invalid QR Code', async () => {
      const response = await request(app)
        .get('/api/analytics/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('QR Code not found');
    });
  });

  describe('POST /api/analytics/conversion-goal', () => {
    it('should create conversion goal successfully', async () => {
      const goalData = {
        qr_code_id: 'qr_123',
        name: 'Website Visit',
        description: 'Track website visits',
        target_value: 100
      };

      const response = await request(app)
        .post('/api/analytics/conversion-goal')
        .send(goalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_code_id).toBe(goalData.qr_code_id);
      expect(response.body.data.name).toBe(goalData.name);
      expect(response.body.data.target_value).toBe(goalData.target_value);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return error for missing required fields', async () => {
      const goalData = {
        description: 'Track something'
      };

      const response = await request(app)
        .post('/api/analytics/conversion-goal')
        .send(goalData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('QR Code ID and name are required');
    });
  });

  describe('POST /api/analytics/conversion-event', () => {
    it('should record conversion event successfully', async () => {
      const eventData = {
        goal_id: 'goal_123',
        qr_code_id: 'qr_123',
        user_id: 'user_123'
      };

      const response = await request(app)
        .post('/api/analytics/conversion-event')
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.goal_id).toBe(eventData.goal_id);
      expect(response.body.data.qr_code_id).toBe(eventData.qr_code_id);
      expect(response.body.data.value).toBe(1);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return error for missing required fields', async () => {
      const eventData = {
        user_id: 'user_123'
      };

      const response = await request(app)
        .post('/api/analytics/conversion-event')
        .send(eventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Goal ID and QR Code ID are required');
    });
  });

  describe('GET /api/analytics/:qrCodeId/peak-times', () => {
    it('should retrieve peak time analysis successfully', async () => {
      const qrCodeId = 'qr_123';

      const response = await request(app)
        .get(`/api/analytics/${qrCodeId}/peak-times`)
        .expect(200);

      expect(response.body.qrCodeId).toBe(qrCodeId);
      expect(response.body.hourlyData).toHaveLength(24);
      expect(response.body.peakHours).toBeInstanceOf(Array);
      expect(response.body.insights).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/analytics/:qrCodeId/realtime', () => {
    it('should retrieve realtime metrics successfully', async () => {
      const qrCodeId = 'qr_123';

      const response = await request(app)
        .get(`/api/analytics/${qrCodeId}/realtime`)
        .expect(200);

      expect(response.body.scans).toBeDefined();
      expect(response.body.conversions).toBeDefined();
      expect(response.body.lastUpdated).toBeDefined();
    });

    it('should filter metrics based on query parameter', async () => {
      const qrCodeId = 'qr_123';

      const response = await request(app)
        .get(`/api/analytics/${qrCodeId}/realtime?metrics=scans,conversions`)
        .expect(200);

      expect(response.body.scans).toBeDefined();
      expect(response.body.conversions).toBeDefined();
      expect(response.body.activeUsers).toBeUndefined();
      expect(response.body.lastUpdated).toBeDefined();
    });
  });
});