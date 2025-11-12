/**
 * Custom Domains Routes
 * 
 * Express router configuration for custom domain management endpoints.
 * Includes authentication middleware, request validation, and proper error handling.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Router } from 'express';
import { CustomDomainsController } from '../controllers/custom-domains.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  createDomainSchema, 
  updateDomainSchema, 
  domainIdSchema 
} from '../middleware/validation-schemas';

export function createCustomDomainsRoutes(controller: CustomDomainsController): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * POST /domains
   * Create a new custom domain
   */
  router.post(
    '/domains',
    validateRequest(createDomainSchema),
    controller.createDomain.bind(controller)
  );

  /**
   * GET /domains/:domainId
   * Get a specific domain by ID
   */
  router.get(
    '/domains/:domainId',
    validateRequest(domainIdSchema, 'params'),
    controller.getDomain.bind(controller)
  );

  /**
   * GET /domains
   * Get all domains for the authenticated user
   */
  router.get('/domains', controller.getUserDomains.bind(controller));

  /**
   * PUT /domains/:domainId
   * Update a specific domain
   */
  router.put(
    '/domains/:domainId',
    validateRequest(domainIdSchema, 'params'),
    validateRequest(updateDomainSchema),
    controller.updateDomain.bind(controller)
  );

  /**
   * DELETE /domains/:domainId
   * Delete a specific domain
   */
  router.delete(
    '/domains/:domainId',
    validateRequest(domainIdSchema, 'params'),
    controller.deleteDomain.bind(controller)
  );

  /**
   * POST /domains/:domainId/verify
   * Start domain verification process
   */
  router.post(
    '/domains/:domainId/verify',
    validateRequest(domainIdSchema, 'params'),
    controller.verifyDomain.bind(controller)
  );

  /**
   * GET /domains/:domainId/verification
   * Check domain verification status
   */
  router.get(
    '/domains/:domainId/verification',
    validateRequest(domainIdSchema, 'params'),
    controller.checkDomainVerification.bind(controller)
  );

  /**
   * POST /domains/:domainId/ssl/provision
   * Provision SSL certificate for domain
   */
  router.post(
    '/domains/:domainId/ssl/provision',
    validateRequest(domainIdSchema, 'params'),
    controller.provisionSSL.bind(controller)
  );

  /**
   * POST /domains/:domainId/ssl/renew
   * Renew SSL certificate for domain
   */
  router.post(
    '/domains/:domainId/ssl/renew',
    validateRequest(domainIdSchema, 'params'),
    controller.renewSSLCertificate.bind(controller)
  );

  return router;
}