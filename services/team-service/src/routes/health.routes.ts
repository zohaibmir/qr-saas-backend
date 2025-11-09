import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

export function createHealthRoutes(healthController: HealthController): Router {
  const router = Router();

  // Health check routes don't require authentication
  router.get('/', healthController.checkHealth.bind(healthController));
  router.get('/readiness', healthController.checkReadiness.bind(healthController));
  router.get('/liveness', healthController.checkLiveness.bind(healthController));

  return router;
}