// Domain Entities
export interface ScanEvent {
  id: string;
  qrCodeId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  platform?: string;
  device?: string;
  referrer?: string;
}

export interface AnalyticsSummary {
  totalScans: number;
  uniqueScans: number;
  scansByDate: { date: string; scans: number }[];
  platformBreakdown: { [platform: string]: number };
  deviceBreakdown: { [device: string]: number };
  geographicData: {
    country: string;
    scans: number;
    percentage: number;
  }[];
  timeSeriesData: {
    timestamp: string;
    scans: number;
    uniqueScans: number;
  }[];
}

// Request/Response Types
export interface TrackScanRequest {
  qrCodeId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  platform?: string;
  device?: string;
  referrer?: string;
}

export interface GetAnalyticsRequest {
  qrCodeId: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
}

// Repository Interfaces
export interface IAnalyticsRepository {
  createScanEvent(scanEvent: Omit<ScanEvent, 'id'>): Promise<ScanEvent>;
  getScanEventsByQRCode(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<ScanEvent[]>;
  getAnalyticsSummary(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsSummary>;
  getTotalScansForQRCode(qrCodeId: string): Promise<number>;
  getUniqueScansForQRCode(qrCodeId: string): Promise<number>;
  getScansGroupedByDate(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<{ date: string; scans: number }[]>;
  getPlatformBreakdown(qrCodeId: string): Promise<{ [platform: string]: number }>;
  getDeviceBreakdown(qrCodeId: string): Promise<{ [device: string]: number }>;
  getGeographicData(qrCodeId: string): Promise<{ country: string; scans: number; percentage: number }[]>;
}

// Service Interfaces
export interface IAnalyticsService {
  trackScan(scanData: TrackScanRequest): Promise<ServiceResponse<ScanEvent>>;
  getQRAnalytics(request: GetAnalyticsRequest): Promise<ServiceResponse<AnalyticsSummary>>;
  exportAnalytics(qrCodeId: string, format: 'json' | 'csv', startDate?: Date, endDate?: Date): Promise<ServiceResponse<string>>;
}

// Infrastructure Interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
}

// Common Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  dependencies?: Record<string, any>;
}

// Error Classes
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}