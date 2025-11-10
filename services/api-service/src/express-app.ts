import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { DependencyContainerService } from './services/dependency-container.service';
import { apiServiceSwaggerDoc } from './config/swagger.config';

export class ExpressApp {
    private app: Express;
    private container: DependencyContainerService;

    constructor() {
        this.app = express();
        this.container = DependencyContainerService.getInstance();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmet());
        
        // CORS configuration
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(bodyParser.json({ limit: '50mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

        // Request logging
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        // Swagger documentation
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiServiceSwaggerDoc, {
            explorer: true,
            customSiteTitle: 'QR SaaS API Service Documentation',
            customCss: '.swagger-ui .topbar { display: none }',
            customfavIcon: '/favicon.ico'
        }));

        // API documentation JSON
        this.app.get('/api-docs.json', (req: Request, res: Response) => {
            res.json(apiServiceSwaggerDoc);
        });

        // Health check
        this.app.get('/health', (req: Request, res: Response) => {
            res.json({
                status: 'healthy',
                service: 'api-service',
                timestamp: new Date().toISOString()
            });
        });

        // Setup API routes after container is initialized
        this.setupApiRoutes();
    }

    private setupApiRoutes(): void {
        // Import routes dynamically to ensure container is ready
        import('./routes/api-key.routes').then(({ createApiKeyRoutes }) => {
            this.app.use('/api/v1/keys', createApiKeyRoutes());
            console.log('[ExpressApp] API Key routes registered');
        }).catch(error => {
            console.error('[ExpressApp] Failed to setup API Key routes:', error);
        });

        import('./routes/webhook.routes').then(({ createWebhookRoutes }) => {
            this.app.use('/api/v1/webhooks', createWebhookRoutes());
            console.log('[ExpressApp] Webhook routes registered');
        }).catch(error => {
            console.error('[ExpressApp] Failed to setup Webhook routes:', error);
        });

        import('./routes/public-api.routes').then(({ createPublicApiRoutes }) => {
            this.app.use('/api/v1/public', createPublicApiRoutes());
            console.log('[ExpressApp] Public API routes registered');
        }).catch(error => {
            console.error('[ExpressApp] Failed to setup Public API routes:', error);
        });

        import('./routes/sdk.routes').then((sdkRoutes) => {
            this.app.use('/api/v1/sdks', sdkRoutes.default);
            console.log('[ExpressApp] SDK routes registered');
        }).catch(error => {
            console.error('[ExpressApp] Failed to setup SDK routes:', error);
        });
    }

    private setupErrorHandling(): void {
        // 404 handler
        this.app.use('*', (req: Request, res: Response) => {
            res.status(404).json({
                error: 'Route not found',
                path: req.originalUrl
            });
        });

        // Global error handler
        this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
            console.error('Global error handler:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });
    }

    public getApp(): Express {
        return this.app;
    }
}