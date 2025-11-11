import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config/environment.config';

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.filePath);
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
      service: config.serviceName,
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
if (config.logging.enableConsole) {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: config.environment === 'development' ? consoleFormat : logFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// File transport
if (config.logging.enableFile) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.filePath,
      level: config.logging.level,
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
      filename: config.logging.filePath.replace('.log', '.error.log'),
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
  level: config.logging.level,
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
  adminId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

const logRequest = (data: RequestLogData): void => {
  const { method, url, userId, adminId, ip, userAgent, duration, statusCode, error } = data;
  
  const logData = {
    type: 'request',
    method,
    url,
    userId,
    adminId,
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

// Add admin activity logging helper
interface AdminActivityData {
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  error?: string;
}

const logAdminActivity = (data: AdminActivityData): void => {
  const logData = {
    type: 'admin_activity',
    ...data
  };
  
  if (data.error || data.success === false) {
    logger.warn('Admin activity failed', logData);
  } else {
    logger.info('Admin activity', logData);
  }
};

// Add security event logging helper
interface SecurityEventData {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'account_lockout' | 'permission_denied' | 'token_refresh' | 'logout';
  adminId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
  attempts?: number;
}

const logSecurityEvent = (data: SecurityEventData): void => {
  const logData = {
    ...data,
    eventType: 'security_event'
  };
  
  if (data.type === 'login_failure' || data.type === 'account_lockout' || data.type === 'permission_denied') {
    logger.warn('Security event', logData);
  } else {
    logger.info('Security event', logData);
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
  logAdminActivity,
  logSecurityEvent,
  logPerformance,
  logServiceCall
};