/**
 * GDPR Compliance Controller
 * 
 * HTTP request handlers for GDPR compliance management including data requests,
 * consent management, privacy settings, and audit logging. Implements required
 * GDPR data protection rights and compliance workflows.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response } from 'express';
import '../types/express.d'; // Import type extensions
import { 
  IGDPRService,
  ILogger,
  CreateGDPRRequest,
  UpdateConsentRequest,
  UpdatePrivacySettingsRequest,
  GDPRRequestType
} from '../interfaces';

export class GDPRController {
  constructor(
    private gdprService: IGDPRService,
    private logger: ILogger
  ) {}

  /**
   * Submit a GDPR data request
   * POST /api/business/gdpr/requests
   */
  async createDataRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const { requestType, description, dataTypes } = req.body;

      // Validate required fields
      if (!requestType) {
        res.status(400).json({
          success: false,
          error: 'Request type is required',
          statusCode: 400
        });
        return;
      }

      const validTypes: GDPRRequestType[] = ['export', 'delete', 'rectify', 'restrict', 'object', 'portability'];
      if (!validTypes.includes(requestType)) {
        res.status(400).json({
          success: false,
          error: `Invalid request type. Must be one of: ${validTypes.join(', ')}`,
          statusCode: 400
        });
        return;
      }

      const requestData: CreateGDPRRequest = {
        requestType,
        requesterEmail: req.user?.email || '',
        requestDetails: {
          description: description?.trim(),
          dataTypes: Array.isArray(dataTypes) ? dataTypes.filter(type => type.trim()) : [],
          requestedBy: req.body.requestedBy || 'data_subject',
          urgency: req.body.urgency || 'normal',
          preferredFormat: req.body.preferredFormat || 'json',
          notificationPreference: req.body.notificationPreference || 'email'
        },
        requestedData: req.body.requestedData || {}
      };

      const result = await this.gdprService.createDataRequest(requestData);

      this.logger.info('GDPR data request creation processed', {
        userId,
        requestType,
        success: result.success,
        statusCode: result.statusCode
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in createDataRequest controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        requestType: req.body?.requestType
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get a specific data request
   * GET /api/business/gdpr/requests/:requestId
   */
  async getDataRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!requestId) {
        res.status(400).json({
          success: false,
          error: 'Request ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.gdprService.getDataRequest(requestId);

      this.logger.debug('GDPR data request retrieval processed', {
        userId,
        requestId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getDataRequest controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        requestId: req.params?.requestId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get all data requests for authenticated user
   * GET /api/business/gdpr/requests
   */
  async getUserDataRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      // Parse query parameters for filtering
      const requestType = req.query.requestType as GDPRRequestType;
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get user requests by calling the data processing history method
      const result = await this.gdprService.getDataProcessingHistory(userId, {
        page: Math.floor(offset / limit) + 1,
        limit
      });

      this.logger.debug('User GDPR data requests retrieval processed', {
        userId,
        filters: { requestType, status, limit, offset },
        success: result.success,
        totalRequests: result.meta?.total
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getUserDataRequests controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Update user consent settings
   * POST /api/business/gdpr/consent
   */
  async updateConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const { consentType, granted, consentText, legalBasis, source } = req.body;

      // Validate required fields
      if (!consentType || granted === undefined) {
        res.status(400).json({
          success: false,
          error: 'Consent type and granted status are required',
          statusCode: 400
        });
        return;
      }

      const validConsentTypes = ['marketing', 'analytics', 'functional', 'personalization', 'third_party'];
      if (!validConsentTypes.includes(consentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid consent type. Must be one of: ${validConsentTypes.join(', ')}`,
          statusCode: 400
        });
        return;
      }

      const consentRequest: UpdateConsentRequest = {
        consentType,
        consentGiven: Boolean(granted),
        consentVersion: req.body.consentVersion || '1.0',
        legalBasis: legalBasis || 'consent',
        source: source || 'user_action'
      };

      const result = await this.gdprService.updateConsent(userId, consentRequest);

      this.logger.info('User consent update processed', {
        userId,
        consentType,
        granted: consentRequest.consentGiven,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in updateConsent controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        consentType: req.body?.consentType
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get user consent settings
   * GET /api/business/gdpr/consent
   */
  async getConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const consentType = req.query.consentType as string;
      const result = await this.gdprService.getUserConsents(userId);

      this.logger.debug('User consent retrieval processed', {
        userId,
        consentType,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getConsent controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Update privacy settings
   * PUT /api/business/gdpr/privacy-settings
   */
  async updatePrivacySettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const updates: UpdatePrivacySettingsRequest = {};

      // Map request body to privacy settings
      const settingsFields = [
        'analyticsTracking', 'marketingEmails', 'thirdPartySharing', 'dataRetentionDays',
        'cookiePreferences', 'notificationPreferences', 'exportFormat'
      ];

      let hasUpdates = false;
      settingsFields.forEach(field => {
        if (req.body[field] !== undefined) {
          (updates as any)[field] = req.body[field];
          hasUpdates = true;
        }
      });

      if (!hasUpdates) {
        res.status(400).json({
          success: false,
          error: 'No valid privacy settings provided for update',
          statusCode: 400
        });
        return;
      }

      // Validate specific field formats
      if (updates.dataRetentionDays && updates.dataRetentionDays < 1) {
        res.status(400).json({
          success: false,
          error: 'Data retention period must be at least 1 day',
          statusCode: 400
        });
        return;
      }

      const result = await this.gdprService.updatePrivacySettings(userId, updates);

      this.logger.info('Privacy settings update processed', {
        userId,
        updatedFields: Object.keys(updates),
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in updatePrivacySettings controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get privacy settings
   * GET /api/business/gdpr/privacy-settings
   */
  async getPrivacySettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const result = await this.gdprService.getPrivacySettings(userId);

      this.logger.debug('Privacy settings retrieval processed', {
        userId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getPrivacySettings controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Export user data
   * POST /api/business/gdpr/export
   */
  async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const { format, dataTypes, includeMetadata, password } = req.body;

      const validFormats = ['json', 'csv', 'xml', 'pdf'];
      const exportFormat = format || 'json';
      
      if (!validFormats.includes(exportFormat)) {
        res.status(400).json({
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
          statusCode: 400
        });
        return;
      }

      const result = await this.gdprService.exportUserData(userId, exportFormat);

      this.logger.info('User data export request processed', {
        userId,
        format: exportFormat,
        dataTypes: dataTypes || 'all',
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in exportUserData controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get processing activity logs
   * GET /api/business/gdpr/processing-logs
   */
  async getProcessingLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      // Parse query parameters
      const activityType = req.query.activityType as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.gdprService.getDataProcessingHistory(userId, {
        page: Math.floor(offset / limit) + 1,
        limit
      });

      this.logger.debug('Processing activity logs retrieval processed', {
        userId,
        filters: { activityType, startDate, endDate, limit, offset },
        success: result.success,
        totalLogs: result.meta?.total
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getProcessingLogs controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Log data processing activity
   * POST /api/business/gdpr/processing-logs
   */
  async logProcessingActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      const { activityType, dataProcessed, legalBasis, purpose, thirdParties, retentionPeriod } = req.body;

      // Validate required fields
      if (!activityType || !dataProcessed || !legalBasis || !purpose) {
        res.status(400).json({
          success: false,
          error: 'Activity type, data processed, legal basis, and purpose are required',
          statusCode: 400
        });
        return;
      }

      const validActivityTypes = ['collection', 'processing', 'storage', 'transfer', 'deletion', 'access', 'rectification'];
      if (!validActivityTypes.includes(activityType)) {
        res.status(400).json({
          success: false,
          error: `Invalid activity type. Must be one of: ${validActivityTypes.join(', ')}`,
          statusCode: 400
        });
        return;
      }

      const result = await this.gdprService.logDataProcessing({
        userId,
        activityType,
        dataCategories: dataProcessed,
        legalBasis,
        purpose,
        processor: 'system',
        processingDetails: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        },
        retentionPeriod,
        automatedDecision: false,
        thirdPartyTransfers: thirdParties || []
      });

      this.logger.info('Data processing activity logged', {
        userId,
        activityType,
        dataProcessed,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in logProcessingActivity controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        activityType: req.body?.activityType
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get compliance report (simplified version)
   * GET /api/business/gdpr/compliance-report
   */
  async getComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      // For now, return basic compliance information
      const consentsResult = await this.gdprService.getUserConsents(userId);
      const privacyResult = await this.gdprService.getPrivacySettings(userId);
      const processingResult = await this.gdprService.getDataProcessingHistory(userId, {
        page: 1,
        limit: 100
      });

      const complianceReport = {
        userId,
        reportGenerated: new Date().toISOString(),
        consents: consentsResult.data || [],
        privacySettings: privacyResult.data,
        processingHistory: processingResult.data || [],
        complianceScore: this.calculateComplianceScore(consentsResult.data || [], privacyResult.data)
      };

      this.logger.info('GDPR compliance report generated', {
        userId,
        success: true
      });

      res.status(200).json({
        success: true,
        data: complianceReport,
        statusCode: 200
      });
    } catch (error) {
      this.logger.error('Error in getComplianceReport controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  // Helper method to calculate compliance score
  private calculateComplianceScore(consents: any[], privacySettings: any): number {
    let score = 0;
    const maxScore = 100;

    // Basic scoring logic
    if (consents && consents.length > 0) score += 30;
    if (privacySettings) score += 40;
    if (privacySettings?.analyticsTracking === false) score += 15;
    if (privacySettings?.marketingEmails === false) score += 15;

    return Math.min(score, maxScore);
  }
}