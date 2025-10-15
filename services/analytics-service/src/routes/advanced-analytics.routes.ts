import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ILogger } from '../interfaces';
import { ConversionGoal, ConversionEvent, HeatmapData, PeakTimeAnalysis } from '../../../../shared/src/types/analytics.types';

export class AdvancedAnalyticsRoutes {
  private router: Router;
  private analyticsService: AnalyticsService;
  private logger: ILogger;

  constructor(analyticsService: AnalyticsService, logger: ILogger) {
    this.router = Router();
    this.analyticsService = analyticsService;
    this.logger = logger;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Conversion Goals Routes
    this.router.post('/conversion-goals', this.createConversionGoal.bind(this));
    this.router.get('/conversion-goals/:goalId', this.getConversionGoal.bind(this));
    this.router.get('/qr-codes/:qrCodeId/conversion-goals', this.getConversionGoalsByQrCode.bind(this));
    this.router.put('/conversion-goals/:goalId', this.updateConversionGoal.bind(this));
    this.router.delete('/conversion-goals/:goalId', this.deleteConversionGoal.bind(this));

    // Conversion Events Routes
    this.router.post('/conversion-events', this.recordConversionEvent.bind(this));
    this.router.get('/conversion-goals/:goalId/funnel', this.getConversionFunnel.bind(this));
    this.router.get('/conversion-goals/:goalId/events', this.getConversionEvents.bind(this));

    // Peak Time Analysis Routes
    this.router.get('/qr-codes/:qrCodeId/peak-time-analysis', this.getPeakTimeAnalysis.bind(this));
    this.router.post('/qr-codes/:qrCodeId/peak-time-analysis', this.generatePeakTimeAnalysis.bind(this));

    // Heatmap Routes
    this.router.get('/qr-codes/:qrCodeId/heatmap/:type', this.getHeatmapData.bind(this));
    this.router.post('/qr-codes/:qrCodeId/heatmap', this.generateHeatmap.bind(this));
    this.router.put('/qr-codes/:qrCodeId/heatmap', this.updateHeatmapData.bind(this));

    // Real-time Analytics Routes
    this.router.get('/qr-codes/:qrCodeId/realtime-metrics', this.getRealtimeMetrics.bind(this));
    this.router.post('/realtime-metrics/cache', this.cacheRealtimeMetric.bind(this));

    // Export Routes
    this.router.post('/exports', this.createExportJob.bind(this));
    this.router.get('/exports/:jobId', this.getExportJob.bind(this));
    this.router.get('/exports/:jobId/download', this.downloadExport.bind(this));
    this.router.get('/qr-codes/:qrCodeId/exports', this.getExportJobs.bind(this));

    // Analytics Alerts Routes
    this.router.post('/alerts', this.createAnalyticsAlert.bind(this));
    this.router.get('/alerts/:alertId', this.getAnalyticsAlert.bind(this));
    this.router.get('/qr-codes/:qrCodeId/alerts', this.getAnalyticsAlerts.bind(this));
    this.router.put('/alerts/:alertId', this.updateAnalyticsAlert.bind(this));
    this.router.delete('/alerts/:alertId', this.deleteAnalyticsAlert.bind(this));
  }

