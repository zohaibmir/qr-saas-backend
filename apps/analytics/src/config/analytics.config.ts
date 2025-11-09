/**
 * Analytics Service Environment Configuration
 * Centralizes all environment variable management following QR Service patterns
 */

export interface AnalyticsConfig {
  // API Configuration
  apiBaseUrl: string;
  analyticsApiBaseUrl: string;
  
  // WebSocket Configuration
  websocketUrl: string;
  websocketPort: number;
  
  // Service Configuration
  servicePort: number;
  serviceHost: string;
  
  // Database Configuration
  databaseUrl: string;
  redisUrl: string;
  
  // Authentication
  authApiUrl: string;
  jwtSecret: string;
  
  // External Services
  ipGeolocationApiKey?: string;
  maxmindLicenseKey?: string;
  
  // Feature Flags
  features: {
    realTimeAnalytics: boolean;
    geographicTracking: boolean;
    conversionTracking: boolean;
    exportFeatures: boolean;
  };
  
  // Rate Limiting
  rateLimits: {
    analyticsPerMinute: number;
    maxWebSocketConnections: number;
  };
  
  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableAnalyticsLogging: boolean;
  };
  
  // Storage
  storage: {
    type: 'local' | 's3' | 'gcs';
    path?: string;
    s3Bucket?: string;
    awsRegion?: string;
  };
  
  // Monitoring
  monitoring: {
    enablePerformanceMonitoring: boolean;
    sentryDsn?: string;
  };
  
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
}

class ConfigManager {
  private config: AnalyticsConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AnalyticsConfig {
    const getEnvVar = (key: string, defaultValue?: string): string => {
      const value = process.env[key] || defaultValue;
      if (!value && !defaultValue) {
        throw new Error(`Environment variable ${key} is required`);
      }
      return value || '';
    };

    const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
      const value = process.env[key];
      if (!value) return defaultValue;
      return value.toLowerCase() === 'true' || value === '1';
    };

