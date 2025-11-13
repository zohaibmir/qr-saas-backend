import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { logger, createRequestLogger } from './utils/logger';
import { healthChecker } from './services/health-checker.service';
import { swaggerSpec } from './config/swagger';

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  req.logger = createRequestLogger(requestId);
  
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  req.logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    url: req.url,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await healthChecker.performHealthCheck();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      service: 'data-retention-service',
      version: process.env.npm_package_version || '1.0.0',
      ...healthStatus
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      service: 'data-retention-service',
      error: 'Health check failed'
    });
  }
});

// Detailed health check endpoint
app.get('/health/detailed', async (req, res) => {
  try {
    const detailedStatus = await healthChecker.getDetailedStatus();
    res.json({
      service: 'data-retention-service',
      version: process.env.npm_package_version || '1.0.0',
      ...detailedStatus
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      error: 'Failed to get detailed health status'
    });
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Data Retention Service API',
  swaggerOptions: {
    filter: true,
    showRequestHeaders: true
  }
}));

// API Routes
import policyRoutes from './routes/policy.routes';
import executionRoutes from './routes/execution.routes';

app.use('/api/v1/policies', policyRoutes);
app.use('/api/v1/executions', executionRoutes);
// app.use('/api/v1/archives', archiveRoutes);
// app.use('/api/v1/compliance', complianceRoutes);
// app.use('/api/v1/subject-requests', subjectRequestRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Data Retention Service',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Automated data cleanup and GDPR compliance service',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      policies: '/api/v1/policies',
      executions: '/api/v1/executions',
      archives: '/api/v1/archives',
      compliance: '/api/v1/compliance',
      subjectRequests: '/api/v1/subject-requests'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} was not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /health/detailed',
      'GET /api-docs'
    ]
  });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  const requestLogger = req.logger || logger;
  
  requestLogger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    requestId: req.requestId,
    ...(isDevelopment && { stack: error.stack })
  });
});

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: any;
    }
  }
}

export default app;