import { Router } from 'express';
import { SuperAdminAnalyticsController } from '../controllers/super-admin-analytics.controller';

/**
 * Super Admin Analytics Routes
 * 
 * Defines routes for super admin analytics
 */
export class SuperAdminAnalyticsRoutes {
  private router: Router;

  constructor(private superAdminAnalyticsController: SuperAdminAnalyticsController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Super Admin Analytics endpoint - aggregated system-wide analytics from database (GET)
    this.router.get('/super-admin', this.superAdminAnalyticsController.getSuperAdminAnalytics);

    // Super Admin Analytics endpoint - aggregated system-wide analytics from database (POST)
    this.router.post('/super-admin', this.superAdminAnalyticsController.getSuperAdminAnalyticsFiltered);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create super admin analytics routes with dependencies
 */
export const createSuperAdminAnalyticsRoutes = (
  superAdminAnalyticsController: SuperAdminAnalyticsController
): SuperAdminAnalyticsRoutes => {
  return new SuperAdminAnalyticsRoutes(superAdminAnalyticsController);
};