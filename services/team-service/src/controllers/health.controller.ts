import { Request, Response } from 'express';
import { IHealthChecker, ILogger } from '../interfaces';


export class HealthController {
  private healthChecker: IHealthChecker;
  private logger: ILogger;

  constructor(healthChecker: IHealthChecker, logger: ILogger) {
    this.healthChecker = healthChecker;
    this.logger = logger;
  }

  // GET /health
  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthChecker.checkHealth();

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status !== 'unhealthy',
        data: health
      });

    } catch (error: any) {
      this.logger.error('Error in health check controller', { error: error.message });
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          service: 'team-service',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        }
      });
    }
  }

  // GET /health/ready
  async checkReadiness(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthChecker.checkHealth();
      
      // Service is ready if it's healthy or degraded (but not unhealthy)
      const isReady = health.status !== 'unhealthy';

      if (isReady) {
        res.status(200).json({
          success: true,
          data: {
            status: 'ready',
            service: 'team-service',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(503).json({
          success: false,
          data: {
            status: 'not-ready',
            service: 'team-service',
            timestamp: new Date().toISOString(),
            reason: 'Service is unhealthy'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in readiness check controller', { error: error.message });
      res.status(503).json({
        success: false,
        data: {
          status: 'not-ready',
          service: 'team-service',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed'
        }
      });
    }
  }

  // GET /health/live
  async checkLiveness(req: Request, res: Response): Promise<void> {
    try {
      // Simple liveness check - if we can respond, we're alive
      res.status(200).json({
        success: true,
        data: {
          status: 'alive',
          service: 'team-service',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }
      });

    } catch (error: any) {
      this.logger.error('Error in liveness check controller', { error: error.message });
      res.status(503).json({
        success: false,
        data: {
          status: 'not-alive',
          service: 'team-service',
          timestamp: new Date().toISOString(),
          error: 'Liveness check failed'
        }
      });
    }
  }
}