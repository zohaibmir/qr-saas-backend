import { IHealthChecker, ILogger, IDependencyContainer, HealthStatus } from '../interfaces';

export class HealthChecker implements IHealthChecker {
  constructor(
    private logger: ILogger,
    private container: IDependencyContainer
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const dependencies: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check database connection
      try {
        const database = this.container.resolve<any>('database');
        const dbStartTime = Date.now();
        
        // Test database connection with a simple query
        await database.query('SELECT 1');
        
        dependencies.database = {
          status: 'healthy',
          responseTime: Date.now() - dbStartTime
        };
      } catch (error) {
        this.logger.error('Database health check failed', { error });
        dependencies.database = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        overallStatus = 'unhealthy';
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      dependencies.memory = {
        status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'degraded',
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      };

      if (dependencies.memory.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }

      // Check uptime
      dependencies.uptime = {
        status: 'healthy',
        seconds: Math.floor(process.uptime()),
        formatted: this.formatUptime(process.uptime())
      };

      const totalTime = Date.now() - startTime;
      
      this.logger.info('Health check completed', {
        status: overallStatus,
        responseTime: totalTime,
        dependencyCount: Object.keys(dependencies).length
      });

      return {
        status: overallStatus,
        service: 'analytics-service',
        timestamp: new Date().toISOString(),
        dependencies
      };

    } catch (error) {
      this.logger.error('Health check failed', { error });
      
      return {
        status: 'unhealthy',
        service: 'analytics-service',
        timestamp: new Date().toISOString(),
        dependencies: {
          error: {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      };
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}