import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  duration?: number;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: string;
    message: string;
    timestamp: Date;
    duration?: number;
  }>;
  uptime: number;
  version: string;
}

export class HealthService {
  private dbPool: Pool;
  private startTime: Date;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.startTime = new Date();
  }

  async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.dbPool.query('SELECT 1');
      return {
        status: 'healthy',
        message: 'Database connection is working',
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    }
  }

  async checkFileSystem(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../../uploads');
      await fs.access(uploadPath);
      return {
        status: 'healthy',
        message: 'File system is accessible',
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    }
  }

  async checkMemoryUsage(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100;
      const usage = (heapUsedMB / heapTotalMB) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(usage)}%)`;

      if (usage > 90) {
        status = 'unhealthy';
        message += ' - Critical memory usage';
      } else if (usage > 75) {
        status = 'degraded';
        message += ' - High memory usage';
      }

      return {
        status,
        message,
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    }
  }

  async getServiceHealth(): Promise<ServiceHealthStatus> {
    const [dbCheck, fsCheck, memCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkFileSystem(),
      this.checkMemoryUsage(),
    ]);

    const checks = [
      { name: 'database', ...dbCheck },
      { name: 'filesystem', ...fsCheck },
      { name: 'memory', ...memCheck },
    ];

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (checks.some(check => check.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (checks.some(check => check.status === 'degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks,
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  isHealthy(): Promise<boolean> {
    return this.getServiceHealth().then(health => health.status === 'healthy');
  }
}