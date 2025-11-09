import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function createOrganizationRoutes(organizationController: OrganizationController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware);

  // User's organizations - MUST come before /:organizationId route
  router.get('/', organizationController.getUserOrganizations.bind(organizationController));
  
  // Organization CRUD routes
  router.post('/', organizationController.createOrganization.bind(organizationController));
  router.get('/:organizationId', organizationController.getOrganization.bind(organizationController));
  router.put('/:organizationId', organizationController.updateOrganization.bind(organizationController));
  router.delete('/:organizationId', organizationController.deleteOrganization.bind(organizationController));

  return router;
}