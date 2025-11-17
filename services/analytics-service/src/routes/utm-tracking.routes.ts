import { Router } from 'express';
import { UTMTrackingController } from '../controllers/utm-tracking.controller';

/**
 * UTM Tracking Routes
 * 
 * Defines routes for UTM tracking
 */
export class UTMTrackingRoutes {
  private router: Router;

  constructor(private utmController: UTMTrackingController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // UTM tracking
    this.router.post('/track', this.utmController.trackUTM);
    this.router.get('/analytics', this.utmController.getUTMAnalytics);
    this.router.get('/attribution/:campaignId', this.utmController.getCampaignAttribution);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create UTM tracking routes with dependencies
 */
export const createUTMTrackingRoutes = (
  utmController: UTMTrackingController
): UTMTrackingRoutes => {
  return new UTMTrackingRoutes(utmController);
};