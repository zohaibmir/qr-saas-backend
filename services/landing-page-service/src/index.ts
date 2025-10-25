import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import clean architecture components
import { 
  IHealthChecker
} from './interfaces';
import { Logger } from './services/logger.service';
import { DependencyContainer } from './services/dependency-container.service';
import { DatabaseConfig } from './config/database.config';
import { HealthChecker } from './services/health-checker.service';

dotenv.config({ path: '../../.env' });

class LandingPageServiceApplication {
  private app: express.Application;
  private container: DependencyContainer;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.container = new DependencyContainer();
    this.logger = new Logger('landing-page-service');
    
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
      
      // TODO: Register repositories and services once created
      // const landingPageRepository = new LandingPageRepository(database, this.logger);
      // const landingPageService = new LandingPageService(landingPageRepository, this.logger);
      
      const healthChecker = new HealthChecker(this.logger);
      this.container.register('healthChecker', healthChecker);
      
      this.logger.info('Landing Page Service dependencies initialized', {
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
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
          fontSrc: ["'self'", "fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
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
      max: 200, // Higher limit for landing page service due to form submissions
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
    this.app.use((req, _res, next) => {
      const requestId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      
      this.logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      _res.setHeader('X-Request-ID', requestId);
      next();
    });
  }

  private setupRoutes(): void {
    const healthChecker = this.container.resolve<IHealthChecker>('healthChecker');

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
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

    // Root endpoint - Service information
    this.app.get('/', async (_req, res) => {
      res.status(200).json({
        success: true,
        service: 'landing-page-service',
        version: '1.0.0',
        description: 'QR Code Landing Page Management Service',
        features: [
          'Landing Page Builder',
          'A/B Testing',
          'Form Integration',
          'Mobile Optimization',
          'Social Sharing',
          'Custom Domains',
          'Analytics Tracking'
        ],
        endpoints: {
          health: 'GET /health',
          pages: 'GET /pages, POST /pages',
          templates: 'GET /templates',
          forms: 'POST /pages/:pageId/forms',
          abTests: 'POST /pages/:pageId/ab-tests',
          analytics: 'GET /pages/:pageId/analytics',
          domains: 'POST /domains',
          public: 'GET /p/:slug, GET /preview/:pageId'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Landing Page routes
    this.setupLandingPageRoutes();
    
    // Template routes
    this.setupTemplateRoutes();
    
    // Form routes
    this.setupFormRoutes();
    
    // A/B Testing routes
    this.setupABTestRoutes();
    
    // Analytics routes
    this.setupAnalyticsRoutes();
    
    // Social Sharing routes
    this.setupSocialSharingRoutes();
    
    // Custom Domain routes
    this.setupCustomDomainRoutes();

    // Public landing page access route
    this.setupPublicRoutes();

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

  private setupLandingPageRoutes(): void {
    // TODO: Implement when service is ready
    // For now, create placeholder routes
    
    // Create Landing Page
    this.app.post('/pages', async (_req, res) => {
      try {
        // const userId = this.extractUserId(req); // TODO: Implement user authentication
        
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Landing page service not yet implemented',
            statusCode: 501
          }
        });
        
      } catch (error) {
        this.handleRouteError(error, res, 'PAGE_CREATION_FAILED');
      }
    });

    // Get user's landing pages
    this.app.get('/pages', async (_req, res) => {
      try {
        // const userId = this.extractUserId(req); // TODO: Implement user authentication
        
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Landing page service not yet implemented',
            statusCode: 501
          }
        });
        
      } catch (error) {
        this.handleRouteError(error, res, 'PAGES_FETCH_FAILED');
      }
    });

    // Get landing page by ID
    this.app.get('/pages/:id', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Landing page service not yet implemented',
            statusCode: 501
          }
        });
        
      } catch (error) {
        this.handleRouteError(error, res, 'PAGE_FETCH_FAILED');
      }
    });

    // Update landing page
    this.app.put('/pages/:id', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Landing page service not yet implemented',
            statusCode: 501
          }
        });
        
      } catch (error) {
        this.handleRouteError(error, res, 'PAGE_UPDATE_FAILED');
      }
    });

    // Delete landing page
    this.app.delete('/pages/:id', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Landing page service not yet implemented',
            statusCode: 501
          }
        });
        
      } catch (error) {
        this.handleRouteError(error, res, 'PAGE_DELETE_FAILED');
      }
    });

    // Publish/Unpublish landing page
    this.app.put('/pages/:id/publish', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Landing page service not yet implemented',
            statusCode: 501
          }
        });
        
      } catch (error) {
        this.handleRouteError(error, res, 'PAGE_PUBLISH_FAILED');
      }
    });
  }

  private setupTemplateRoutes(): void {
    // Get all templates
    this.app.get('/templates', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Template service not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'TEMPLATES_FETCH_FAILED');
      }
    });

    // Get template by ID
    this.app.get('/templates/:id', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Template service not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'TEMPLATE_FETCH_FAILED');
      }
    });
  }

  private setupFormRoutes(): void {
    // Create form
    this.app.post('/pages/:pageId/forms', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Form service not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'FORM_CREATION_FAILED');
      }
    });

    // Submit form
    this.app.post('/forms/:formId/submit', async (_req, res) => {
      try {
        // TODO: Use actual service - this is high priority for MVP
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Form submission not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'FORM_SUBMISSION_FAILED');
      }
    });

    // Get form submissions
    this.app.get('/forms/:formId/submissions', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Form submissions not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'SUBMISSIONS_FETCH_FAILED');
      }
    });
  }

  private setupABTestRoutes(): void {
    // Create A/B test
    this.app.post('/pages/:pageId/ab-tests', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'A/B testing not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'AB_TEST_CREATION_FAILED');
      }
    });

    // Start/Stop A/B test
    this.app.put('/ab-tests/:testId/:action', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'A/B testing not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'AB_TEST_ACTION_FAILED');
      }
    });
  }

  private setupAnalyticsRoutes(): void {
    // Get page analytics
    this.app.get('/pages/:pageId/analytics', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Analytics not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'ANALYTICS_FETCH_FAILED');
      }
    });

    // Track event
    this.app.post('/pages/:pageId/track', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Event tracking not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'EVENT_TRACKING_FAILED');
      }
    });
  }

  private setupSocialSharingRoutes(): void {
    // Get social sharing config
    this.app.get('/pages/:pageId/social', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Social sharing not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'SOCIAL_CONFIG_FETCH_FAILED');
      }
    });

    // Update social sharing config
    this.app.put('/pages/:pageId/social', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Social sharing not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'SOCIAL_CONFIG_UPDATE_FAILED');
      }
    });
  }

  private setupCustomDomainRoutes(): void {
    // Add custom domain
    this.app.post('/domains', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Custom domains not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'DOMAIN_CREATION_FAILED');
      }
    });

    // Verify custom domain
    this.app.post('/domains/:domainId/verify', async (_req, res) => {
      try {
        // TODO: Use actual service
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Domain verification not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'DOMAIN_VERIFICATION_FAILED');
      }
    });
  }

  private setupPublicRoutes(): void {
    // Public landing page access (this is critical for MVP)
    this.app.get('/p/:slug', async (_req, res) => {
      try {
        // TODO: Render landing page HTML
        // This is a high-priority route for public access to landing pages
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Public page rendering not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'PUBLIC_PAGE_RENDER_FAILED');
      }
    });

    // Public landing page preview
    this.app.get('/preview/:pageId', async (_req, res) => {
      try {
        // TODO: Render preview HTML
        res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Page preview not yet implemented',
            statusCode: 501
          }
        });
      } catch (error) {
        this.handleRouteError(error, res, 'PAGE_PREVIEW_FAILED');
      }
    });
  }

  // private extractUserId(req: express.Request): string {
  //   // TODO: Implement proper user authentication
  //   // For now, return a placeholder
  //   return 'user_placeholder';
  // }

  private handleRouteError(error: any, res: express.Response, errorCode: string): void {
    this.logger.error(`Route error: ${errorCode}`, {
      error: error.message,
      stack: error.stack,
      errorCode
    });

    res.status(500).json({
      success: false,
      error: errorCode,
      message: 'Internal server error occurred',
      timestamp: new Date().toISOString()
    });
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
    const PORT = process.env.LANDING_PAGE_PORT || 3010;

    try {
      // Test database connection
      const dbHealthy = await DatabaseConfig.testConnection();
      if (!dbHealthy) {
        throw new Error('Database connection failed');
      }

      this.app.listen(PORT, () => {
        this.logger.info('🚀 Landing Page Service started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          architecture: 'Clean Architecture with SOLID Principles',
          features: [
            'Landing Page Builder',
            'A/B Testing',
            'Form Integration', 
            'Mobile Optimization',
            'Social Sharing',
            'Custom Domains',
            'Analytics Tracking'
          ]
        });
      });

    } catch (error) {
      this.logger.error('Failed to start Landing Page Service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Landing Page Service gracefully...');
    
    try {
      await DatabaseConfig.close();
      this.logger.info('Landing Page Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

// Initialize and start the application
const landingPageServiceApp = new LandingPageServiceApplication();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await landingPageServiceApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await landingPageServiceApp.shutdown();
  process.exit(0);
});

// Start the service
landingPageServiceApp.start().catch(error => {
  console.error('Failed to start Landing Page Service:', error);
  process.exit(1);
});