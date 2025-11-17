import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

/**
 * Health Routes
 * Public routes for service health monitoring
 * No authentication required for health checks
 */

// Basic health check
router.get('/', HealthController.healthCheck);

// Readiness probe
router.get('/ready', HealthController.readinessCheck);

// Liveness probe  
router.get('/live', HealthController.livenessCheck);

export { router as healthRoutes };