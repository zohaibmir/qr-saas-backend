import express from 'express';
import { createPublicRoutes } from './public.routes';
import { PublicController } from '../controllers/public.controller';
import { LandingPageService } from '../services/landing-page.service';
import { PageBuilderService } from '../services/page-builder.service';
import { ABTestingService } from '../services/ab-testing.service';
import { Logger } from '../services/logger.service';

export interface RoutesDependencies {
  landingPageService: LandingPageService;
  pageBuilderService: PageBuilderService;
  abTestingService: ABTestingService;
  logger: Logger;
}

export function createRoutes(deps: RoutesDependencies): express.Router {
  const router = express.Router();

  // Create controllers
  const publicController = new PublicController({
    landingPageService: deps.landingPageService,
    pageBuilderService: deps.pageBuilderService,
    abTestingService: deps.abTestingService,
    logger: deps.logger
  });

  // Mount route groups
  router.use('/api/landing-pages/public', createPublicRoutes({ publicController }));
  
  // Health check for the main service
  router.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'landing-page-service',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '1.0.0'
    });
  });

  return router;
}

export default createRoutes;