  // Conversion Goals Handlers
  private async createConversionGoal(req: Request, res: Response): Promise<void> {
    try {
      const goalData: ConversionGoal = req.body;
      
      // Validate required fields
      if (!goalData.qrCodeId || !goalData.name || !goalData.type) {
        res.status(400).json({
          error: 'Missing required fields: qrCodeId, name, type'
        });
        return;
      }

      const goal = await this.analyticsService.createConversionGoal(goalData);
      res.status(201).json({
        success: true,
        data: goal
      });
    } catch (error) {
      this.logger.error('Error creating conversion goal:', error);
      res.status(500).json({
        error: 'Failed to create conversion goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getConversionGoal(req: Request, res: Response): Promise<void> {
    try {
      const { goalId } = req.params;
      const goal = await this.analyticsService.getConversionGoal(goalId);
      
      if (!goal) {
        res.status(404).json({ error: 'Conversion goal not found' });
        return;
      }

      res.json({
        success: true,
        data: goal
      });
    } catch (error) {
      this.logger.error('Error getting conversion goal:', error);
      res.status(500).json({
        error: 'Failed to get conversion goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getConversionGoalsByQrCode(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const goals = await this.analyticsService.getConversionGoalsByQrCode(qrCodeId);
      
      res.json({
        success: true,
        data: goals,
        count: goals.length
      });
    } catch (error) {
      this.logger.error('Error getting conversion goals by QR code:', error);
      res.status(500).json({
        error: 'Failed to get conversion goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async updateConversionGoal(req: Request, res: Response): Promise<void> {
    try {
      const { goalId } = req.params;
      const updateData = req.body;
      
      const updatedGoal = await this.analyticsService.updateConversionGoal(goalId, updateData);
      
      if (!updatedGoal) {
        res.status(404).json({ error: 'Conversion goal not found' });
        return;
      }

      res.json({
        success: true,
        data: updatedGoal
      });
    } catch (error) {
      this.logger.error('Error updating conversion goal:', error);
      res.status(500).json({
        error: 'Failed to update conversion goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async deleteConversionGoal(req: Request, res: Response): Promise<void> {
    try {
      const { goalId } = req.params;
      await this.analyticsService.deleteConversionGoal(goalId);
      
      res.json({
        success: true,
        message: 'Conversion goal deleted successfully'
      });
    } catch (error) {
      this.logger.error('Error deleting conversion goal:', error);
      res.status(500).json({
        error: 'Failed to delete conversion goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Conversion Events Handlers
  private async recordConversionEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData: Omit<ConversionEvent, 'id' | 'createdAt'> = req.body;
      
      // Validate required fields
      if (!eventData.goalId || !eventData.qrCodeId || !eventData.scanEventId) {
        res.status(400).json({
          error: 'Missing required fields: goalId, qrCodeId, scanEventId'
        });
        return;
      }

      const event = await this.analyticsService.recordConversionEvent(eventData);
      res.status(201).json({
        success: true,
        data: event
      });
    } catch (error) {
      this.logger.error('Error recording conversion event:', error);
      res.status(500).json({
        error: 'Failed to record conversion event',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getConversionFunnel(req: Request, res: Response): Promise<void> {
    try {
      const { goalId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const funnel = await this.analyticsService.getConversionFunnelData(goalId, start, end);
      
      res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      this.logger.error('Error getting conversion funnel:', error);
      res.status(500).json({
        error: 'Failed to get conversion funnel',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getConversionEvents(req: Request, res: Response): Promise<void> {
    try {
      const { goalId } = req.params;
      const { limit = '100', offset = '0' } = req.query;
      
      const events = await this.analyticsService.getConversionEvents(
        goalId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      
      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      this.logger.error('Error getting conversion events:', error);
      res.status(500).json({
        error: 'Failed to get conversion events',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Peak Time Analysis Handlers
  private async getPeakTimeAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const analysis = await this.analyticsService.getPeakTimeAnalysis(qrCodeId);
      
      if (!analysis) {
        res.status(404).json({ error: 'Peak time analysis not found' });
        return;
      }

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      this.logger.error('Error getting peak time analysis:', error);
      res.status(500).json({
        error: 'Failed to get peak time analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async generatePeakTimeAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const { startDate, endDate } = req.body;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      const analysis = await this.analyticsService.generatePeakTimeAnalysis(qrCodeId, start, end);
      
      res.status(201).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      this.logger.error('Error generating peak time analysis:', error);
      res.status(500).json({
        error: 'Failed to generate peak time analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Heatmap Handlers
  private async getHeatmapData(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId, type } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const heatmapData = await this.analyticsService.getHeatmapData(
        qrCodeId, 
        type as 'geographic' | 'temporal' | 'device' | 'combined',
        start,
        end
      );
      
      res.json({
        success: true,
        data: heatmapData
      });
    } catch (error) {
      this.logger.error('Error getting heatmap data:', error);
      res.status(500).json({
        error: 'Failed to get heatmap data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async generateHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const { type, startDate, endDate } = req.body;
      
      if (!type || !['geographic', 'temporal', 'device', 'combined'].includes(type)) {
        res.status(400).json({
          error: 'Invalid heatmap type. Must be: geographic, temporal, device, or combined'
        });
        return;
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      const heatmap = await this.analyticsService.generateHeatmap(qrCodeId, type, start, end);
      
      res.status(201).json({
        success: true,
        data: heatmap
      });
    } catch (error) {
      this.logger.error('Error generating heatmap:', error);
      res.status(500).json({
        error: 'Failed to generate heatmap',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async updateHeatmapData(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const heatmapData: HeatmapData = req.body;
      
      await this.analyticsService.updateHeatmapData(qrCodeId, heatmapData);
      
      res.json({
        success: true,
        message: 'Heatmap data updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating heatmap data:', error);
      res.status(500).json({
        error: 'Failed to update heatmap data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Real-time Analytics Handlers
  private async getRealtimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const { metricName } = req.query;
      
      const metrics = await this.analyticsService.getRealtimeMetrics(
        qrCodeId, 
        metricName as string
      );
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error getting realtime metrics:', error);
      res.status(500).json({
        error: 'Failed to get realtime metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async cacheRealtimeMetric(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId, metricName, metricValue, metadata } = req.body;
      
      if (!qrCodeId || !metricName || metricValue === undefined) {
        res.status(400).json({
          error: 'Missing required fields: qrCodeId, metricName, metricValue'
        });
        return;
      }

      await this.analyticsService.cacheRealtimeMetric(qrCodeId, metricName, metricValue, metadata);
      
      res.status(201).json({
        success: true,
        message: 'Realtime metric cached successfully'
      });
    } catch (error) {
      this.logger.error('Error caching realtime metric:', error);
      res.status(500).json({
        error: 'Failed to cache realtime metric',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Export Handlers
  private async createExportJob(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId, exportType, startDate, endDate, format, filters } = req.body;
      
      if (!qrCodeId || !exportType) {
        res.status(400).json({
          error: 'Missing required fields: qrCodeId, exportType'
        });
        return;
      }

      const jobId = await this.analyticsService.createAdvancedExport(
        qrCodeId,
        exportType,
        startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate ? new Date(endDate) : new Date(),
        format || 'csv',
        filters
      );
      
      res.status(201).json({
        success: true,
        data: { jobId }
      });
    } catch (error) {
      this.logger.error('Error creating export job:', error);
      res.status(500).json({
        error: 'Failed to create export job',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getExportJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await this.analyticsService.getAdvancedExportStatus(jobId);
      
      if (!job) {
        res.status(404).json({ error: 'Export job not found' });
        return;
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      this.logger.error('Error getting export job:', error);
      res.status(500).json({
        error: 'Failed to get export job',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const downloadUrl = await this.analyticsService.downloadAdvancedExport(jobId);
      
      if (!downloadUrl) {
        res.status(404).json({ error: 'Export file not found or not ready' });
        return;
      }

      res.json({
        success: true,
        data: { downloadUrl }
      });
    } catch (error) {
      this.logger.error('Error downloading export:', error);
      res.status(500).json({
        error: 'Failed to download export',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getExportJobs(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const { limit = '20', offset = '0' } = req.query;
      
      const jobs = await this.analyticsService.getAdvancedExportJobs(
        qrCodeId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json({
        success: true,
        data: jobs,
        count: jobs.length
      });
    } catch (error) {
      this.logger.error('Error getting export jobs:', error);
      res.status(500).json({
        error: 'Failed to get export jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analytics Alerts Handlers
  private async createAnalyticsAlert(req: Request, res: Response): Promise<void> {
    try {
      const alertData = req.body;
      
      if (!alertData.qrCodeId || !alertData.alertName || !alertData.metricName) {
        res.status(400).json({
          error: 'Missing required fields: qrCodeId, alertName, metricName'
        });
        return;
      }

      const alert = await this.analyticsService.createAnalyticsAlert(alertData);
      
      res.status(201).json({
        success: true,
        data: alert
      });
    } catch (error) {
      this.logger.error('Error creating analytics alert:', error);
      res.status(500).json({
        error: 'Failed to create analytics alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getAnalyticsAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const alert = await this.analyticsService.getAnalyticsAlert(alertId);
      
      if (!alert) {
        res.status(404).json({ error: 'Analytics alert not found' });
        return;
      }

      res.json({
        success: true,
        data: alert
      });
    } catch (error) {
      this.logger.error('Error getting analytics alert:', error);
      res.status(500).json({
        error: 'Failed to get analytics alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getAnalyticsAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const alerts = await this.analyticsService.getAnalyticsAlerts(qrCodeId);
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      this.logger.error('Error getting analytics alerts:', error);
      res.status(500).json({
        error: 'Failed to get analytics alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async updateAnalyticsAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const updateData = req.body;
      
      const updatedAlert = await this.analyticsService.updateAnalyticsAlert(alertId, updateData);
      
      if (!updatedAlert) {
        res.status(404).json({ error: 'Analytics alert not found' });
        return;
      }

      res.json({
        success: true,
        data: updatedAlert
      });
    } catch (error) {
      this.logger.error('Error updating analytics alert:', error);
      res.status(500).json({
        error: 'Failed to update analytics alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async deleteAnalyticsAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      await this.analyticsService.deleteAnalyticsAlert(alertId);
      
      res.json({
        success: true,
        message: 'Analytics alert deleted successfully'
      });
    } catch (error) {
      this.logger.error('Error deleting analytics alert:', error);
      res.status(500).json({
        error: 'Failed to delete analytics alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}