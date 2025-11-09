import { ILogger } from '../interfaces';

export class Logger implements ILogger {
  private serviceName: string;
  private environment: string;

  constructor(serviceName = 'team-service', environment = process.env.NODE_ENV || 'development') {
    this.serviceName = serviceName;
    this.environment = environment;
  }

  info(message: string, meta: any = {}): void {
    this.log('info', message, meta);
  }

  error(message: string, error: any = {}): void {
    this.log('error', message, { error: this.formatError(error) });
  }

  warn(message: string, meta: any = {}): void {
    this.log('warn', message, meta);
  }

  debug(message: string, meta: any = {}): void {
    if (this.environment === 'development' || this.environment === 'test') {
      this.log('debug', message, meta);
    }
  }

  private log(level: string, message: string, meta: any = {}): void {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      ...meta,
    };

    // In production, you might want to use a proper logging service
    if (this.environment === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // Development - pretty print
      const colorMap: Record<string, string> = {
        INFO: '\x1b[36m',    // Cyan
        ERROR: '\x1b[31m',   // Red
        WARN: '\x1b[33m',    // Yellow
        DEBUG: '\x1b[35m',   // Magenta
      };
      
      const color = colorMap[level.toUpperCase()] || '\x1b[0m';
      const reset = '\x1b[0m';
      
      console.log(
        `${color}[${timestamp}] ${level.toUpperCase()} [${this.serviceName}]${reset} ${message}`,
        Object.keys(meta).length > 0 ? meta : ''
      );
    }
  }

  private formatError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).details && { details: (error as any).details }
      };
    }
    
    if (typeof error === 'string') {
      return { message: error };
    }
    
    return error;
  }
}