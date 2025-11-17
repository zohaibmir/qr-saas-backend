import { Request, Response, NextFunction } from 'express';
import { IHealthChecker, AppError } from '../interfaces';
import { Logger } from '../services/logger.service';

/**
 * Health Controller
 * 
 * Handles HTTP requests for service health checks
 * - Service health status
 * - Database connectivity
 * - Dependency health checks
 */
export class HealthController {
  constructor(
    private healthChecker: IHealthChecker,
    private logger: Logger
  ) {}

  /**
   * Get service health status
   * GET /health
   */
  checkHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.healthChecker.checkHealth();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        success: true,
        data: health
      });
    } catch (error) {
      this.handleControllerError(error, res, next, 'HEALTH_CHECK_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('Health controller error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: defaultCode 
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: defaultCode,
          message: 'Health check failed',
          statusCode: 503
        }
      });
    }
  }
}

/**
 * Factory function to create health controller with dependencies
 */
export const createHealthController = (
  healthChecker: IHealthChecker,
  logger: Logger
): HealthController => {
  return new HealthController(healthChecker, logger);
};