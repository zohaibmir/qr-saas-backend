import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import clean architecture components
import { 
  ServiceResponse, 
  ScanEvent, 
  AnalyticsSummary,
  TrackScanRequest,
  GetAnalyticsRequest,
  IAnalyticsService,
  IHealthChecker,
  IDependencyContainer,
  AppError
} from './interfaces';
import { Logger } from './services/logger.service';
import { DependencyContainer } from './services/dependency-container.service';
import { DatabaseConfig } from './config/database.config';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsService } from './services/analytics.service';
import { HealthChecker } from './services/health-checker.service';

dotenv.config({ path: '../../.env' });

class AnalyticsServiceApplication {
  private app: express.Application;
  private container: IDependencyContainer;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.container = new DependencyContainer();
    this.logger = new Logger('analytics-service');
    
    this.initializeDependencies();
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
      this.container.register('analyticsRepository', analyticsRepository);
      
      // Register services
      const analyticsService = new AnalyticsService(analyticsRepository, this.logger);
      const healthChecker = new HealthChecker(this.logger, this.container);
      this.container.register('analyticsService', analyticsService);
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
  }

  private setupRoutes(): void {
    const analyticsService = this.container.resolve<IAnalyticsService>('analyticsService');
    const healthChecker = this.container.resolve<IHealthChecker>('healthChecker');

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await healthChecker.checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
          success: true,
          data: health
        });
      } catch (error) {
        this.logger.error('Health check failed', { error });
        res.status(503).json({
          success: false,
          error: {
            code: 'HEALTH_CHECK_FAILED',
            message: 'Health check failed',
            statusCode: 503
          }
        });
      }
    });

    // Analytics routes
    this.setupAnalyticsRoutes(analyticsService);

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

  private setupAnalyticsRoutes(analyticsService: IAnalyticsService): void {
    // Track scan event
    this.app.post('/analytics/track', async (req, res) => {
      try {
        const scanData: TrackScanRequest = {
          ...req.body,
          ipAddress: req.ip
        };
        
        const result = await analyticsService.trackScan(scanData);
        
        const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'SCAN_TRACKING_FAILED');
      }
    });

    // Get QR code analytics
    this.app.get('/analytics/:qrCodeId', async (req, res) => {
      try {
        const request: GetAnalyticsRequest = {
          qrCodeId: req.params.qrCodeId,
          startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day'
        };
        
        const result = await analyticsService.getQRAnalytics(request);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'ANALYTICS_FETCH_FAILED');
      }
    });

    // Export analytics data
    this.app.get('/analytics/:qrCodeId/export', async (req, res) => {
      try {
        const { qrCodeId } = req.params;
        const { format = 'json', startDate, endDate } = req.query;
        
        const result = await analyticsService.exportAnalytics(
          qrCodeId,
          format as 'json' | 'csv',
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        
        if (!result.success) {
          const statusCode = result.error?.statusCode || 500;
          return res.status(statusCode).json(result);
        }

        // Set appropriate headers for file download
        const filename = `analytics-${qrCodeId}-${new Date().toISOString().split('T')[0]}.${format}`;
        const contentType = format === 'csv' ? 'text/csv' : 'application/json';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(result.data);
        
      } catch (error) {
        this.handleRouteError(error, res, 'ANALYTICS_EXPORT_FAILED');
      }
    });

    // Get analytics summary for multiple QR codes (batch endpoint)
    this.app.post('/analytics/batch', async (req, res) => {
      try {
        const { qrCodeIds, startDate, endDate } = req.body;
        
        if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'qrCodeIds must be a non-empty array',
              statusCode: 400
            }
          });
        }

        const promises = qrCodeIds.map(qrCodeId => 
          analyticsService.getQRAnalytics({
            qrCodeId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
          })
        );

        const results = await Promise.all(promises);
        
        const batchResponse = {
          success: true,
          data: results.reduce((acc, result, index) => {
            acc[qrCodeIds[index]] = result;
            return acc;
          }, {} as Record<string, ServiceResponse<AnalyticsSummary>>)
        };

        res.json(batchResponse);
        
      } catch (error) {
        this.handleRouteError(error, res, 'BATCH_ANALYTICS_FAILED');
      }
    });
  }

  private handleRouteError(error: any, res: express.Response, defaultCode: string): void {
    this.logger.error('Route error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: defaultCode 
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: defaultCode,
          message: 'Internal server error',
          statusCode: 500
        }
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
          dependencies: this.container.getRegisteredTokens()
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

// Initialize and start the application
const analyticsServiceApp = new AnalyticsServiceApplication();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await analyticsServiceApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await analyticsServiceApp.shutdown();
  process.exit(0);
});

// Start the service
analyticsServiceApp.start().catch(error => {
  console.error('Failed to start Analytics Service:', error);
  process.exit(1);
});