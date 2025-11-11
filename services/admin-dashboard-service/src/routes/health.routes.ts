import express from 'express';
import { DatabaseService } from '../services/database.service';
import { config } from '../config/environment.config';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const healthData = {
      service: 'Admin Dashboard Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.environment,
      port: config.port
    };

    res.status(200).json(healthData);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      service: 'Admin Dashboard Service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed'
    });
  }
});

/**
 * Detailed health check with dependencies
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();

    // Check database health
    const dbHealth = await DatabaseService.healthCheck();
    const dbStats = DatabaseService.getStats();

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memHealthy = memUsage.heapUsed < (memUsage.heapTotal * 0.9);

    // Overall health status
    const isHealthy = dbHealth.status === 'healthy' && memHealthy;
    const totalTime = Date.now() - startTime;

    const healthData = {
      service: 'Admin Dashboard Service',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.environment,
      port: config.port,
      checkDuration: totalTime,
      dependencies: {
        database: {
          status: dbHealth.status,
          latency: dbHealth.latency,
          error: dbHealth.error,
          connections: dbStats
        },
        memory: {
          status: memHealthy ? 'healthy' : 'unhealthy',
          usage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
          },
          units: 'MB'
        }
      }
    };

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      service: 'Admin Dashboard Service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Database health check
 * GET /health/database
 */
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await DatabaseService.healthCheck();
    const dbStats = DatabaseService.getStats();

    const healthData = {
      service: 'Admin Dashboard Service - Database',
      ...dbHealth,
      timestamp: new Date().toISOString(),
      connections: dbStats
    };

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      service: 'Admin Dashboard Service - Database',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Service connectivity health check
 * GET /health/services
 */
router.get('/services', async (req, res) => {
  try {
    const serviceChecks = await Promise.allSettled([
      checkService('Content Service', config.services.contentService),
      checkService('User Service', config.services.userService),
      checkService('QR Service', config.services.qrService),
      checkService('Analytics Service', config.services.analyticsService),
      checkService('File Service', config.services.fileService),
      checkService('Notification Service', config.services.notificationService),
      checkService('Ecommerce Service', config.services.ecommerceService)
    ]);

    const services = serviceChecks.map((result, index) => {
      const serviceNames = [
        'Content Service',
        'User Service', 
        'QR Service',
        'Analytics Service',
        'File Service',
        'Notification Service',
        'Ecommerce Service'
      ];

      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: serviceNames[index],
          status: 'unhealthy',
          error: result.reason?.message || 'Connection failed'
        };
      }
    });

    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const overallStatus = healthyCount === services.length ? 'healthy' : 'degraded';

    res.status(200).json({
      service: 'Admin Dashboard Service - External Services',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      summary: {
        total: services.length,
        healthy: healthyCount,
        unhealthy: services.length - healthyCount
      },
      services
    });

  } catch (error) {
    logger.error('Service health check failed:', error);
    res.status(503).json({
      service: 'Admin Dashboard Service - External Services',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service connectivity check failed'
    });
  }
});

/**
 * Helper function to check external service health
 */
async function checkService(name: string, url: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    return {
      name,
      status: response.ok ? 'healthy' : 'unhealthy',
      latency,
      statusCode: response.status,
      url: `${url}/health`
    };

  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    return {
      name,
      status: 'unhealthy',
      latency,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
      url: `${url}/health`
    };
  }
}

export default router;