import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface SecurityConfig {
  bcryptSaltRounds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface CORSConfig {
  origin: string[];
  credentials: boolean;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  destination: string;
  baseUrl: string;
}

export interface MediaConfig {
  imageQuality: number;
  thumbnailSizes: string[];
  watermarkEnabled: boolean;
  watermarkPath?: string;
  videoCompressionEnabled: boolean;
}

export interface ContentConfig {
  defaultPostStatus: string;
  allowAnonymousComments: boolean;
  autoApproveComments: boolean;
  maxCommentLength: number;
  excerptMaxLength: number;
}

export interface SEOConfig {
  defaultTitleSuffix: string;
  defaultDescription: string;
  sitemapEnabled: boolean;
  robotsEnabled: boolean;
}

export interface EmailConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  fromName: string;
}

export interface AWSConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  s3Bucket?: string;
  s3PublicUrl?: string;
}

export interface CDNConfig {
  url?: string;
  enabled: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

export interface EditorConfig {
  maxLength: number;
  allowedTags: string[];
  autoSaveInterval: number;
}

export interface SearchConfig {
  enabled: boolean;
  minQueryLength: number;
  maxResults: number;
}

export interface CacheConfig {
  ttl: number;
  enabled: boolean;
}

export interface HealthConfig {
  checkInterval: number;
  checkTimeout: number;
}

class Config {
  public readonly env: string;
  public readonly port: number;
  public readonly serviceName: string;
  public readonly logLevel: string;
  public readonly logFormat: string;

  public readonly database: DatabaseConfig;
  public readonly redis: RedisConfig;
  public readonly jwt: JWTConfig;
  public readonly security: SecurityConfig;
  public readonly cors: CORSConfig;
  public readonly upload: UploadConfig;
  public readonly media: MediaConfig;
  public readonly content: ContentConfig;
  public readonly seo: SEOConfig;
  public readonly email: EmailConfig;
  public readonly aws: AWSConfig;
  public readonly cdn: CDNConfig;
  public readonly analytics: AnalyticsConfig;
  public readonly editor: EditorConfig;
  public readonly search: SearchConfig;
  public readonly cache: CacheConfig;
  public readonly health: HealthConfig;

  constructor() {
    // Basic configuration
    this.env = process.env.NODE_ENV || 'development';
    this.port = parseInt(process.env.PORT || '3012', 10);
    this.serviceName = process.env.SERVICE_NAME || 'content-service';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFormat = process.env.LOG_FORMAT || 'json';

    // Database configuration
    this.database = {
      url: process.env.DATABASE_URL || 'postgresql://qr_user:qr_password@localhost:5432/qr_saas',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'qr_saas',
      user: process.env.DB_USER || 'qr_user',
      password: process.env.DB_PASSWORD || 'qr_password',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    };

    // Redis configuration
    this.redis = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '1', 10),
    };

    // JWT configuration
    this.jwt = {
      secret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    };

    // Security configuration
    this.security = {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    };

    // CORS configuration
    this.cors = {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
    };

    // Upload configuration
    this.upload = {
      maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10),
      allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'
      ],
      destination: process.env.UPLOAD_DESTINATION || './uploads',
      baseUrl: process.env.UPLOAD_BASE_URL || 'http://localhost:3012/uploads',
    };

    // Media configuration
    this.media = {
      imageQuality: parseInt(process.env.IMAGE_QUALITY || '85', 10),
      thumbnailSizes: process.env.THUMBNAIL_SIZES?.split(',') || ['150x150', '300x300', '600x600'],
      watermarkEnabled: process.env.IMAGE_WATERMARK_ENABLED === 'true',
      watermarkPath: process.env.IMAGE_WATERMARK_PATH || undefined,
      videoCompressionEnabled: process.env.VIDEO_COMPRESSION_ENABLED === 'true',
    };

    // Content configuration
    this.content = {
      defaultPostStatus: process.env.DEFAULT_POST_STATUS || 'draft',
      allowAnonymousComments: process.env.ALLOW_ANONYMOUS_COMMENTS !== 'false',
      autoApproveComments: process.env.AUTO_APPROVE_COMMENTS === 'true',
      maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH || '1000', 10),
      excerptMaxLength: parseInt(process.env.EXCERPT_MAX_LENGTH || '300', 10),
    };

    // SEO configuration
    this.seo = {
      defaultTitleSuffix: process.env.SEO_DEFAULT_TITLE_SUFFIX || ' - QR Generation SaaS',
      defaultDescription: process.env.SEO_DEFAULT_DESCRIPTION || 'Professional QR code generation platform with advanced features',
      sitemapEnabled: process.env.SEO_SITEMAP_ENABLED !== 'false',
      robotsEnabled: process.env.SEO_ROBOTS_ENABLED !== 'false',
    };

    // Email configuration
    this.email = {
      host: process.env.SMTP_HOST || undefined,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || undefined,
      password: process.env.SMTP_PASSWORD || undefined,
      from: process.env.EMAIL_FROM || 'noreply@qrgeneration.com',
      fromName: process.env.EMAIL_FROM_NAME || 'QR Generation SaaS',
    };

    // AWS configuration
    this.aws = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
      region: process.env.AWS_REGION || 'us-east-1',
      s3Bucket: process.env.AWS_S3_BUCKET || undefined,
      s3PublicUrl: process.env.AWS_S3_PUBLIC_URL || undefined,
    };

    // CDN configuration
    this.cdn = {
      url: process.env.CDN_URL || undefined,
      enabled: process.env.CDN_ENABLED === 'true',
    };

    // Analytics configuration
    this.analytics = {
      enabled: process.env.ANALYTICS_ENABLED !== 'false',
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || undefined,
      facebookPixelId: process.env.FACEBOOK_PIXEL_ID || undefined,
    };

    // Editor configuration
    this.editor = {
      maxLength: parseInt(process.env.EDITOR_MAX_LENGTH || '50000', 10),
      allowedTags: process.env.EDITOR_ALLOWED_TAGS?.split(',') || [
        'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 
        'img', 'a', 'table', 'tbody', 'tr', 'td', 'th'
      ],
      autoSaveInterval: parseInt(process.env.EDITOR_AUTO_SAVE_INTERVAL || '30000', 10),
    };

    // Search configuration
    this.search = {
      enabled: process.env.SEARCH_ENABLED !== 'false',
      minQueryLength: parseInt(process.env.SEARCH_MIN_QUERY_LENGTH || '3', 10),
      maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '20', 10),
    };

    // Cache configuration
    this.cache = {
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
      enabled: process.env.CACHE_ENABLED !== 'false',
    };

    // Health configuration
    this.health = {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      checkTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (this.port < 1000 || this.port > 65535) {
      throw new Error(`Invalid port number: ${this.port}. Must be between 1000 and 65535.`);
    }

    if (this.database.maxConnections < this.database.minConnections) {
      throw new Error('DB_MAX_CONNECTIONS must be greater than or equal to DB_MIN_CONNECTIONS');
    }
  }

  public isDevelopment(): boolean {
    return this.env === 'development';
  }

  public isProduction(): boolean {
    return this.env === 'production';
  }

  public isTest(): boolean {
    return this.env === 'test';
  }
}

export const config = new Config();
export default config;