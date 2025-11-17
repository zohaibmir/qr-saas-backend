import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import clean architecture components
import { 
  IAnalyticsService,
  IHealthChecker,
  IDependencyContainer,
  AppError
} from './interfaces';
import { Logger } from './services/logger.service';
import { DependencyContainer } from './services/dependency-container.service';
import { DatabaseConfig } from './config/database.config';
// Import existing repositories and services
import { AnalyticsRepository } from './repositories/analytics.repository';
import { CampaignRepository } from './repositories/campaign.repository';
import { HeatmapRepository } from './repositories/heatmap.repository';
import { AnalyticsService } from './services/analytics.service';
import { HealthChecker } from './services/health-checker.service';
import { HeatmapService } from './services/heatmap.service';
import { PeakTimeAnalysisService } from './services/peak-time-analysis.service';

// Import controllers
import { 
  AnalyticsController, 
  createAnalyticsController 
} from './controllers/analytics.controller';
import { 
  SuperAdminAnalyticsController, 
  createSuperAdminAnalyticsController 
} from './controllers/super-admin-analytics.controller';
import { 
  HealthController, 
  createHealthController 
} from './controllers/health.controller';
import { 
  CampaignManagementController, 
  createCampaignManagementController 
} from './controllers/campaign-management.controller';
import { 
  UTMTrackingController, 
  createUTMTrackingController 
} from './controllers/utm-tracking.controller';
import { 
  HeatmapController, 
  createHeatmapController 
} from './controllers/heatmap.controller';
import { 
  PeakTimeAnalysisController, 
  createPeakTimeAnalysisController 
} from './controllers/peak-time-analysis.controller';

// Import routes
import { 
  AnalyticsRoutes, 
  createAnalyticsRoutes 
} from './routes/analytics.routes';
import { 
  SuperAdminAnalyticsRoutes, 
  createSuperAdminAnalyticsRoutes 
} from './routes/super-admin-analytics.routes';
import { 
  HealthRoutes, 
  createHealthRoutes 
} from './routes/health.routes';
import { 
  CampaignManagementRoutes, 
  createCampaignManagementRoutes 
} from './routes/campaign-management.routes';
import { 
  UTMTrackingRoutes, 
  createUTMTrackingRoutes 
} from './routes/utm-tracking.routes';
import { 
  HeatmapRoutes, 
  createHeatmapRoutes 
} from './routes/heatmap.routes';
import { 
  PeakTimeAnalysisRoutes, 
  createPeakTimeAnalysisRoutes 
} from './routes/peak-time-analysis.routes';

// Import existing advanced features
import { AdvancedAnalyticsRoutes } from './routes/advanced-analytics.routes';
import { MarketingRoutes } from './routes/marketing.routes';
import { CampaignManagementService } from './services/campaign-management.service';
import { UTMTrackingService } from './services/utm-tracking.service';
import { RetargetingPixelService } from './services/retargeting-pixel.service';
import createCrossCampaignAnalysisRoutes from './routes/cross-campaign-analysis.routes';
import { createCustomDashboardRoutes } from './routes/custom-dashboard.routes';
import { createPredictiveAnalyticsRoutes } from './routes/predictive-analytics.routes';
import { createRealTimeAlertsRoutes } from './routes/real-time-alerts.routes';
import { CustomDashboardController } from './controllers/custom-dashboard.controller';
import { PredictiveAnalyticsController } from './controllers/predictive-analytics.controller';
import { RealTimeAlertsController } from './controllers/real-time-alerts.controller';

dotenv.config({ path: '../../.env' });

/**
 * Analytics Service Application
 * 
 * Clean Architecture implementation with:
 * - Controller → Service → Repository layers
 * - Dependency injection
 * - SOLID principles
 * - Separation of concerns
 */
export class AnalyticsServiceApp {
  private app: express.Application;
  private container: IDependencyContainer;
  private logger: Logger;
  
  // Controllers
  private analyticsController!: AnalyticsController;
  private superAdminAnalyticsController!: SuperAdminAnalyticsController;
  private healthController!: HealthController;
  private campaignController!: CampaignManagementController;
  private utmController!: UTMTrackingController;
  private heatmapController!: HeatmapController;
  private peakTimeController!: PeakTimeAnalysisController;
  
  // Routes
  private analyticsRoutes!: AnalyticsRoutes;
  private superAdminAnalyticsRoutes!: SuperAdminAnalyticsRoutes;
  private healthRoutes!: HealthRoutes;
  private campaignRoutes!: CampaignManagementRoutes;
  private utmRoutes!: UTMTrackingRoutes;
  private heatmapRoutes!: HeatmapRoutes;
  private peakTimeRoutes!: PeakTimeAnalysisRoutes;

