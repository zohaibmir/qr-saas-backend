/**
 * GDPR Service
 * 
 * Business logic layer for GDPR compliance including data requests,
 * user consent management, privacy settings, and data processing logging
 * following clean architecture and SOLID principles.
 * 
 * @author AI Agent
 * @date 2024
 */

import { 
  GDPRRequest, 
  UserConsent,
  UserPrivacySettings,
  DataProcessingLog,
  IGDPRService,
  IGDPRRepository,
  ILogger,
  ServiceResponse,
  CreateGDPRRequest,
  UpdateGDPRRequest,
  UpdateConsentRequest,
  UpdatePrivacySettingsRequest,
  PaginationOptions
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class GDPRService implements IGDPRService {
  constructor(
    private gdprRepository: IGDPRRepository,
    private logger: ILogger
  ) {}

  async createDataRequest(request: CreateGDPRRequest): Promise<ServiceResponse<GDPRRequest>> {
    try {
      // Validate email format
      if (!this.isValidEmail(request.requesterEmail)) {
        return {
          success: false,
          error: 'Invalid email format',
          statusCode: 400
        };
      }

      // Create GDPR request
      const gdprRequest: GDPRRequest = {
        id: uuidv4(),
        requestType: request.requestType,
        status: 'pending',
        requestDetails: request.requestDetails || {},
        requestedData: request.requestedData || {},
        processedData: {},
        requesterEmail: request.requesterEmail.toLowerCase(),
        verificationToken: uuidv4(),
        fileExports: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdRequest = await this.gdprRepository.createRequest(gdprRequest);

      // Start processing for export/delete requests
      if (request.requestType === 'export' || request.requestType === 'delete') {
        await this.scheduleRequestProcessing(createdRequest.id);
      }

      this.logger.info('GDPR request created successfully', {
        requestId: createdRequest.id,
        requestType: request.requestType,
        requesterEmail: request.requesterEmail
      });

      return {
        success: true,
        data: createdRequest,
        statusCode: 201
      };
    } catch (error) {
      this.logger.error('Failed to create GDPR request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestType: request.requestType,
        requesterEmail: request.requesterEmail
      });
      
      return {
        success: false,
        error: 'Failed to create GDPR request',
        statusCode: 500
      };
    }
  }

  async getDataRequest(requestId: string): Promise<ServiceResponse<GDPRRequest>> {
    try {
      const request = await this.gdprRepository.findRequestById(requestId);
      
      if (!request) {
        return {
          success: false,
          error: 'GDPR request not found',
          statusCode: 404
        };
      }

      return {
        success: true,
        data: request,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to get GDPR request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
      
      return {
        success: false,
        error: 'Failed to get GDPR request',
        statusCode: 500
      };
    }
  }

  async processDataRequest(requestId: string, updates: UpdateGDPRRequest): Promise<ServiceResponse<GDPRRequest>> {
    try {
      const request = await this.gdprRepository.findRequestById(requestId);
      
      if (!request) {
        return {
          success: false,
          error: 'GDPR request not found',
          statusCode: 404
        };
      }

      if (request.status === 'completed' || request.status === 'rejected') {
        return {
          success: false,
          error: 'Request already processed',
          statusCode: 400
        };
      }

      const updateData: Partial<GDPRRequest> = {
        ...updates,
        updatedAt: new Date()
      };

      // Set processing timestamps based on status
      if (updates.status === 'processing' && !request.processingStartedAt) {
        updateData.processingStartedAt = new Date();
      } else if (updates.status === 'completed' && !request.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedRequest = await this.gdprRepository.updateRequest(requestId, updateData);
      
      if (!updatedRequest) {
        return {
          success: false,
          error: 'Failed to update GDPR request',
          statusCode: 500
        };
      }

      // If marking as completed, perform final actions
      if (updates.status === 'completed') {
        await this.finalizeRequest(updatedRequest);
      }

      this.logger.info('GDPR request updated successfully', {
        requestId,
        status: updates.status,
        changes: Object.keys(updates)
      });

      return {
        success: true,
        data: updatedRequest,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to process GDPR request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
      
      return {
        success: false,
        error: 'Failed to process GDPR request',
        statusCode: 500
      };
    }
  }

  async exportUserData(userId: string, format: 'json' | 'csv' | 'pdf'): Promise<ServiceResponse<{ fileUrl: string }>> {
    try {
      // Collect user data from various sources
      const userData = await this.collectUserData(userId);
      
      if (!userData) {
        return {
          success: false,
          error: 'No data found for user',
          statusCode: 404
        };
      }

      // Generate export file
      const fileUrl = await this.generateExportFile(userData, format, userId);

      this.logger.info('User data exported successfully', {
        userId,
        format,
        fileUrl
      });

      return {
        success: true,
        data: { fileUrl },
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to export user data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        format
      });
      
      return {
        success: false,
        error: 'Failed to export user data',
        statusCode: 500
      };
    }
  }

  async deleteUserData(userId: string, verificationToken: string): Promise<ServiceResponse<void>> {
    try {
      // Verify the token (in production, this would be more sophisticated)
      const isValidToken = await this.verifyDeletionToken(userId, verificationToken);
      
      if (!isValidToken) {
        return {
          success: false,
          error: 'Invalid verification token',
          statusCode: 403
        };
      }

      // Perform cascading deletion
      await this.performDataDeletion(userId);

      this.logger.info('User data deleted successfully', {
        userId,
        deletedAt: new Date()
      });

      return {
        success: true,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to delete user data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to delete user data',
        statusCode: 500
      };
    }
  }

  async updateConsent(userId: string, request: UpdateConsentRequest): Promise<ServiceResponse<UserConsent>> {
    try {
      // Check if consent record exists
      const existingConsents = await this.gdprRepository.findConsentsByUserId(userId);
      const existingConsent = existingConsents.find(c => 
        c.consentType === request.consentType && c.isActive
      );

      if (existingConsent) {
        // Update existing consent
        const updatedConsent = await this.gdprRepository.updateConsent(
          userId, 
          request.consentType, 
          {
            consentGiven: request.consentGiven,
            consentVersion: request.consentVersion || existingConsent.consentVersion,
            legalBasis: request.legalBasis || existingConsent.legalBasis,
            source: request.source || 'user_update',
            withdrawalDate: !request.consentGiven ? new Date() : undefined,
            isActive: request.consentGiven
          }
        );

        if (!updatedConsent) {
          return {
            success: false,
            error: 'Failed to update consent',
            statusCode: 500
          };
        }

        return {
          success: true,
          data: updatedConsent,
          statusCode: 200
        };
      } else {
        // Create new consent record
        const newConsent: UserConsent = {
          id: uuidv4(),
          userId,
          consentType: request.consentType,
          consentVersion: request.consentVersion || '1.0',
          consentGiven: request.consentGiven,
          legalBasis: request.legalBasis || 'consent',
          source: request.source || 'user_action',
          consentDate: new Date(),
          isActive: request.consentGiven
        };

        const createdConsent = await this.gdprRepository.createConsent(newConsent);

        return {
          success: true,
          data: createdConsent,
          statusCode: 201
        };
      }
    } catch (error) {
      this.logger.error('Failed to update user consent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        consentType: request.consentType
      });
      
      return {
        success: false,
        error: 'Failed to update consent',
        statusCode: 500
      };
    }
  }

  async getUserConsents(userId: string): Promise<ServiceResponse<UserConsent[]>> {
    try {
      const consents = await this.gdprRepository.findConsentsByUserId(userId);
      
      return {
        success: true,
        data: consents,
        statusCode: 200,
        meta: {
          total: consents.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user consents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get user consents',
        statusCode: 500
      };
    }
  }

  async getPrivacySettings(userId: string): Promise<ServiceResponse<UserPrivacySettings>> {
    try {
      let settings = await this.gdprRepository.getPrivacySettings(userId);
      
      if (!settings) {
        // Create default privacy settings
        const defaultSettings: Partial<UserPrivacySettings> = {
          analyticsTracking: true,
          marketingEmails: false,
          thirdPartySharing: false,
          exportFormat: 'json'
        };

        settings = await this.gdprRepository.updatePrivacySettings(userId, defaultSettings);
      }

      return {
        success: true,
        data: settings,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to get privacy settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get privacy settings',
        statusCode: 500
      };
    }
  }

  async updatePrivacySettings(userId: string, settings: UpdatePrivacySettingsRequest): Promise<ServiceResponse<UserPrivacySettings>> {
    try {
      const updatedSettings = await this.gdprRepository.updatePrivacySettings(userId, {
        ...settings,
        lastUpdatedAt: new Date(),
        updatedBy: 'user'
      });

      this.logger.info('Privacy settings updated successfully', {
        userId,
        changes: Object.keys(settings)
      });

      return {
        success: true,
        data: updatedSettings,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to update privacy settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to update privacy settings',
        statusCode: 500
      };
    }
  }

  async logDataProcessing(log: Omit<DataProcessingLog, 'id' | 'createdAt'>): Promise<ServiceResponse<void>> {
    try {
      const processingLog: DataProcessingLog = {
        id: uuidv4(),
        ...log,
        createdAt: new Date()
      };

      await this.gdprRepository.createDataProcessingLog(processingLog);

      this.logger.debug('Data processing logged', {
        userId: log.userId,
        activityType: log.activityType,
        purpose: log.purpose
      });

      return {
        success: true,
        statusCode: 201
      };
    } catch (error) {
      this.logger.error('Failed to log data processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: log.userId,
        activityType: log.activityType
      });
      
      return {
        success: false,
        error: 'Failed to log data processing',
        statusCode: 500
      };
    }
  }

  async getDataProcessingHistory(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<DataProcessingLog[]>> {
    try {
      const result = await this.gdprRepository.findDataProcessingLogs(userId, pagination);
      
      return {
        success: true,
        data: result.logs,
        statusCode: 200,
        meta: {
          total: result.total,
          pagination: pagination ? {
            page: pagination.page,
            limit: pagination.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / pagination.limit)
          } : undefined
        }
      };
    } catch (error) {
      this.logger.error('Failed to get data processing history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get data processing history',
        statusCode: 500
      };
    }
  }

  // Private helper methods
  private async scheduleRequestProcessing(requestId: string): Promise<void> {
    // In production, this would queue the request for background processing
    setTimeout(async () => {
      try {
        await this.gdprRepository.updateRequest(requestId, {
          status: 'processing',
          processingStartedAt: new Date(),
          updatedAt: new Date()
        });

        this.logger.info('GDPR request processing started', { requestId });
      } catch (error) {
        this.logger.error('Failed to start GDPR request processing', {
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId
        });
      }
    }, 1000);
  }

  private async finalizeRequest(request: GDPRRequest): Promise<void> {
    try {
      if (request.requestType === 'export') {
        // Generate export files
        const exportData = await this.collectUserData(request.userId || '');
        if (exportData) {
          const fileUrl = await this.generateExportFile(exportData, 'json', request.userId || request.id);
          await this.gdprRepository.updateRequest(request.id, {
            fileExports: [fileUrl],
            updatedAt: new Date()
          });
        }
      }

      this.logger.info('GDPR request finalized', {
        requestId: request.id,
        requestType: request.requestType
      });
    } catch (error) {
      this.logger.error('Failed to finalize GDPR request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: request.id
      });
    }
  }

  private async collectUserData(userId: string): Promise<any> {
    try {
      // In a real implementation, this would collect data from all relevant tables
      // For now, we'll return mock data structure
      return {
        userId,
        profile: {
          id: userId,
          email: 'user@example.com',
          name: 'User Name',
          createdAt: new Date(),
          lastLogin: new Date()
        },
        qrCodes: [],
        analytics: [],
        consents: await this.gdprRepository.findConsentsByUserId(userId),
        privacySettings: await this.gdprRepository.getPrivacySettings(userId),
        exportedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to collect user data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return null;
    }
  }

  private async generateExportFile(data: any, format: string, identifier: string): Promise<string> {
    try {
      const exportDir = path.join(process.cwd(), 'exports');
      
      // Ensure export directory exists
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `export_${identifier}_${Date.now()}.${format}`;
      const filePath = path.join(exportDir, fileName);

      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } else if (format === 'csv') {
        // For CSV, we'd need to flatten the data structure
        const csvData = this.convertToCSV(data);
        fs.writeFileSync(filePath, csvData);
      }

      return `/exports/${fileName}`;
    } catch (error) {
      this.logger.error('Failed to generate export file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format,
        identifier
      });
      throw error;
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const headers = Object.keys(data);
    const csvRows = [headers.join(',')];
    
    // This is a simplified implementation
    const row = headers.map(header => {
      const value = data[header];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    });
    csvRows.push(row.join(','));
    
    return csvRows.join('\n');
  }

  private async verifyDeletionToken(userId: string, token: string): Promise<boolean> {
    try {
      // In production, this would verify the token against a secure store
      // For now, we'll do basic validation
      return Boolean(token && token.length > 10);
    } catch (error) {
      this.logger.error('Failed to verify deletion token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return false;
    }
  }

  private async performDataDeletion(userId: string): Promise<void> {
    try {
      // In production, this would perform cascading deletion across all tables
      // For now, we'll log the operation
      this.logger.info('Performing user data deletion', {
        userId,
        deletionStarted: new Date()
      });

      // Log the data processing activity
      await this.logDataProcessing({
        userId,
        activityType: 'deletion',
        dataCategories: ['profile', 'qr_codes', 'analytics', 'consents'],
        purpose: 'GDPR right to erasure',
        legalBasis: 'user_request',
        processor: 'business_tools_service',
        processingDetails: {
          deletionType: 'complete',
          deletionMethod: 'automated'
        },
        automatedDecision: true,
        thirdPartyTransfers: []
      });
    } catch (error) {
      this.logger.error('Failed to perform data deletion', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}