import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Ensure logs directory exists
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level} [${service || 'data-retention-service'}]: ${message}${metaStr}`;
  })
);

// File format (structured JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.metadata()
);

// Create the logger
export const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'data-retention-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Separate file for data retention operations
    new winston.transports.File({
      filename: path.join(logDir, 'retention.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      level: 'info'
    })
  ],
  
  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  
  // Handle promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Add request ID to logs when available
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// Specific logger for retention operations
export const retentionLogger = logger.child({ 
  component: 'retention-engine',
  logType: 'retention-operation'
});

// Specific logger for compliance operations
export const complianceLogger = logger.child({ 
  component: 'compliance-engine',
  logType: 'compliance-operation'
});

// Export child loggers for different components
export const componentLoggers = {
  scheduler: logger.child({ component: 'scheduler' }),
  archive: logger.child({ component: 'archive' }),
  policy: logger.child({ component: 'policy-engine' }),
  cleanup: logger.child({ component: 'cleanup' }),
  audit: logger.child({ component: 'audit' }),
  health: logger.child({ component: 'health-check' })
};

// Performance timing utility
export const timeOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  logger: winston.Logger = retentionLogger
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    logger.info(`Operation completed`, {
      operation: operationName,
      duration: `${duration}ms`,
      status: 'success'
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Operation failed`, {
      operation: operationName,
      duration: `${duration}ms`,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export default logger;