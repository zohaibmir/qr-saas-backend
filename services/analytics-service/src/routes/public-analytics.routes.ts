import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

/**
 * Public Analytics Routes
 * 
 * These endpoints are available without authentication
 * Used for tracking QR scans and basic public analytics
 */
export class PublicAnalyticsRoutes {
  private router: Router;

  constructor(private analyticsController: AnalyticsController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public endpoints - no auth required
    
    // Track QR scan (guest users can track scans)
    this.router.post('/track', this.analyticsController.trackScan);
    
    // Health check
    this.router.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          service: 'analytics-service',
          status: 'healthy',
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create public analytics routes
 */
export const createPublicAnalyticsRoutes = (
  analyticsController: AnalyticsController
): PublicAnalyticsRoutes => {
  return new PublicAnalyticsRoutes(analyticsController);
};