import { Router } from 'express';
import { HeatmapController } from '../controllers/heatmap.controller';
import { requireAuth, requireSubscriptionTier } from '../middleware/auth.middleware';

/**
 * Heatmap Routes
 * 
 * Analytics with subscription-based access control (same pattern as QR service)
 */
export class HeatmapRoutes {
  private router: Router;

  constructor(private heatmapController: HeatmapController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Basic heatmap (free tier)
    this.router.get('/geographic', requireAuth, this.heatmapController.getGeographicHeatmap);
    
    // Advanced heatmaps (starter tier and above)
    this.router.get('/temporal', requireAuth, requireSubscriptionTier('starter'), this.heatmapController.getTemporalHeatmap);
    this.router.get('/device', requireAuth, requireSubscriptionTier('starter'), this.heatmapController.getDeviceHeatmap);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create heatmap routes with dependencies
 */
export const createHeatmapRoutes = (
  heatmapController: HeatmapController
): HeatmapRoutes => {
  return new HeatmapRoutes(heatmapController);
};