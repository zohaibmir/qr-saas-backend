import { Router } from 'express';
import { PeakTimeAnalysisController } from '../controllers/peak-time-analysis.controller';

/**
 * Peak Time Analysis Routes
 * 
 * Defines routes for peak time analysis
 */
export class PeakTimeAnalysisRoutes {
  private router: Router;

  constructor(private peakTimeController: PeakTimeAnalysisController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Peak time analysis
    this.router.get('/analysis', this.peakTimeController.getPeakTimeAnalysis);
    this.router.get('/optimal', this.peakTimeController.getOptimalTimes);
    this.router.get('/hourly', this.peakTimeController.getHourlyActivity);
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create peak time analysis routes with dependencies
 */
export const createPeakTimeAnalysisRoutes = (
  peakTimeController: PeakTimeAnalysisController
): PeakTimeAnalysisRoutes => {
  return new PeakTimeAnalysisRoutes(peakTimeController);
};