    const getNumberEnvVar = (key: string, defaultValue: number): number => {
      const value = process.env[key];
      if (!value) return defaultValue;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    return {
      // API Configuration
      apiBaseUrl: getEnvVar('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000/api'),
      analyticsApiBaseUrl: getEnvVar('NEXT_PUBLIC_ANALYTICS_API_BASE_URL', 'http://localhost:3001/api'),
      
      // WebSocket Configuration
      websocketUrl: getEnvVar('NEXT_PUBLIC_WEBSOCKET_URL', 'ws://localhost:3001/ws'),
      websocketPort: getNumberEnvVar('WEBSOCKET_PORT', 3001),
      
      // Service Configuration
      servicePort: getNumberEnvVar('ANALYTICS_SERVICE_PORT', 3001),
      serviceHost: getEnvVar('ANALYTICS_SERVICE_HOST', 'localhost'),
      
      // Database Configuration
      databaseUrl: getEnvVar('DATABASE_URL', 'postgresql://user:password@localhost:5432/qr_analytics'),
      redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
      
      // Authentication
      authApiUrl: getEnvVar('NEXT_PUBLIC_AUTH_API_URL', 'http://localhost:3000/api/auth'),
      jwtSecret: getEnvVar('JWT_SECRET', 'default-jwt-secret'),
      
      // External Services
      ipGeolocationApiKey: process.env.IPGEOLOCATION_API_KEY,
      maxmindLicenseKey: process.env.MAXMIND_LICENSE_KEY,
      
      // Feature Flags
      features: {
        realTimeAnalytics: getBooleanEnvVar('ENABLE_REAL_TIME_ANALYTICS', true),
        geographicTracking: getBooleanEnvVar('ENABLE_GEOGRAPHIC_TRACKING', true),
        conversionTracking: getBooleanEnvVar('ENABLE_CONVERSION_TRACKING', true),
        exportFeatures: getBooleanEnvVar('ENABLE_EXPORT_FEATURES', true),
      },
      
      // Rate Limiting
      rateLimits: {
        analyticsPerMinute: getNumberEnvVar('ANALYTICS_RATE_LIMIT_PER_MINUTE', 1000),
        maxWebSocketConnections: getNumberEnvVar('WEBSOCKET_MAX_CONNECTIONS', 1000),
      },
      
      // Logging
      logging: {
        level: (getEnvVar('LOG_LEVEL', 'info') as any) || 'info',
        enableAnalyticsLogging: getBooleanEnvVar('ENABLE_ANALYTICS_LOGGING', true),
      },
      
      // Storage
      storage: {
        type: (getEnvVar('STORAGE_TYPE', 'local') as any) || 'local',
        path: process.env.STORAGE_PATH,
        s3Bucket: process.env.AWS_S3_BUCKET,
        awsRegion: process.env.AWS_REGION,
      },
      
      // Monitoring
      monitoring: {
        enablePerformanceMonitoring: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', true),
        sentryDsn: process.env.SENTRY_DSN,
      },
      
      // Environment
      nodeEnv: (getEnvVar('NODE_ENV', 'development') as any) || 'development',
      port: getNumberEnvVar('PORT', 3001),
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate required URLs
    try {
      new URL(this.config.apiBaseUrl);
    } catch {
      errors.push('NEXT_PUBLIC_API_BASE_URL must be a valid URL');
    }

    try {
      new URL(this.config.analyticsApiBaseUrl);
    } catch {
      errors.push('NEXT_PUBLIC_ANALYTICS_API_BASE_URL must be a valid URL');
    }

    // Validate ports
    if (this.config.servicePort < 1 || this.config.servicePort > 65535) {
      errors.push('ANALYTICS_SERVICE_PORT must be between 1 and 65535');
    }

    if (this.config.websocketPort < 1 || this.config.websocketPort > 65535) {
      errors.push('WEBSOCKET_PORT must be between 1 and 65535');
    }

    // Validate storage configuration
    if (this.config.storage.type === 's3' && !this.config.storage.s3Bucket) {
      errors.push('AWS_S3_BUCKET is required when STORAGE_TYPE is s3');
    }

    if (this.config.storage.type === 'local' && !this.config.storage.path) {
      this.config.storage.path = './analytics-exports';
    }

    // Validate log level
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(this.config.logging.level)) {
      errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  public getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  public get<K extends keyof AnalyticsConfig>(key: K): AnalyticsConfig[K] {
    return this.config[key];
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  public isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  public isFeatureEnabled(feature: keyof AnalyticsConfig['features']): boolean {
    return this.config.features[feature];
  }

  public getApiUrl(endpoint: string): string {
    const baseUrl = this.config.analyticsApiBaseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }

  public getWebSocketUrl(): string {
    return this.config.websocketUrl;
  }

  public getDatabaseConfig() {
    return {
      url: this.config.databaseUrl,
      redis: this.config.redisUrl,
    };
  }

  public getStorageConfig() {
    return this.config.storage;
  }

  public getRateLimits() {
    return this.config.rateLimits;
  }

  public getLoggingConfig() {
    return this.config.logging;
  }

  public getMonitoringConfig() {
    return this.config.monitoring;
  }
}

// Create and export singleton instance
const configManager = new ConfigManager();

export default configManager;

// Export commonly used configurations
export const config = configManager.getConfig();
export const apiConfig = {
  baseUrl: config.apiBaseUrl,
  analyticsUrl: config.analyticsApiBaseUrl,
  authUrl: config.authApiUrl,
};
export const websocketConfig = {
  url: config.websocketUrl,
  port: config.websocketPort,
};
export const features = config.features;
export const storage = config.storage;
export const rateLimits = config.rateLimits;

// Helper functions
export const isProduction = () => configManager.isProduction();
export const isDevelopment = () => configManager.isDevelopment();
export const isTest = () => configManager.isTest();
export const isFeatureEnabled = (feature: keyof AnalyticsConfig['features']) => 
  configManager.isFeatureEnabled(feature);
export const getApiUrl = (endpoint: string) => configManager.getApiUrl(endpoint);
export const getWebSocketUrl = () => configManager.getWebSocketUrl();