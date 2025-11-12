/**
 * Business Tools Service Application
 * 
 * Express application setup for the Business Tools Service.
 * Configures middleware, routes, and dependency injection.
 * 
 * @author AI Agent
 * @date 2024
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/environment.config';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';

export class BusinessToolsApp {
  private app: express.Application;

  constructor() {
    this.app = express();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Create upload directories
      this.ensureUploadDirectories();

      // Configure middleware
      this.configureMiddleware();

      // Configure routes
      this.configureRoutes();

      logger.info('Business Tools Service application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Configure Express middleware
   */
  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy for proper IP handling
    this.app.set('trust proxy', 1);

    // Serve static files from uploads directory
    this.app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    logger.debug('Express middleware configured');
  }

  /**
   * Configure application routes
   */
  private configureRoutes(): void {
    // For now, let's implement basic routes until the dependency injection is properly configured
    
    // Global health check (outside of API versioning)
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Business Tools Service is running',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Service info endpoint for API Gateway (backward compatibility)
    this.app.get('/api/business/info', (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          serviceName: 'Business Tools Service',
          version: process.env.npm_package_version || '1.0.0',
          features: [
            'Custom Domains Management',
            'White Label Configuration', 
            'GDPR Compliance Tools'
          ],
          endpoints: {
            customDomains: '/api/v1/domains',
            whiteLabelConfigs: '/api/v1/white-label',
            gdprCompliance: '/api/v1/gdpr'
          }
        }
      });
    });

    // Basic API v1 routes for testing
    this.app.get('/api/v1/info', (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          serviceName: 'Business Tools Service',
          version: process.env.npm_package_version || '1.0.0',
          availableEndpoints: [
            'GET /api/v1/domains',
            'POST /api/v1/domains',
            'GET /api/v1/white-label',
            'POST /api/v1/white-label',
            'GET /api/v1/gdpr',
            'POST /api/v1/gdpr'
          ]
        }
      });
    });

    // Basic domain routes
    this.app.get('/api/v1/domains', (req, res) => {
      res.status(200).json({
        success: true,
        data: [],
        message: 'Custom domains endpoint - implementation in progress'
      });
    });

    // Basic white label routes
    this.app.get('/api/v1/white-label', (req, res) => {
      res.status(200).json({
        success: true,
        data: {},
        message: 'White label endpoint - implementation in progress'
      });
    });

    // Basic GDPR routes
    this.app.get('/api/v1/gdpr', (req, res) => {
      res.status(200).json({
        success: true,
        data: {},
        message: 'GDPR endpoint - implementation in progress'
      });
    });

    // 404 handler for unmatched routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        statusCode: 404,
        requestedPath: req.originalUrl
      });
    });

    logger.debug('Application routes configured');
  }

  /**
   * Ensure upload directories exist
   */
  private ensureUploadDirectories(): void {
    const uploadDirs = [
      'uploads',
      'uploads/brand-assets',
      'uploads/ssl-certificates',
      'uploads/exports'
    ];

    uploadDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        logger.debug(`Created upload directory: ${dir}`);
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const port = config.server.port;
    const host = config.server.host;

    this.app.listen(port, host, () => {
      logger.info('Business Tools Service started successfully', {
        port,
        host,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Business Tools Service shut down gracefully');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }
}