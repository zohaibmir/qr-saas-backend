/**
 * Environment Configuration for Business Tools Service
 * 
 * Centralized configuration management for custom domains, 
 * SSL management, white labeling, and GDPR compliance features.
 * 
 * @author AI Agent
 * @date 2024
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Also try alternative paths in case the above doesn't work
if (!process.env.DB_PASSWORD) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}
if (!process.env.DB_PASSWORD) {
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
}

export interface BusinessToolsConfig {
  // Server Configuration
  server: {
    port: number;
    host: string;
    nodeEnv: string;
  };

  // Database Configuration
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  };

  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };

  // JWT Configuration
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // Custom Domains Configuration
  domains: {
    defaultTtl: number;
    verificationTimeout: number;
    maxDomainsPerUser: number;
    allowedTlds: string[];
    dnsProviders: {
      cloudflare?: {
        apiToken: string;
        zoneId: string;
      };
      route53?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
      };
    };
  };

  // SSL Configuration
  ssl: {
    provider: 'letsencrypt' | 'cloudflare' | 'custom';
    letsencrypt: {
      email: string;
      staging: boolean;
      keySize: number;
    };
    autoRenewal: {
      enabled: boolean;
      daysBeforeExpiry: number;
      cronSchedule: string;
    };
  };

  // File Upload Configuration
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    uploadPath: string;
    cdnUrl?: string;
  };

  // White Labeling Configuration
  whiteLabel: {
    maxConfigsPerUser: number;
    maxAssetSize: number;
    allowedAssetTypes: string[];
    defaultColors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
  };

  // GDPR Configuration
  gdpr: {
    retentionPeriods: {
      requests: number; // days
      logs: number; // days
      exports: number; // days
    };
    exportFormats: string[];
    maxRequestsPerEmail: number;
    verificationTokenExpiry: number; // hours
    processingDeadline: number; // days (legally required)
    autoDeleteAfterDays: number;
  };

  // Email Configuration
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };

  // External Services
  services: {
    userService: string;
    qrService: string;
    analyticsService: string;
    fileService: string;
    notificationService: string;
  };

  // Security Configuration
  security: {
    encryptionKey: string;
    hashRounds: number;
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
    cors: {
      allowedOrigins: string[];
      allowCredentials: boolean;
    };
  };

  // Monitoring Configuration
  monitoring: {
    metricsEnabled: boolean;
    healthCheckInterval: number;
    alertWebhook?: string;
  };
}

class ConfigManager {
  private config: BusinessToolsConfig;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): BusinessToolsConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3014'),
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development',
      },

      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'qr_saas',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
      },

      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'business-tools:',
      },

      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },

      domains: {
        defaultTtl: parseInt(process.env.DOMAIN_DEFAULT_TTL || '300'),
        verificationTimeout: parseInt(process.env.DOMAIN_VERIFICATION_TIMEOUT || '86400000'), // 24 hours
        maxDomainsPerUser: parseInt(process.env.MAX_DOMAINS_PER_USER || '10'),
        allowedTlds: (process.env.ALLOWED_TLDS || 'com,net,org,io,co,me,app').split(','),
        dnsProviders: {
          cloudflare: process.env.CLOUDFLARE_API_TOKEN ? {
            apiToken: process.env.CLOUDFLARE_API_TOKEN,
            zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
          } : undefined,
          route53: process.env.AWS_ACCESS_KEY_ID ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            region: process.env.AWS_REGION || 'us-east-1',
          } : undefined,
        },
      },

      ssl: {
        provider: (process.env.SSL_PROVIDER as any) || 'letsencrypt',
        letsencrypt: {
          email: process.env.SSL_LETSENCRYPT_EMAIL || 'admin@qr-saas.com',
          staging: process.env.SSL_LETSENCRYPT_STAGING === 'true',
          keySize: parseInt(process.env.SSL_KEY_SIZE || '2048'),
        },
        autoRenewal: {
          enabled: process.env.SSL_AUTO_RENEWAL !== 'false',
          daysBeforeExpiry: parseInt(process.env.SSL_RENEWAL_DAYS_BEFORE || '30'),
          cronSchedule: process.env.SSL_RENEWAL_CRON || '0 2 * * *', // 2 AM daily
        },
      },

      upload: {
        maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760'), // 10MB
        allowedMimeTypes: (process.env.UPLOAD_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml').split(','),
        uploadPath: process.env.UPLOAD_PATH || './uploads',
        cdnUrl: process.env.CDN_URL,
      },

      whiteLabel: {
        maxConfigsPerUser: parseInt(process.env.WHITE_LABEL_MAX_CONFIGS || '5'),
        maxAssetSize: parseInt(process.env.WHITE_LABEL_MAX_ASSET_SIZE || '5242880'), // 5MB
        allowedAssetTypes: (process.env.WHITE_LABEL_ALLOWED_ASSETS || 'logo,favicon,background,email_header').split(','),
        defaultColors: {
          primary: process.env.WHITE_LABEL_DEFAULT_PRIMARY || '#3B82F6',
          secondary: process.env.WHITE_LABEL_DEFAULT_SECONDARY || '#1E40AF',
          accent: process.env.WHITE_LABEL_DEFAULT_ACCENT || '#F59E0B',
          background: process.env.WHITE_LABEL_DEFAULT_BACKGROUND || '#FFFFFF',
          text: process.env.WHITE_LABEL_DEFAULT_TEXT || '#111827',
        },
      },

      gdpr: {
        retentionPeriods: {
          requests: parseInt(process.env.GDPR_REQUEST_RETENTION_DAYS || '90'),
          logs: parseInt(process.env.GDPR_LOG_RETENTION_DAYS || '2555'), // 7 years
          exports: parseInt(process.env.GDPR_EXPORT_RETENTION_DAYS || '30'),
        },
        exportFormats: (process.env.GDPR_EXPORT_FORMATS || 'json,csv,pdf').split(','),
        maxRequestsPerEmail: parseInt(process.env.GDPR_MAX_REQUESTS_PER_EMAIL || '5'),
        verificationTokenExpiry: parseInt(process.env.GDPR_TOKEN_EXPIRY_HOURS || '24'),
        processingDeadline: parseInt(process.env.GDPR_PROCESSING_DEADLINE_DAYS || '30'),
        autoDeleteAfterDays: parseInt(process.env.GDPR_AUTO_DELETE_DAYS || '30'),
      },

      email: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        fromAddress: process.env.SMTP_FROM_ADDRESS || 'noreply@qr-saas.com',
        fromName: process.env.SMTP_FROM_NAME || 'QR SaaS Platform',
      },

      services: {
        userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
        qrService: process.env.QR_SERVICE_URL || 'http://localhost:3002',
        analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003',
        fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
        notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
      },

      security: {
        encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long',
        hashRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        rateLimiting: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        },
        cors: {
          allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3014').split(','),
          allowCredentials: process.env.CORS_ALLOW_CREDENTIALS !== 'false',
        },
      },

      monitoring: {
        metricsEnabled: process.env.METRICS_ENABLED !== 'false',
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
        alertWebhook: process.env.ALERT_WEBHOOK_URL,
      },
    };
  }

  private validateConfiguration(): void {
    const requiredEnvVars = [
      'JWT_SECRET',
      'DB_PASSWORD',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate domain configuration
    if (this.config.domains.maxDomainsPerUser <= 0) {
      throw new Error('MAX_DOMAINS_PER_USER must be greater than 0');
    }

    // Validate SSL configuration
    if (this.config.ssl.letsencrypt.keySize < 2048) {
      throw new Error('SSL_KEY_SIZE must be at least 2048');
    }

    // Validate GDPR configuration
    if (this.config.gdpr.processingDeadline > 30) {
      throw new Error('GDPR_PROCESSING_DEADLINE_DAYS must not exceed 30 days (legal requirement)');
    }
  }

  public getConfig(): BusinessToolsConfig {
    return this.config;
  }

  public isProduction(): boolean {
    return this.config.server.nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.server.nodeEnv === 'development';
  }

  public isTest(): boolean {
    return this.config.server.nodeEnv === 'test';
  }
}

// Create and export singleton instance
const configManager = new ConfigManager();
export default configManager;

// Export commonly used configurations
export const config = configManager.getConfig();
export const isProduction = configManager.isProduction();
export const isDevelopment = configManager.isDevelopment();
export const isTest = configManager.isTest();