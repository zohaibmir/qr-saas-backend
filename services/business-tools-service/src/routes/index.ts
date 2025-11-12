/**
 * Routes Index
 * 
 * Main router configuration for Business Tools Service.
 * Combines all feature routers and applies global middleware.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Router } from 'express';
import { 
  ICustomDomainsService, 
  IWhiteLabelService, 
  IGDPRService,
  ILogger 
} from '../interfaces';
import { CustomDomainsController } from '../controllers/custom-domains.controller';
import { WhiteLabelController } from '../controllers/white-label.controller';
import { GDPRController } from '../controllers/gdpr.controller';
import { createCustomDomainsRoutes } from './custom-domains.routes';
import { createWhiteLabelRoutes } from './white-label.routes';
import { createGDPRRoutes } from './gdpr.routes';
import { errorHandlerMiddleware } from '../middleware/error-handler.middleware';
import { corsMiddleware } from '../middleware/cors.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

interface RoutesDependencies {
  customDomainsService: ICustomDomainsService;
  whiteLabelService: IWhiteLabelService;
  gdprService: IGDPRService;
  logger: ILogger;
}

export function createMainRouter(dependencies: RoutesDependencies): Router {
  const {
    customDomainsService,
    whiteLabelService,
    gdprService,
    logger
  } = dependencies;

  // Create controllers with service dependencies
  const customDomainsController = new CustomDomainsController(customDomainsService, logger);
  const whiteLabelController = new WhiteLabelController(whiteLabelService, logger);
  const gdprController = new GDPRController(gdprService, logger);

  // Create main router
  const mainRouter = Router();

  // Apply global middleware
  mainRouter.use(corsMiddleware);
  mainRouter.use(rateLimitMiddleware);

  // Health check endpoint (public)
  mainRouter.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Business Tools Service is healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Service info endpoint (public)
  mainRouter.get('/info', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        serviceName: 'Business Tools Service',
        version: process.env.npm_package_version || '1.0.0',
        features: [
          'Custom Domains Management',
          'White Label Configuration',
          'GDPR Compliance Tools'
        ],
        endpoints: {
          customDomains: '/api/business/domains',
          whiteLabelConfigs: '/api/business/white-label',
          gdprCompliance: '/api/business/gdpr'
        }
      }
    });
  });

  // Mount feature routers
  mainRouter.use('/', createCustomDomainsRoutes(customDomainsController));
  mainRouter.use('/', createWhiteLabelRoutes(whiteLabelController));
  mainRouter.use('/', createGDPRRoutes(gdprController));

  // Apply error handling middleware last
  mainRouter.use(errorHandlerMiddleware);

  return mainRouter;
}