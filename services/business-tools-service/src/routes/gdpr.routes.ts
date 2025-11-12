/**
 * GDPR Routes
 * 
 * Express router configuration for GDPR compliance management endpoints.
 * Includes authentication, request validation, and comprehensive data protection endpoints.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Router } from 'express';
import { GDPRController } from '../controllers/gdpr.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createDataRequestSchema,
  updateConsentSchema,
  updatePrivacySettingsSchema,
  requestIdSchema,
  logProcessingSchema,
  exportDataSchema
} from '../middleware/validation-schemas';

export function createGDPRRoutes(controller: GDPRController): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // ===============================================
  // Data Request Management
  // ===============================================

  /**
   * POST /gdpr/requests
   * Submit a new GDPR data request
   */
  router.post(
    '/gdpr/requests',
    validateRequest(createDataRequestSchema),
    controller.createDataRequest.bind(controller)
  );

  /**
   * GET /gdpr/requests/:requestId
   * Get a specific data request
   */
  router.get(
    '/gdpr/requests/:requestId',
    validateRequest(requestIdSchema, 'params'),
    controller.getDataRequest.bind(controller)
  );

  /**
   * GET /gdpr/requests
   * Get all data requests for authenticated user
   */
  router.get('/gdpr/requests', controller.getUserDataRequests.bind(controller));

  // ===============================================
  // Consent Management
  // ===============================================

  /**
   * POST /gdpr/consent
   * Update user consent settings
   */
  router.post(
    '/gdpr/consent',
    validateRequest(updateConsentSchema),
    controller.updateConsent.bind(controller)
  );

  /**
   * GET /gdpr/consent
   * Get user consent settings
   */
  router.get('/gdpr/consent', controller.getConsent.bind(controller));

  // ===============================================
  // Privacy Settings
  // ===============================================

  /**
   * PUT /gdpr/privacy-settings
   * Update privacy settings
   */
  router.put(
    '/gdpr/privacy-settings',
    validateRequest(updatePrivacySettingsSchema),
    controller.updatePrivacySettings.bind(controller)
  );

  /**
   * GET /gdpr/privacy-settings
   * Get privacy settings
   */
  router.get('/gdpr/privacy-settings', controller.getPrivacySettings.bind(controller));

  // ===============================================
  // Data Export
  // ===============================================

  /**
   * POST /gdpr/export
   * Export user data
   */
  router.post(
    '/gdpr/export',
    validateRequest(exportDataSchema),
    controller.exportUserData.bind(controller)
  );

  // ===============================================
  // Processing Activity Logs
  // ===============================================

  /**
   * GET /gdpr/processing-logs
   * Get processing activity logs
   */
  router.get('/gdpr/processing-logs', controller.getProcessingLogs.bind(controller));

  /**
   * POST /gdpr/processing-logs
   * Log data processing activity
   */
  router.post(
    '/gdpr/processing-logs',
    validateRequest(logProcessingSchema),
    controller.logProcessingActivity.bind(controller)
  );

  // ===============================================
  // Compliance Reporting
  // ===============================================

  /**
   * GET /gdpr/compliance-report
   * Get GDPR compliance report
   */
  router.get('/gdpr/compliance-report', controller.getComplianceReport.bind(controller));

  return router;
}