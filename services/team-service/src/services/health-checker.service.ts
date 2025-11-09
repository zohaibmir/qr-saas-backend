import { IHealthChecker, ILogger } from '../interfaces';
import { DatabaseConnection } from '../config/database.config';
import { serviceConfig } from '../config';

export class HealthChecker implements IHealthChecker {
  private logger: ILogger;
  private databaseConnection: DatabaseConnection;

  constructor(logger: ILogger, databaseConnection: DatabaseConnection) {
    this.logger = logger;
    this.databaseConnection = databaseConnection;
  }

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    service: string;
    timestamp: string;
    dependencies: Record<string, any>;
  }> {
    const timestamp = new Date().toISOString();
    const dependencies: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      dependencies.database = dbHealth;
      
      if (dbHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (dbHealth.status === 'degraded') {
        overallStatus = 'degraded';
      }

      // Check external services health
      const servicesHealth = await this.checkExternalServices();
      dependencies.external_services = servicesHealth;
      
      // If any external service is down, mark as degraded (not unhealthy)
      if (servicesHealth.some((service: any) => service.status === 'unhealthy')) {
        if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }

      // Check memory usage
      const memoryHealth = this.checkMemoryHealth();
      dependencies.memory = memoryHealth;
      
      if (memoryHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      }

      this.logger.debug('Health check completed', {
        status: overallStatus,
        dependencies
      });

      return {
        status: overallStatus,
        service: serviceConfig.serviceName,
        timestamp,
        dependencies
      };

    } catch (error: any) {
      this.logger.error('Health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        service: serviceConfig.serviceName,
        timestamp,
        dependencies: {
          error: error.message
        }
      };
    }
  }

  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    connections?: any;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const isConnected = await this.databaseConnection.testConnection();
      const responseTime = Date.now() - startTime;

      if (!isConnected) {
        return {
          status: 'unhealthy',
          error: 'Database connection failed'
        };
      }

      const connections = await this.databaseConnection.healthCheck();
      
      // Consider degraded if response time is high or connection pool is stressed
      const isDegraded = responseTime > 1000 || 
                        connections.totalConnections > 15 || 
                        connections.waitingCount > 5;

      return {
        status: isDegraded ? 'degraded' : 'healthy',
        responseTime,
        connections
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  private async checkExternalServices(): Promise<Array<{
    name: string;
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }>> {
    const services = [
      { name: 'user-service', url: `${serviceConfig.services.userService}/health` },
      { name: 'notification-service', url: `${serviceConfig.services.notificationService}/health` },
      { name: 'qr-service', url: `${serviceConfig.services.qrService}/health` },
      { name: 'analytics-service', url: `${serviceConfig.services.analyticsService}/health` }
    ];

    const healthChecks = services.map(async (service) => {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(service.url, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        return {
          name: service.name,
          status: response.ok ? 'healthy' as const : 'unhealthy' as const,
          responseTime
        };

      } catch (error: any) {
        return {
          name: service.name,
          status: 'unhealthy' as const,
          error: error.message
        };
      }
    });

    return Promise.all(healthChecks);
  }

  private checkMemoryHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    usage: {
      used: number;
      total: number;
      percentage: number;
    };
  } {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const percentage = (usedMemory / totalMemory) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (percentage > 90) {
      status = 'unhealthy';
    } else if (percentage > 75) {
      status = 'degraded';
    }

    return {
      status,
      usage: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round(percentage * 100) / 100
      }
    };
  }
}