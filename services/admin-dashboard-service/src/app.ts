import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { config } from './config/environment.config';
import { errorHandler } from './middleware/error-handler.middleware';
import { adminAuth } from './middleware/admin-auth.middleware';
import { ipRestriction } from './middleware/ip-restriction.middleware';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import contentRoutes from './routes/content.routes';
import usersRoutes from './routes/users.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.security.rateLimitWindow / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Login rate limiting (more strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per window
  message: {
    error: 'Too many login attempts, please try again in 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// IP Restriction middleware (apply to all routes for maximum security)
app.use(ipRestriction());

// Logging middleware
if (config.environment === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint (no auth required)
app.use('/health', healthRoutes);

// Authentication routes (no auth required)
app.use('/auth', loginLimiter, authRoutes);

// API Routes (require authentication)
app.use('/api/dashboard', adminAuth, dashboardRoutes);
app.use('/api/content', adminAuth, contentRoutes);
app.use('/api/users', adminAuth, usersRoutes);
app.use('/api/analytics', adminAuth, analyticsRoutes);
app.use('/api/admin', adminAuth, adminRoutes);

// Serve static files for production UI
if (config.environment === 'production') {
  const uiPath = path.join(__dirname, '../ui/build');
  app.use(express.static(uiPath));
  
  // Serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });
}

// Development UI proxy (handled by React dev server)
if (config.environment === 'development') {
  app.get('/', (req, res) => {
    res.json({
      service: 'QR SaaS Admin Dashboard API',
      version: '1.0.0',
      environment: config.environment,
      uiUrl: 'http://localhost:3014',
      documentation: '/api-docs'
    });
  });
}

// API documentation
if (config.swagger.enabled) {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger.config');
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpec);
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist on this server.',
    availableEndpoints: [
      '/health',
      '/auth/login',
      '/api/dashboard',
      '/api/content',
      '/api/users',
      '/api/analytics',
      '/api/admin'
    ]
  });
});

// Global error handler
app.use(errorHandler);

export default app;