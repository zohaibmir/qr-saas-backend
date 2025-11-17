import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

/**
 * Analytics Routes
 * 
 * Defines routes for analytics tracking and retrieval
 */
export class AnalyticsRoutes {
  private router: Router;

  constructor(private analyticsController: AnalyticsController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Track scan event
    this.router.post('/track', this.analyticsController.trackScan);

    // Get user analytics (must come before /:qrCodeId to avoid conflict)
    this.router.get('/user', this.analyticsController.getUserAnalytics);

    // Get analytics summary for multiple QR codes (batch endpoint)
    this.router.post('/batch', this.analyticsController.getBatchAnalytics);

    // Export analytics data (must come before /:qrCodeId to avoid conflict)
    this.router.get('/:qrCodeId/export', this.analyticsController.exportAnalytics);

    // Get QR code analytics (must come last due to catch-all nature)
    this.router.get('/:qrCodeId', this.analyticsController.getQRAnalytics);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create analytics routes with dependencies
 */
export const createAnalyticsRoutes = (
  analyticsController: AnalyticsController
): AnalyticsRoutes => {
  return new AnalyticsRoutes(analyticsController);
};