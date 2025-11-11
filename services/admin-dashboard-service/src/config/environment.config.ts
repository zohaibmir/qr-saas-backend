import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  // Server Configuration
  port: number;
  environment: string;
  serviceName: string;
  
  // Database Configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeoutMillis: number;
  };
  
  // Authentication Configuration
  auth: {
    jwtSecret: string;
    jwtExpiryHours: number;
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
  
  // Security Configuration
  security: {
    rateLimitWindow: number;
    rateLimitMax: number;
    sessionSecret: string;
    cookieSecure: boolean;
    cookieMaxAge: number;
  };
  
  // CORS Configuration
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
  };
  
  // Redis Configuration (optional)
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    enabled: boolean;
  };
  
  // Service URLs
  services: {
    userService: string;
    qrService: string;
    analyticsService: string;
    fileService: string;
    notificationService: string;
    contentService: string;
    ecommerceService: string;
  };
  
  // File Upload Configuration
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    uploadPath: string;
  };
  
  // Logging Configuration
  logging: {
    level: string;
    format: string;
    enableConsole: boolean;
    enableFile: boolean;
    filePath: string;
  };
  
  // Swagger Configuration
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
  };
}

const config: Config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3013', 10),
  environment: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'admin-dashboard-service',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'qr_saas',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },
  
  // Authentication Configuration
  auth: {
    jwtSecret: process.env.ADMIN_JWT_SECRET || 'your-admin-jwt-secret-change-in-production',
    jwtExpiryHours: parseInt(process.env.ADMIN_JWT_EXPIRY_HOURS || '8', 10),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  },
  
  // Security Configuration
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || '86400000', 10), // 24 hours
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3014', 'http://localhost:3000'] 
        : false,
    credentials: true,
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    enabled: process.env.REDIS_ENABLED === 'true',
  },
  
  // Service URLs
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    qrService: process.env.QR_SERVICE_URL || 'http://localhost:3002',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003',
    fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    contentService: process.env.CONTENT_SERVICE_URL || 'http://localhost:3012',
    ecommerceService: process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:3007',
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/json'
    ],
    uploadPath: process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'),
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    enableConsole: process.env.ENABLE_CONSOLE_LOGS !== 'false',
    enableFile: process.env.ENABLE_FILE_LOGS === 'true',
    filePath: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/admin-dashboard.log'),
  },
  
  // Swagger Configuration
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'QR SaaS Admin Dashboard API',
    description: 'Comprehensive admin dashboard API for QR SaaS platform management',
    version: '1.0.0',
  },
};

// Validation
const requiredEnvVars = [
  'ADMIN_JWT_SECRET',
  'SESSION_SECRET',
];

if (config.environment === 'production') {
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });
  
  // Additional production validations
  if (config.auth.jwtSecret.includes('change-in-production')) {
    throw new Error('JWT secret must be changed in production');
  }
  
  if (config.security.sessionSecret.includes('change-in-production')) {
    throw new Error('Session secret must be changed in production');
  }
}

export { config };