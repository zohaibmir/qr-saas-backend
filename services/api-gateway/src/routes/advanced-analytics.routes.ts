import { Router, Request, Response } from 'express';
import { Logger } from '../services/logger.service';
import { ServiceRegistry } from '../services/service-registry.service';

export class AdvancedAnalyticsRoutes {
  private router: Router;
  private logger: Logger;
  private serviceRegistry: ServiceRegistry;

  constructor(logger: Logger, serviceRegistry: ServiceRegistry) {
    this.router = Router();
    this.logger = logger;
    this.serviceRegistry = serviceRegistry;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // ========== CONVERSION GOALS ROUTES ==========
    
    // Create conversion goal
    this.router.post('/conversion-goals', this.handleConversionGoals.bind(this));
    
    // Get conversion goal by ID
    this.router.get('/conversion-goals/:goalId', this.handleConversionGoalById.bind(this));
    
    // Get conversion goals by QR code
    this.router.get('/qr-codes/:qrCodeId/conversion-goals', this.handleConversionGoalsByQrCode.bind(this));
    
    // Update conversion goal
    this.router.put('/conversion-goals/:goalId', this.handleConversionGoalById.bind(this));
    
    // Delete conversion goal
    this.router.delete('/conversion-goals/:goalId', this.handleConversionGoalById.bind(this));

    // ========== CONVERSION EVENTS ROUTES ==========
    
    // Record conversion event
    this.router.post('/conversion-events', this.handleConversionEvents.bind(this));
    
    // Get conversion funnel
    this.router.get('/conversion-goals/:goalId/funnel', this.handleConversionFunnel.bind(this));
    
    // Get conversion events
    this.router.get('/conversion-goals/:goalId/events', this.handleConversionEventsByGoal.bind(this));

    // ========== PEAK TIME ANALYSIS ROUTES ==========
    
    // Get peak time analysis
    this.router.get('/qr-codes/:qrCodeId/peak-time-analysis', this.handlePeakTimeAnalysis.bind(this));
    
    // Generate peak time analysis
    this.router.post('/qr-codes/:qrCodeId/peak-time-analysis', this.handlePeakTimeAnalysisGeneration.bind(this));

    // ========== HEATMAP ROUTES ==========
    
    // Get heatmap data
    this.router.get('/qr-codes/:qrCodeId/heatmap/:type', this.handleHeatmapData.bind(this));
    
    // Generate heatmap
    this.router.post('/qr-codes/:qrCodeId/heatmap', this.handleHeatmapGeneration.bind(this));
    
    // Update heatmap data
    this.router.put('/qr-codes/:qrCodeId/heatmap', this.handleHeatmapUpdate.bind(this));

    // ========== REAL-TIME ANALYTICS ROUTES ==========
    
    // Get real-time metrics
    this.router.get('/qr-codes/:qrCodeId/realtime-metrics', this.handleRealtimeMetrics.bind(this));
    
    // Cache real-time metric
    this.router.post('/realtime-metrics/cache', this.handleRealtimeMetricCache.bind(this));

    // ========== EXPORT ROUTES ==========
    
    // Create export job
    this.router.post('/exports', this.handleExportCreation.bind(this));
    
    // Get export job status
    this.router.get('/exports/:jobId', this.handleExportStatus.bind(this));
    
    // Download export
    this.router.get('/exports/:jobId/download', this.handleExportDownload.bind(this));
    
    // Get export jobs for QR code
    this.router.get('/qr-codes/:qrCodeId/exports', this.handleExportJobs.bind(this));

    // ========== ANALYTICS ALERTS ROUTES ==========
    
    // Create analytics alert
    this.router.post('/alerts', this.handleAnalyticsAlerts.bind(this));
    
    // Get analytics alert
    this.router.get('/alerts/:alertId', this.handleAnalyticsAlertById.bind(this));
    
    // Get analytics alerts for QR code
    this.router.get('/qr-codes/:qrCodeId/alerts', this.handleAnalyticsAlertsByQrCode.bind(this));
    
    // Update analytics alert
    this.router.put('/alerts/:alertId', this.handleAnalyticsAlertById.bind(this));
    
    // Delete analytics alert
    this.router.delete('/alerts/:alertId', this.handleAnalyticsAlertById.bind(this));
  }

