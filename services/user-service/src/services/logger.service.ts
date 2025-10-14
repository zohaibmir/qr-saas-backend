import { ILogger } from '../interfaces';

export class Logger implements ILogger {
  private serviceName: string;

  constructor(serviceName: string = 'user-service') {
    this.serviceName = serviceName;
  }

  info(message: string, meta: any = {}): void {
    const logEntry = {
      level: 'info',
      service: this.serviceName,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    console.log(JSON.stringify(logEntry));
  }

  error(message: string, error: any = {}): void {
    const logEntry = {
      level: 'error',
      service: this.serviceName,
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    console.error(JSON.stringify(logEntry));
  }

  warn(message: string, meta: any = {}): void {
    const logEntry = {
      level: 'warn',
      service: this.serviceName,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    console.warn(JSON.stringify(logEntry));
  }

  debug(message: string, meta: any = {}): void {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = {
        level: 'debug',
        service: this.serviceName,
        message,
        timestamp: new Date().toISOString(),
        ...meta
      };
      console.debug(JSON.stringify(logEntry));
    }
  }
}