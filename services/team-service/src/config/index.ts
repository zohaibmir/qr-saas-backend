import { config } from 'dotenv';

// Load environment variables
config();

export interface ServiceConfig {
  // Service settings
  port: number;
  nodeEnv: string;
  serviceName: string;
  version: string;
  
  // Database settings
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
  };
  
  // Redis settings
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };
  
  // JWT settings
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  // External services
  services: {
    userService: string;
    notificationService: string;
    qrService: string;
    analyticsService: string;
  };
  
  // Security settings
  security: {
    corsOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    bcryptRounds: number;
  };
  
  // Business settings
  business: {
    maxOrganizationsPerUser: number;
    maxMembersPerOrganization: number;
    invitationExpiryDays: number;
    defaultRole: string;
  };
  
  // Logging settings
  logging: {
    level: string;
    format: string;
  };
}

// Create configuration object
export const serviceConfig: ServiceConfig = {
  // Service settings
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'team-service',
  version: process.env.npm_package_version || '1.0.0',
  
  // Database settings
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'qr_saas_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },
  
  // Redis settings
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour default
  },
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // External services
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    qrService: process.env.QR_SERVICE_URL || 'http://localhost:3002',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003',
  },
  
  // Security settings
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3010'
    ],
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  
  // Business settings
  business: {
    maxOrganizationsPerUser: parseInt(process.env.MAX_ORGANIZATIONS_PER_USER || '5', 10),
    maxMembersPerOrganization: parseInt(process.env.MAX_MEMBERS_PER_ORGANIZATION || '50', 10),
    invitationExpiryDays: parseInt(process.env.INVITATION_EXPIRY_DAYS || '7', 10),
    defaultRole: process.env.DEFAULT_MEMBER_ROLE || 'viewer',
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
};

// Validation function
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate business rules
  if (serviceConfig.business.maxOrganizationsPerUser < 1) {
    throw new Error('MAX_ORGANIZATIONS_PER_USER must be at least 1');
  }

  if (serviceConfig.business.maxMembersPerOrganization < 1) {
    throw new Error('MAX_MEMBERS_PER_ORGANIZATION must be at least 1');
  }

  if (serviceConfig.business.invitationExpiryDays < 1) {
    throw new Error('INVITATION_EXPIRY_DAYS must be at least 1');
  }

  // Validate JWT secrets in production
  if (serviceConfig.nodeEnv === 'production') {
    if (serviceConfig.jwt.secret.includes('change-in-production')) {
      throw new Error('JWT_SECRET must be changed in production');
    }
    if (serviceConfig.jwt.refreshSecret.includes('change-in-production')) {
      throw new Error('JWT_REFRESH_SECRET must be changed in production');
    }
  }
};

// Helper functions
export const isDevelopment = (): boolean => serviceConfig.nodeEnv === 'development';
export const isProduction = (): boolean => serviceConfig.nodeEnv === 'production';
export const isTest = (): boolean => serviceConfig.nodeEnv === 'test';

// Export individual config sections for easier imports
export const { database: dbConfig } = serviceConfig;
export const { redis: redisConfig } = serviceConfig;
export const { jwt: jwtConfig } = serviceConfig;
export const { services: servicesConfig } = serviceConfig;
export const { security: securityConfig } = serviceConfig;
export const { business: businessConfig } = serviceConfig;
export const { logging: loggingConfig } = serviceConfig;