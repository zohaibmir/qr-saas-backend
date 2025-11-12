import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config/environment.config';

// Ensure logs directory exists
const logsDir = path.resolve(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry: any = {
      timestamp,
      level: level.toUpperCase(),
      service: 'business-tools-service',
      message
    };
    
    if (stack) {
      logEntry.stack = stack;
    }
    
    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const baseLog = `${timestamp} [${level}] ${message}`;
    return stack ? `${baseLog}\n${stack}` : baseLog;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
transports.push(
  new winston.transports.Console({
    level: config.server.nodeEnv === 'development' ? 'debug' : 'info',
    format: config.server.nodeEnv === 'development' ? consoleFormat : logFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// File transport (only in production)
if (config.server.nodeEnv === 'production') {
  const logFilePath = path.join(logsDir, 'business-tools-service.log');
  
  transports.push(
    new winston.transports.File({
      filename: logFilePath,
      level: 'info',
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  );
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'business-tools-service.error.log'),
      level: 'error',
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.server.nodeEnv === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test'
});

// Add request logging helper
interface RequestLogData {
  method: string;
  url: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

const logRequest = (data: RequestLogData): void => {
  const { method, url, userId, ip, userAgent, duration, statusCode, error } = data;
  
  const logData = {
    type: 'request',
    method,
    url,
    userId,
    ip,
    userAgent,
    duration,
    statusCode,
    ...(error && { error })
  };
  
  if (error || (statusCode && statusCode >= 400)) {
    logger.error('Request failed', logData);
  } else {
    logger.info('Request completed', logData);
  }
};

// Add business activity logging helper
interface BusinessActivityData {
  userId: string;
  activity: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  error?: string;
}

const logBusinessActivity = (data: BusinessActivityData): void => {
  const logData = {
    type: 'business_activity',
    ...data
  };
  
  if (data.error || data.success === false) {
    logger.warn('Business activity failed', logData);
  } else {
    logger.info('Business activity', logData);
  }
};

// Add domain verification logging helper
interface DomainVerificationData {
  domainId: string;
  domain: string;
  verificationType: string;
  status: string;
  attempts: number;
  duration?: number;
  error?: string;
}

const logDomainVerification = (data: DomainVerificationData): void => {
  const logData = {
    type: 'domain_verification',
    ...data
  };
  
  if (data.status === 'failed') {
    logger.error('Domain verification failed', logData);
  } else if (data.status === 'success') {
    logger.info('Domain verification successful', logData);
  } else {
    logger.debug('Domain verification attempt', logData);
  }
};

// Add SSL certificate logging helper
interface SSLCertificateData {
  domainId: string;
  domain: string;
  action: 'provision' | 'renew' | 'revoke';
  provider: string;
  status: string;
  expiresAt?: Date;
  duration?: number;
  error?: string;
}

const logSSLCertificate = (data: SSLCertificateData): void => {
  const logData = {
    type: 'ssl_certificate',
    ...data
  };
  
  if (data.status === 'failed') {
    logger.error('SSL certificate operation failed', logData);
  } else if (data.status === 'active') {
    logger.info('SSL certificate operation successful', logData);
  } else {
    logger.debug('SSL certificate operation', logData);
  }
};

// Add GDPR request logging helper
interface GDPRRequestData {
  requestId: string;
  requestType: string;
  requesterEmail: string;
  userId?: string;
  status: string;
  processingTime?: number;
  dataCategories?: string[];
  error?: string;
}

const logGDPRRequest = (data: GDPRRequestData): void => {
  const logData = {
    type: 'gdpr_request',
    ...data
  };
  
  if (data.status === 'rejected' || data.error) {
    logger.warn('GDPR request processing issue', logData);
  } else if (data.status === 'completed') {
    logger.info('GDPR request completed', logData);
  } else {
    logger.info('GDPR request update', logData);
  }
};

// Add performance logging helper
interface PerformanceData {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

const logPerformance = (data: PerformanceData): void => {
  const logData = {
    type: 'performance',
    ...data
  };
  
  if (!data.success) {
    logger.error('Performance issue', logData);
  } else if (data.duration > 1000) {
    logger.warn('Slow operation', logData);
  } else {
    logger.debug('Performance metric', logData);
  }
};

// Add service communication logging helper
interface ServiceLogData {
  service: string;
  operation: string;
  url: string;
  method: string;
  duration: number;
  statusCode?: number;
  success: boolean;
  error?: string;
  retries?: number;
}

const logServiceCall = (data: ServiceLogData): void => {
  const logData = {
    type: 'service_call',
    ...data
  };
  
  if (!data.success) {
    logger.error('Service call failed', logData);
  } else if (data.duration > 2000) {
    logger.warn('Slow service call', logData);
  } else {
    logger.debug('Service call', logData);
  }
};

export {
  logger,
  logRequest,
  logBusinessActivity,
  logDomainVerification,
  logSSLCertificate,
  logGDPRRequest,
  logPerformance,
  logServiceCall
};