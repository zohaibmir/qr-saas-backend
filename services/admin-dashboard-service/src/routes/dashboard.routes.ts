import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { ServiceAggregatorService } from '../services/service-aggregator.service';
import { AdminService } from '../services/admin.service';

const router = express.Router();

/**
 * Dashboard Overview
 * GET /api/dashboard
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await ServiceAggregatorService.getDashboardOverview();
    
    // Log admin activity
    if (req.admin) {
      await AdminService.logActivity(
        req.admin.id,
        'view',
        'dashboard',
        'overview',
        undefined,
        req.ip,
        req.get('User-Agent'),
        result.success
      );
    }
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to load dashboard overview'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Dashboard overview service error'
    });
  }
}));

/**
 * System Metrics
 * GET /api/dashboard/metrics
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  try {
    const healthResult = await ServiceAggregatorService.checkServicesHealth();
    
    // Log admin activity
    if (req.admin) {
      await AdminService.logActivity(
        req.admin.id,
        'view',
        'dashboard',
        'metrics',
        undefined,
        req.ip,
        req.get('User-Agent'),
        healthResult.success
      );
    }
    
    res.status(200).json({
      success: true,
      data: {
        servicesHealth: healthResult.data,
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'System metrics service error'
    });
  }
}));

export default router;