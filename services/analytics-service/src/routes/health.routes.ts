import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

/**
 * Health Routes
 * 
 * Defines routes for service health checks
 */
export class HealthRoutes {
  private router: Router;

  constructor(private healthController: HealthController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.router.get('/health', this.healthController.checkHealth);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create health routes with dependencies
 */
export const createHealthRoutes = (
  healthController: HealthController
): HealthRoutes => {
  return new HealthRoutes(healthController);
};