  constructor() {
    this.app = express();
    this.container = new DependencyContainer();
    this.logger = new Logger('analytics-service');
    
    this.initializeDependencies();
    this.initializeControllers();
    this.initializeRoutes();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeDependencies(): void {
    try {
      // Initialize database
      const database = DatabaseConfig.initialize(this.logger);
      
      // Register core dependencies
      this.container.register('logger', this.logger);
      this.container.register('database', database);
      
      // Register repositories
      const analyticsRepository = new AnalyticsRepository(database, this.logger);
      const campaignRepository = new CampaignRepository(database, this.logger);
      const heatmapRepository = new HeatmapRepository(database, this.logger);
      
      this.container.register('analyticsRepository', analyticsRepository);
      this.container.register('campaignRepository', campaignRepository);
      this.container.register('heatmapRepository', heatmapRepository);
      
      // Register services
      const analyticsService = new AnalyticsService(analyticsRepository, this.logger);
      const heatmapService = new HeatmapService(analyticsRepository, this.logger);
      const peakTimeService = new PeakTimeAnalysisService(analyticsRepository, this.logger);
      
      // Initialize marketing services
      const campaignService = new CampaignManagementService(analyticsRepository, this.logger);
      const utmService = new UTMTrackingService(analyticsRepository, this.logger);
      const pixelService = new RetargetingPixelService(analyticsRepository, this.logger);
      
      // Create mock advanced analytics services (replace with real implementations)
      const customDashboardService = {
        getDashboards: async (userId: string) => ([]),
        createDashboard: async (request: any) => ({ id: 'mock-dashboard-id', ...request }),
        getDashboard: async (id: string) => ({ id, name: 'Mock Dashboard' }),
        updateDashboard: async (id: string, request: any) => ({ id, ...request }),
        deleteDashboard: async (id: string) => ({ success: true })
      };
      
      const alertEngineService = {
        createAlertRule: async (request: any) => ({ id: 'mock-alert-rule-id', ...request }),
        getAlertRules: async (userId: string) => ([]),
        updateAlertRule: async (id: string, request: any) => ({ id, ...request }),
        deleteAlertRule: async (id: string) => ({ success: true })
      };
      
      const predictiveAnalyticsService = {
        getModels: async (userId: string) => ([]),
        trainModel: async (request: any) => ({ trainingJobId: 'mock-job-id', estimatedCompletion: new Date() })
      };
      
      const healthChecker = new HealthChecker(this.logger, this.container);
      
      this.container.register('analyticsService', analyticsService);
      this.container.register('heatmapService', heatmapService);
      this.container.register('peakTimeService', peakTimeService);
      this.container.register('campaignService', campaignService);
      this.container.register('utmService', utmService);
      this.container.register('pixelService', pixelService);
      this.container.register('customDashboardService', customDashboardService);
      this.container.register('alertEngineService', alertEngineService);
      this.container.register('predictiveAnalyticsService', predictiveAnalyticsService);
      this.container.register('healthChecker', healthChecker);
      
      this.logger.info('Clean architecture dependencies initialized', {
        registeredDependencies: this.container.getRegisteredTokens()
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize dependencies', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private initializeControllers(): void {
    try {
      // Get services from container
      const analyticsService = this.container.resolve<IAnalyticsService>('analyticsService');
      const healthChecker = this.container.resolve<IHealthChecker>('healthChecker');
      const campaignService = this.container.resolve<CampaignManagementService>('campaignService');
      const utmService = this.container.resolve<UTMTrackingService>('utmService');
      const heatmapService = this.container.resolve<HeatmapService>('heatmapService');
      const peakTimeService = this.container.resolve<PeakTimeAnalysisService>('peakTimeService');

      // Initialize controllers with dependency injection
      this.analyticsController = createAnalyticsController(analyticsService, this.logger);
      this.superAdminAnalyticsController = createSuperAdminAnalyticsController(this.container, this.logger);
      this.healthController = createHealthController(healthChecker, this.logger);
      this.campaignController = createCampaignManagementController(campaignService, this.logger);
      this.utmController = createUTMTrackingController(utmService, this.logger);
      this.heatmapController = createHeatmapController(heatmapService, this.logger);
      this.peakTimeController = createPeakTimeAnalysisController(peakTimeService, this.logger);

      this.logger.info('Controllers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize controllers', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private initializeRoutes(): void {
    try {
      // Initialize routes with controllers
      this.analyticsRoutes = createAnalyticsRoutes(this.analyticsController);
      this.superAdminAnalyticsRoutes = createSuperAdminAnalyticsRoutes(this.superAdminAnalyticsController);
      this.healthRoutes = createHealthRoutes(this.healthController);
      this.campaignRoutes = createCampaignManagementRoutes(this.campaignController);
      this.utmRoutes = createUTMTrackingRoutes(this.utmController);
      this.heatmapRoutes = createHeatmapRoutes(this.heatmapController);
      this.peakTimeRoutes = createPeakTimeAnalysisRoutes(this.peakTimeController);

      this.logger.info('Routes initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize routes', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Higher limit for analytics tracking
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          statusCode: 429
        }
      }
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      
      this.logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      next();
    });

    // Auth System 2.0 - Extract auth context from API Gateway headers (same as QR service)
    this.setupAuthContextExtraction();
  }

  private setupAuthContextExtraction(): void {
    // Import auth context extraction (same pattern as QR service)
    const { extractAuth } = require('./middleware/auth.middleware');
    
    // Apply auth extraction globally
    this.app.use(extractAuth);
    
    this.logger.info('Auth context extraction configured', {
      pattern: 'Clean Architecture - Same as QR Service',
      implementation: 'Simple header extraction from API Gateway'
    });
  }

  private setupRoutes(): void {
    // Clean Architecture routes
    this.app.use('/analytics', this.analyticsRoutes.getRouter());
    this.app.use('/analytics', this.superAdminAnalyticsRoutes.getRouter());
    this.app.use('/', this.healthRoutes.getRouter());
    
    // New Clean Architecture routes
    this.app.use('/campaigns', this.campaignRoutes.getRouter());
    this.app.use('/utm', this.utmRoutes.getRouter());
    this.app.use('/heatmap', this.heatmapRoutes.getRouter());
    this.app.use('/peak-time', this.peakTimeRoutes.getRouter());

    // Advanced Analytics routes
    this.setupAdvancedAnalyticsRoutes();
    
    // Marketing routes
    this.setupMarketingRoutes();

    // Cross-campaign Analysis routes
    this.setupCrossCampaignAnalysisRoutes();

    // Custom Dashboard routes
    this.setupCustomDashboardRoutes();

    // Real-time Alerts routes
    this.setupRealTimeAlertsRoutes();

    // Predictive Analytics routes
    this.setupPredictiveAnalyticsRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      this.logger.warn('Route not found', { 
        method: req.method, 
        path: req.path,
        requestId: req.headers['x-request-id']
      });
      
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${req.method} ${req.path} not found`,
          statusCode: 404
        }
      });
    });
  }

  private setupAdvancedAnalyticsRoutes(): void {
    const analyticsService = this.container.resolve<IAnalyticsService>('analyticsService');
    const advancedAnalyticsRoutes = new AdvancedAnalyticsRoutes(analyticsService as AnalyticsService, this.logger);
    this.app.use('/', advancedAnalyticsRoutes.getRouter());
    
    this.logger.info('Advanced analytics routes configured');
  }

  private setupMarketingRoutes(): void {
    const campaignService = this.container.resolve('campaignService') as CampaignManagementService;
    const utmService = this.container.resolve('utmService') as UTMTrackingService;
    const pixelService = this.container.resolve('pixelService') as RetargetingPixelService;
    
    const marketingRoutes = new MarketingRoutes(
      campaignService,
      utmService, 
      pixelService,
      this.logger
    );
    
    this.app.use('/marketing', marketingRoutes.getRouter());
    
    this.logger.info('Marketing routes configured at /marketing');
  }

  private setupCrossCampaignAnalysisRoutes(): void {
    const database = this.container.resolve('database') as any;
    const crossCampaignRoutes = createCrossCampaignAnalysisRoutes(database);
    
    this.app.use('/cross-campaign', crossCampaignRoutes);
    
    this.logger.info('Cross-campaign analysis routes configured at /cross-campaign');
  }

  private setupCustomDashboardRoutes(): void {
    try {
      const customDashboardRoutes = createCustomDashboardRoutes(this.container);
      
      this.app.use('/dashboards', customDashboardRoutes);
      
      this.logger.info('Custom dashboard routes configured at /dashboards');
    } catch (error) {
      this.logger.error('Failed to setup custom dashboard routes', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Create fallback route
      this.app.use('/dashboards', (req, res) => {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Custom dashboard service temporarily unavailable'
          }
        });
      });
    }
  }

  private setupRealTimeAlertsRoutes(): void {
    try {
      // Create mock alert engine service - replace with real implementation
      const mockAlertEngineService = {
        createAlertRule: async (request: any) => ({ id: 'mock-alert-rule-id', ...request }),
        getAlertRules: async (userId: string) => ([]),
        updateAlertRule: async (id: string, request: any) => ({ id, ...request }),
        deleteAlertRule: async (id: string) => ({ success: true }),
        getActiveAlerts: async (userId: string) => ([]),
        acknowledgeAlert: async (id: string) => ({ success: true }),
        resolveAlert: async (id: string) => ({ success: true }),
        getAlertMetrics: async (userId: string) => ({ totalAlerts: 0, alertsBySeverity: {} }),
        testAlertRule: async (request: any) => ({ wouldTrigger: false, testResult: 'Mock test' })
      };
      
      const realTimeAlertsController = new RealTimeAlertsController(
        mockAlertEngineService as any,
        this.logger
      );
      const realTimeAlertsRoutes = createRealTimeAlertsRoutes(realTimeAlertsController);
      
      this.app.use('/alerts', realTimeAlertsRoutes);
      
      this.logger.info('Real-time alerts routes configured at /alerts');
    } catch (error) {
      this.logger.error('Failed to setup real-time alerts routes', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Create fallback route
      this.app.use('/alerts', (req, res) => {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Real-time alerts service temporarily unavailable'
          }
        });
      });
    }
  }

  private setupPredictiveAnalyticsRoutes(): void {
    try {
      // Create mock predictive service - replace with real implementation
      const mockPredictiveService = {
        getModels: async (userId: string) => ([]),
        trainModel: async (request: any) => ({ trainingJobId: 'mock-job-id', estimatedCompletion: new Date() }),
        getModelDetails: async (modelId: string) => ({ id: modelId, status: 'ready' }),
        deleteModel: async (modelId: string) => ({ success: true }),
        getModelPerformance: async (modelId: string) => ({ accuracy: 0.85, rmse: 0.12 }),
        getPredictions: async (userId: string, filters: any) => ([]),
        generatePrediction: async (request: any) => ({ id: 'mock-prediction-id', predictedValue: 100 }),
        getTrends: async (request: any) => ({ trendDirection: 'increasing', trendStrength: 0.8 }),
        generateForecast: async (request: any) => ({ forecastId: 'mock-forecast-id', forecastData: [] }),
        getAccuracyMetrics: async (userId: string) => ({ overallAccuracy: 0.85, modelAccuracies: [] })
      };
      
      const predictiveAnalyticsController = new PredictiveAnalyticsController(
        mockPredictiveService as any
      );
      const predictiveAnalyticsRoutes = createPredictiveAnalyticsRoutes(predictiveAnalyticsController);
      
      this.app.use('/predictions', predictiveAnalyticsRoutes);
      
      this.logger.info('Predictive analytics routes configured at /predictions');
    } catch (error) {
      this.logger.error('Failed to setup predictive analytics routes', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Create fallback route
      this.app.use('/predictions', (req, res) => {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Predictive analytics service temporarily unavailable'
          }
        });
      });
    }
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', { 
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          requestId: req.headers['x-request-id']
        }
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(): Promise<void> {
    const PORT = parseInt(process.env.PORT || '3003', 10);

    try {
      // Test database connection
      const dbHealthy = await DatabaseConfig.testConnection();
      if (!dbHealthy) {
        throw new Error('Database connection failed');
      }

      this.app.listen(PORT, '0.0.0.0', () => {
        this.logger.info('🚀 Analytics Service started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          architecture: 'Clean Architecture with SOLID Principles',
          dependencies: this.container.getRegisteredTokens(),
          routes: {
            analytics: '/analytics',
            health: '/health',
            superAdmin: '/analytics/super-admin',
            campaigns: '/campaigns',
            utm: '/utm',
            heatmap: '/heatmap',
            peakTime: '/peak-time',
            marketing: '/marketing',
            dashboards: '/dashboards',
            alerts: '/alerts',
            predictions: '/predictions'
          }
        });
      });

    } catch (error) {
      this.logger.error('Failed to start Analytics Service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Analytics Service gracefully...');
    
    try {
      await DatabaseConfig.close();
      this.logger.info('Analytics Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

/**
 * Factory function to create analytics service application
 */
export const createAnalyticsServiceApp = (): AnalyticsServiceApp => {
  return new AnalyticsServiceApp();
};