  // ========== CONVERSION GOALS HANDLERS ==========

  private async handleConversionGoals(req: Request, res: Response): Promise<void> {
    await this.proxyToAnalyticsService(req, res, '/conversion-goals');
  }

  private async handleConversionGoalById(req: Request, res: Response): Promise<void> {
    const { goalId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/conversion-goals/${goalId}`);
  }

  private async handleConversionGoalsByQrCode(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/conversion-goals`);
  }

  // ========== CONVERSION EVENTS HANDLERS ==========

  private async handleConversionEvents(req: Request, res: Response): Promise<void> {
    await this.proxyToAnalyticsService(req, res, '/conversion-events');
  }

  private async handleConversionFunnel(req: Request, res: Response): Promise<void> {
    const { goalId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/conversion-goals/${goalId}/funnel`);
  }

  private async handleConversionEventsByGoal(req: Request, res: Response): Promise<void> {
    const { goalId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/conversion-goals/${goalId}/events`);
  }

  // ========== PEAK TIME ANALYSIS HANDLERS ==========

  private async handlePeakTimeAnalysis(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/peak-time-analysis`);
  }

  private async handlePeakTimeAnalysisGeneration(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/peak-time-analysis`);
  }

  // ========== HEATMAP HANDLERS ==========

  private async handleHeatmapData(req: Request, res: Response): Promise<void> {
    const { qrCodeId, type } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/heatmap/${type}`);
  }

  private async handleHeatmapGeneration(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/heatmap`);
  }

  private async handleHeatmapUpdate(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/heatmap`);
  }

  // ========== REAL-TIME ANALYTICS HANDLERS ==========

  private async handleRealtimeMetrics(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/realtime-metrics`);
  }

  private async handleRealtimeMetricCache(req: Request, res: Response): Promise<void> {
    await this.proxyToAnalyticsService(req, res, '/realtime-metrics/cache');
  }

  // ========== EXPORT HANDLERS ==========

  private async handleExportCreation(req: Request, res: Response): Promise<void> {
    await this.proxyToAnalyticsService(req, res, '/exports');
  }

  private async handleExportStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/exports/${jobId}`);
  }

  private async handleExportDownload(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/exports/${jobId}/download`);
  }

  private async handleExportJobs(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/exports`);
  }

  // ========== ANALYTICS ALERTS HANDLERS ==========

  private async handleAnalyticsAlerts(req: Request, res: Response): Promise<void> {
    await this.proxyToAnalyticsService(req, res, '/alerts');
  }

  private async handleAnalyticsAlertById(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/alerts/${alertId}`);
  }

  private async handleAnalyticsAlertsByQrCode(req: Request, res: Response): Promise<void> {
    const { qrCodeId } = req.params;
    await this.proxyToAnalyticsService(req, res, `/qr-codes/${qrCodeId}/alerts`);
  }

  // ========== UTILITY METHODS ==========

  private async proxyToAnalyticsService(req: Request, res: Response, path: string): Promise<void> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const analyticsServiceUrl = this.serviceRegistry.getServiceUrl('analytics-service');
    const targetUrl = `${analyticsServiceUrl}${path}`;
    
    // Preserve query parameters
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const fullTargetUrl = `${targetUrl}${queryString}`;

    try {
      this.logger.info('Proxying advanced analytics request', {
        requestId,
        method: req.method,
        originalPath: req.originalUrl,
        targetUrl: fullTargetUrl,
        hasBody: !!req.body
      });

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      };

      // Forward authorization header if present
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }

      // Make request to analytics service
      const response = await fetch(fullTargetUrl, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'DELETE' && req.body 
          ? JSON.stringify(req.body) 
          : undefined
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      this.logger.info('Advanced analytics request completed', {
        requestId,
        method: req.method,
        status: response.status,
        path: path
      });

      // Set response headers
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.status(response.status);
      
      if (typeof responseData === 'string') {
        res.send(responseData);
      } else {
        res.json(responseData);
      }

    } catch (error) {
      this.logger.error('Advanced analytics proxy failed', {
        requestId,
        method: req.method,
        path: path,
        targetUrl: fullTargetUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'ADVANCED_ANALYTICS_PROXY_ERROR',
          message: 'Advanced analytics service temporarily unavailable',
          requestId
        }
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}