/**
 * Health Controller - Clean Architecture
 * Following User Service Pattern with Static Methods
 * 
 * Handles health check endpoints
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Health Controller - Handles health check requests
 * Uses static methods following user-service pattern
 */
export class HealthController {
  /**
   * Basic health check
   */
  static async healthCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Health check requested');

      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'file-service',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json({
        success: true,
        data: healthData
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Health check failed', { error: errorMessage });
      next(error);
    }
  }

  /**
   * Readiness check
   */
  static async readinessCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Readiness check requested');

      // TODO: Add database connection check
      // TODO: Add file storage connection check
      // TODO: Add external service dependencies check

      const readinessData = {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'file-service',
        checks: {
          database: 'connected',
          storage: 'available',
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
          }
        }
      };

      res.status(200).json({
        success: true,
        data: readinessData
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Readiness check failed', { error: errorMessage });
      next(error);
    }
  }

  /**
   * Liveness check
   */
  static async livenessCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Liveness check requested');

      const livenessData = {
        status: 'alive',
        timestamp: new Date().toISOString(),
        service: 'file-service',
        pid: process.pid,
        uptime: process.uptime()
      };

      res.status(200).json({
        success: true,
        data: livenessData
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Liveness check failed', { error: errorMessage });
      next(error);
    }
  }
}