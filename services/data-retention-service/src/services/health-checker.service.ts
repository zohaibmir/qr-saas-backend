import { config } from '../config/database.config';
import { componentLoggers } from '../utils/logger';
import { HealthCheckResult } from '../interfaces';

class HealthCheckerService {
  private startTime: Date;
  private lastHealthCheck: HealthCheckResult | null = null;

  constructor() {
    this.startTime = new Date();
  }

  async initialize(): Promise<void> {
    componentLoggers.health.info('Initializing health checker service');
    
    // Perform initial health check
    await this.performHealthCheck();
    
    // Set up periodic health checks (every 30 seconds)
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        componentLoggers.health.error('Periodic health check failed:', error);
      }
    }, 30000);
    
    componentLoggers.health.info('Health checker service initialized');
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date();
    
    try {
      // Check database connectivity
      const databaseStatus = await this.checkDatabase();
      
      // Check scheduler status (placeholder for now)
      const schedulerStatus = await this.checkScheduler();
      
      // Check storage accessibility
      const storageStatus = await this.checkStorage();
      
      // Get system metrics
      const metrics = await this.getSystemMetrics();
      
      // Determine overall status
      const services = {
        database: databaseStatus,
        scheduler: schedulerStatus,
        storage: storageStatus
      };
      
      const hasUnhealthyService = Object.values(services).includes('unhealthy');
      const status = hasUnhealthyService ? 'unhealthy' : 'healthy';
      
      const healthResult: HealthCheckResult = {
        status,
        timestamp,
        services,
        metrics
      };
      
      this.lastHealthCheck = healthResult;
      
      if (status !== 'healthy') {
        componentLoggers.health.warn('Health check failed', { healthResult });
      } else {
        componentLoggers.health.debug('Health check passed', { healthResult });
      }
      
      return healthResult;
      
    } catch (error) {
      const healthResult: HealthCheckResult = {
        status: 'unhealthy',
        timestamp,
        services: {
          database: 'unhealthy',
          scheduler: 'unhealthy',
          storage: 'unhealthy'
        },
        metrics: {
          uptime: this.getUptime(),
          activeConnections: 0,
          pendingJobs: 0
        }
      };
      
      this.lastHealthCheck = healthResult;
      componentLoggers.health.error('Health check error:', error);
      
      return healthResult;
    }
  }

  private async checkDatabase(): Promise<'healthy' | 'unhealthy'> {
    try {
      const client = await config.pool.connect();
      
      // Test basic connectivity
      await client.query('SELECT 1');
      
      // Test data retention tables exist
      const tableCheck = await client.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'data_retention_policies',
          'data_retention_executions',
          'data_retention_archives',
          'data_retention_audit_logs',
          'data_retention_compliance_reports',
          'data_subject_requests'
        )
      `);
      
      client.release();
      
      const tableCount = parseInt(tableCheck.rows[0].table_count, 10);
      if (tableCount < 6) {
        componentLoggers.health.warn(`Expected 6 retention tables, found ${tableCount}`);
        return 'unhealthy';
      }
      
      return 'healthy';
      
    } catch (error) {
      componentLoggers.health.error('Database health check failed:', error);
      return 'unhealthy';
    }
  }

  private async checkScheduler(): Promise<'healthy' | 'unhealthy'> {
    try {
      // For now, just return healthy
      // TODO: Implement actual scheduler health check when scheduler is implemented
      return 'healthy';
    } catch (error) {
      componentLoggers.health.error('Scheduler health check failed:', error);
      return 'unhealthy';
    }
  }

  private async checkStorage(): Promise<'healthy' | 'unhealthy'> {
    try {
      const fs = require('fs').promises;
      
      // Check if logs directory is writable
      const testFile = '/tmp/data-retention-health-test.tmp';
      await fs.writeFile(testFile, 'health check test');
      await fs.unlink(testFile);
      
      return 'healthy';
      
    } catch (error) {
      componentLoggers.health.error('Storage health check failed:', error);
      return 'unhealthy';
    }
  }

  private async getSystemMetrics(): Promise<HealthCheckResult['metrics']> {
    try {
      // Get database pool metrics
      const activeConnections = config.pool.totalCount;
      
      // Calculate uptime
      const uptime = this.getUptime();
      
      // TODO: Get pending jobs count when scheduler is implemented
      const pendingJobs = 0;
      
      // TODO: Get last execution time when policies are running
      const lastExecution = undefined;
      
      return {
        uptime,
        activeConnections,
        pendingJobs,
        lastExecution
      };
      
    } catch (error) {
      componentLoggers.health.error('Failed to get system metrics:', error);
      
      return {
        uptime: this.getUptime(),
        activeConnections: 0,
        pendingJobs: 0
      };
    }
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  async getDetailedStatus(): Promise<{
    health: HealthCheckResult;
    database: {
      totalConnections: number;
      idleConnections: number;
      waitingCount: number;
    };
    memory: {
      used: number;
      total: number;
      free: number;
    };
  }> {
    const health = await this.performHealthCheck();
    
    // Database connection details
    const database = {
      totalConnections: config.pool.totalCount,
      idleConnections: config.pool.idleCount,
      waitingCount: config.pool.waitingCount
    };
    
    // Memory usage
    const memUsage = process.memoryUsage();
    const memory = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      free: memUsage.heapTotal - memUsage.heapUsed
    };
    
    return {
      health,
      database,
      memory
    };
  }
}

export const healthChecker = new HealthCheckerService();
export default healthChecker;