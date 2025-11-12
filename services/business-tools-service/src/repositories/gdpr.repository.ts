/**
 * GDPR Repository
 * 
 * Data access layer for GDPR compliance features including data requests,
 * user consents, privacy settings, and data processing logs following 
 * clean architecture principles.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Pool } from 'pg';
import { 
  GDPRRequest, 
  UserConsent,
  UserPrivacySettings,
  DataProcessingLog,
  IGDPRRepository,
  ILogger
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

type PaginationOptions = {
  limit?: number;
  offset?: number;
};

export class GDPRRepository implements IGDPRRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  // GDPR Request Methods
  async createRequest(request: GDPRRequest): Promise<GDPRRequest> {
    const query = `
      INSERT INTO gdpr_requests (
        id, user_id, request_type, status, request_details, requested_data,
        processed_data, requester_email, requester_ip_address, verification_token,
        admin_notes, file_exports
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const id = request.id || uuidv4();
    const values = [
      id,
      request.userId || null,
      request.requestType,
      request.status || 'pending',
      JSON.stringify(request.requestDetails || {}),
      JSON.stringify(request.requestedData || {}),
      JSON.stringify(request.processedData || {}),
      request.requesterEmail,
      request.requesterIpAddress || null,
      request.verificationToken || null,
      request.adminNotes || null,
      JSON.stringify(request.fileExports || [])
    ];

    try {
      const result = await this.db.query(query, values);
      const createdRequest = this.mapRowToGDPRRequest(result.rows[0]);
      
      this.logger.info('GDPR request created', {
        requestId: id,
        requesterEmail: request.requesterEmail,
        requestType: request.requestType,
        status: request.status
      });

      return createdRequest;
    } catch (error) {
      this.logger.error('Failed to create GDPR request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requesterEmail: request.requesterEmail,
        requestType: request.requestType
      });
      throw error;
    }
  }

  async findRequestById(id: string): Promise<GDPRRequest | null> {
    const query = 'SELECT * FROM gdpr_requests WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToGDPRRequest(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find GDPR request by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: id
      });
      throw error;
    }
  }

  async findRequestsByEmail(email: string): Promise<GDPRRequest[]> {
    const query = 'SELECT * FROM gdpr_requests WHERE requester_email = $1 ORDER BY created_at DESC';
    
    try {
      const result = await this.db.query(query, [email]);
      const requests = result.rows.map(row => this.mapRowToGDPRRequest(row));
      
      this.logger.debug('Retrieved GDPR requests by email', {
        email,
        count: requests.length
      });

      return requests;
    } catch (error) {
      this.logger.error('Failed to find GDPR requests by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email
      });
      throw error;
    }
  }

  async updateRequest(id: string, updates: Partial<GDPRRequest>): Promise<GDPRRequest | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbColumn = this.mapGDPRFieldToDbColumn(key);
        if (dbColumn) {
          if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            setClause.push(`${dbColumn} = $${paramCount++}`);
            values.push(JSON.stringify(value));
          } else {
            setClause.push(`${dbColumn} = $${paramCount++}`);
            values.push(value);
          }
        }
      }
    });

    if (setClause.length === 0) {
      return this.findRequestById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE gdpr_requests 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedRequest = this.mapRowToGDPRRequest(result.rows[0]);
      
      this.logger.info('GDPR request updated', {
        requestId: id,
        updatedFields: Object.keys(updates)
      });

      return updatedRequest;
    } catch (error) {
      this.logger.error('Failed to update GDPR request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: id,
        updates
      });
      throw error;
    }
  }

  // User Consent Methods
  async createConsent(consent: UserConsent): Promise<UserConsent> {
    const query = `
      INSERT INTO user_consents (
        id, user_id, consent_type, consent_version, consent_given, 
        consent_text, legal_basis, source, ip_address, user_agent,
        consent_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const id = consent.id || uuidv4();
    const values = [
      id,
      consent.userId,
      consent.consentType,
      consent.consentVersion,
      consent.consentGiven,
      consent.consentText || null,
      consent.legalBasis || null,
      consent.source || null,
      consent.ipAddress || null,
      consent.userAgent || null,
      consent.consentDate,
      consent.isActive
    ];

    try {
      const result = await this.db.query(query, values);
      const createdConsent = this.mapRowToUserConsent(result.rows[0]);
      
      this.logger.info('User consent recorded', {
        consentId: id,
        userId: consent.userId,
        consentType: consent.consentType,
        given: consent.consentGiven
      });

      return createdConsent;
    } catch (error) {
      this.logger.error('Failed to create user consent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: consent.userId,
        consentType: consent.consentType
      });
      throw error;
    }
  }

  async findConsentsByUserId(userId: string): Promise<UserConsent[]> {
    const query = 'SELECT * FROM user_consents WHERE user_id = $1 ORDER BY consent_date DESC';
    
    try {
      const result = await this.db.query(query, [userId]);
      const consents = result.rows.map(row => this.mapRowToUserConsent(row));
      
      this.logger.debug('Retrieved user consents', {
        userId,
        count: consents.length
      });

      return consents;
    } catch (error) {
      this.logger.error('Failed to find user consents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async updateConsent(userId: string, consentType: string, updates: Partial<UserConsent>): Promise<UserConsent | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'consentType') {
        const dbColumn = this.mapConsentFieldToDbColumn(key);
        if (dbColumn) {
          setClause.push(`${dbColumn} = $${paramCount++}`);
          values.push(value);
        }
      }
    });

    if (setClause.length === 0) {
      return this.findConsentByUserIdAndType(userId, consentType);
    }

    values.push(userId, consentType);

    const query = `
      UPDATE user_consents 
      SET ${setClause.join(', ')} 
      WHERE user_id = $${paramCount} AND consent_type = $${paramCount + 1}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedConsent = this.mapRowToUserConsent(result.rows[0]);
      
      this.logger.info('User consent updated', {
        userId,
        consentType,
        updatedFields: Object.keys(updates)
      });

      return updatedConsent;
    } catch (error) {
      this.logger.error('Failed to update user consent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        consentType,
        updates
      });
      throw error;
    }
  }

  // Privacy Settings Methods
  async getPrivacySettings(userId: string): Promise<UserPrivacySettings | null> {
    const query = 'SELECT * FROM user_privacy_settings WHERE user_id = $1';
    
    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.length > 0 ? this.mapRowToPrivacySettings(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find privacy settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async updatePrivacySettings(userId: string, settings: Partial<UserPrivacySettings>): Promise<UserPrivacySettings> {
    // Check if settings already exist for this user
    const existingQuery = 'SELECT id FROM user_privacy_settings WHERE user_id = $1';
    const existingResult = await this.db.query(existingQuery, [userId]);
    
    if (existingResult.rows.length > 0) {
      // Update existing settings
      const setClause: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'userId') {
          const dbColumn = this.mapPrivacyFieldToDbColumn(key);
          if (dbColumn) {
            if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
              setClause.push(`${dbColumn} = $${paramCount++}`);
              values.push(JSON.stringify(value));
            } else {
              setClause.push(`${dbColumn} = $${paramCount++}`);
              values.push(value);
            }
          }
        }
      });

      if (setClause.length > 0) {
        setClause.push(`last_updated_at = NOW()`);
        values.push(userId);

        const updateQuery = `
          UPDATE user_privacy_settings 
          SET ${setClause.join(', ')} 
          WHERE user_id = $${paramCount}
          RETURNING *
        `;

        const result = await this.db.query(updateQuery, values);
        return this.mapRowToPrivacySettings(result.rows[0]);
      }
      
      // If no updates, fetch existing settings
      const existingSettings = await this.getPrivacySettings(userId);
      return existingSettings!;
    } else {
      // Create new settings with default values
      const insertQuery = `
        INSERT INTO user_privacy_settings (
          id, user_id, analytics_tracking, marketing_emails, third_party_sharing,
          data_retention_days, cookie_preferences, notification_preferences, 
          export_format, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const id = uuidv4();
      const insertValues = [
        id,
        userId,
        settings.analyticsTracking !== undefined ? settings.analyticsTracking : true,
        settings.marketingEmails !== undefined ? settings.marketingEmails : false,
        settings.thirdPartySharing !== undefined ? settings.thirdPartySharing : false,
        settings.dataRetentionDays || null,
        JSON.stringify(settings.cookiePreferences || {}),
        JSON.stringify(settings.notificationPreferences || {}),
        settings.exportFormat || 'json',
        'user'
      ];

      const result = await this.db.query(insertQuery, insertValues);
      const createdSettings = this.mapRowToPrivacySettings(result.rows[0]);
      
      this.logger.info('Privacy settings created', {
        settingsId: id,
        userId
      });

      return createdSettings;
    }
  }

  // Data Processing Log Methods
  async createDataProcessingLog(log: DataProcessingLog): Promise<DataProcessingLog> {
    const query = `
      INSERT INTO data_processing_logs (
        id, user_id, activity_type, data_categories, purpose, legal_basis,
        processor, processing_details, retention_period, automated_decision,
        third_party_transfers, admin_user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const id = log.id || uuidv4();
    const values = [
      id,
      log.userId || null,
      log.activityType,
      JSON.stringify(log.dataCategories || []),
      log.purpose,
      log.legalBasis,
      log.processor,
      JSON.stringify(log.processingDetails || {}),
      log.retentionPeriod || null,
      log.automatedDecision,
      JSON.stringify(log.thirdPartyTransfers || []),
      log.adminUserId || null,
      log.ipAddress || null
    ];

    try {
      const result = await this.db.query(query, values);
      const createdLog = this.mapRowToProcessingLog(result.rows[0]);
      
      this.logger.debug('Data processing logged', {
        logId: id,
        userId: log.userId,
        activityType: log.activityType,
        purpose: log.purpose
      });

      return createdLog;
    } catch (error) {
      this.logger.error('Failed to log data processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: log.userId,
        activityType: log.activityType
      });
      throw error;
    }
  }

  async findDataProcessingLogs(userId: string, pagination?: PaginationOptions): Promise<{ logs: DataProcessingLog[]; total: number }> {
    const limit = pagination?.limit || 100;
    const offset = pagination?.offset || 0;

    const countQuery = 'SELECT COUNT(*) as total FROM data_processing_logs WHERE user_id = $1';
    const logsQuery = 'SELECT * FROM data_processing_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    
    try {
      const [countResult, logsResult] = await Promise.all([
        this.db.query(countQuery, [userId]),
        this.db.query(logsQuery, [userId, limit, offset])
      ]);

      const logs = logsResult.rows.map(row => this.mapRowToProcessingLog(row));
      const total = parseInt(countResult.rows[0].total, 10);
      
      this.logger.debug('Retrieved processing logs for user', {
        userId,
        count: logs.length,
        total
      });

      return { logs, total };
    } catch (error) {
      this.logger.error('Failed to find processing logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  // Helper Methods
  private async findConsentByUserIdAndType(userId: string, consentType: string): Promise<UserConsent | null> {
    const query = 'SELECT * FROM user_consents WHERE user_id = $1 AND consent_type = $2';
    const result = await this.db.query(query, [userId, consentType]);
    return result.rows.length > 0 ? this.mapRowToUserConsent(result.rows[0]) : null;
  }

  // Mapping Methods
  private mapRowToGDPRRequest(row: any): GDPRRequest {
    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type,
      status: row.status,
      requestDetails: typeof row.request_details === 'string' 
        ? JSON.parse(row.request_details) 
        : row.request_details || {},
      requestedData: typeof row.requested_data === 'string' 
        ? JSON.parse(row.requested_data) 
        : row.requested_data || {},
      processedData: typeof row.processed_data === 'string' 
        ? JSON.parse(row.processed_data) 
        : row.processed_data || {},
      requesterEmail: row.requester_email,
      requesterIpAddress: row.requester_ip_address,
      verificationToken: row.verification_token,
      verifiedAt: row.verified_at,
      processingStartedAt: row.processing_started_at,
      completedAt: row.completed_at,
      expiryDate: row.expiry_date,
      adminNotes: row.admin_notes,
      rejectionReason: row.rejection_reason,
      fileExports: typeof row.file_exports === 'string' 
        ? JSON.parse(row.file_exports) 
        : row.file_exports || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToUserConsent(row: any): UserConsent {
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      consentVersion: row.consent_version,
      consentGiven: row.consent_given,
      consentText: row.consent_text,
      legalBasis: row.legal_basis,
      source: row.source,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      consentDate: row.consent_date,
      withdrawalDate: row.withdrawal_date,
      isActive: row.is_active
    };
  }

  private mapRowToPrivacySettings(row: any): UserPrivacySettings {
    return {
      id: row.id,
      userId: row.user_id,
      analyticsTracking: row.analytics_tracking,
      marketingEmails: row.marketing_emails,
      thirdPartySharing: row.third_party_sharing,
      dataRetentionDays: row.data_retention_days,
      cookiePreferences: typeof row.cookie_preferences === 'string' 
        ? JSON.parse(row.cookie_preferences) 
        : row.cookie_preferences || {},
      notificationPreferences: typeof row.notification_preferences === 'string' 
        ? JSON.parse(row.notification_preferences) 
        : row.notification_preferences || {},
      exportFormat: row.export_format,
      lastUpdatedAt: row.last_updated_at,
      updatedBy: row.updated_by
    };
  }

  private mapRowToProcessingLog(row: any): DataProcessingLog {
    return {
      id: row.id,
      userId: row.user_id,
      activityType: row.activity_type,
      dataCategories: typeof row.data_categories === 'string' 
        ? JSON.parse(row.data_categories) 
        : row.data_categories || [],
      purpose: row.purpose,
      legalBasis: row.legal_basis,
      processor: row.processor,
      processingDetails: typeof row.processing_details === 'string' 
        ? JSON.parse(row.processing_details) 
        : row.processing_details || {},
      retentionPeriod: row.retention_period,
      automatedDecision: row.automated_decision,
      thirdPartyTransfers: typeof row.third_party_transfers === 'string' 
        ? JSON.parse(row.third_party_transfers) 
        : row.third_party_transfers || [],
      adminUserId: row.admin_user_id,
      ipAddress: row.ip_address,
      createdAt: row.created_at
    };
  }

  private mapGDPRFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      requestType: 'request_type',
      requestDetails: 'request_details',
      requestedData: 'requested_data',
      processedData: 'processed_data',
      requesterEmail: 'requester_email',
      requesterIpAddress: 'requester_ip_address',
      verificationToken: 'verification_token',
      verifiedAt: 'verified_at',
      processingStartedAt: 'processing_started_at',
      completedAt: 'completed_at',
      expiryDate: 'expiry_date',
      adminNotes: 'admin_notes',
      rejectionReason: 'rejection_reason',
      fileExports: 'file_exports'
    };

    return fieldMap[field] || field;
  }

  private mapConsentFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      consentVersion: 'consent_version',
      consentGiven: 'consent_given',
      consentText: 'consent_text',
      legalBasis: 'legal_basis',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      consentDate: 'consent_date',
      withdrawalDate: 'withdrawal_date',
      isActive: 'is_active'
    };

    return fieldMap[field] || field;
  }

  private mapPrivacyFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      analyticsTracking: 'analytics_tracking',
      marketingEmails: 'marketing_emails',
      thirdPartySharing: 'third_party_sharing',
      dataRetentionDays: 'data_retention_days',
      cookiePreferences: 'cookie_preferences',
      notificationPreferences: 'notification_preferences',
      exportFormat: 'export_format',
      lastUpdatedAt: 'last_updated_at',
      updatedBy: 'updated_by'
    };

    return fieldMap[field] || field;
  }
}