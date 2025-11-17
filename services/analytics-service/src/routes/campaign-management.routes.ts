import { Router } from 'express';
import { CampaignManagementController } from '../controllers/campaign-management.controller';
import { requireAuth } from '../middleware/auth.middleware';

/**
 * Campaign Management Routes
 * 
 * Defines routes for campaign management with Auth System 2.0
 */
export class CampaignManagementRoutes {
  private router: Router;

  constructor(private campaignController: CampaignManagementController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All campaign operations require authentication (Clean Architecture principle)
    this.router.use(requireAuth);
    
    // Campaign CRUD operations
    this.router.post('/', this.campaignController.createCampaign);
    this.router.get('/', this.campaignController.getCampaigns);
    this.router.put('/:id', this.campaignController.updateCampaign);
    this.router.delete('/:id', this.campaignController.deleteCampaign);
    
    // Campaign analytics
    this.router.get('/:id/analytics', this.campaignController.getCampaignAnalytics);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create campaign management routes with dependencies
 */
export const createCampaignManagementRoutes = (
  campaignController: CampaignManagementController
): CampaignManagementRoutes => {
  return new CampaignManagementRoutes(campaignController);
};