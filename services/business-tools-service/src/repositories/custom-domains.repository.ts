/**
 * Custom Domains Repository
 * 
 * Data access layer for custom domains, domain verification, 
 * and SSL certificate management following clean architecture principles.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Pool } from 'pg';
import { 
  CustomDomain, 
  DomainVerification, 
  SSLCertificate,
  ICustomDomainsRepository,
  IDomainVerificationRepository,
  ISSLCertificateRepository,
  PaginationOptions,
  ILogger
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export class CustomDomainsRepository implements ICustomDomainsRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(domain: Omit<CustomDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomDomain> {
    const query = `
      INSERT INTO custom_domains (
        id, user_id, organization_id, domain, subdomain, full_domain,
        status, verification_method, verification_token, verification_value,
        ssl_status, auto_renew_ssl, redirect_settings, custom_headers, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      domain.userId,
      domain.organizationId || null,
      domain.domain,
      domain.subdomain || null,
      domain.fullDomain,
      domain.status || 'pending',
      domain.verificationMethod || 'dns',
      domain.verificationToken,
      domain.verificationValue || null,
      domain.sslStatus || 'pending',
      domain.autoRenewSsl !== false,
      JSON.stringify(domain.redirectSettings || {}),
      JSON.stringify(domain.customHeaders || {}),
      domain.isActive !== false
    ];

    try {
      const result = await this.db.query(query, values);
      const createdDomain = this.mapRowToDomain(result.rows[0]);
      
      this.logger.info('Custom domain created', {
        domainId: id,
        userId: domain.userId,
        fullDomain: domain.fullDomain
      });

      return createdDomain;
    } catch (error) {
      this.logger.error('Failed to create custom domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: domain.userId,
        fullDomain: domain.fullDomain
      });
      throw error;
    }
  }

  async findById(id: string): Promise<CustomDomain | null> {
    const query = 'SELECT * FROM custom_domains WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToDomain(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find custom domain by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: id
      });
      throw error;
    }
  }

  async findByFullDomain(fullDomain: string): Promise<CustomDomain | null> {
    const query = 'SELECT * FROM custom_domains WHERE full_domain = $1';
    
    try {
      const result = await this.db.query(query, [fullDomain]);
      return result.rows.length > 0 ? this.mapRowToDomain(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find custom domain by full domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fullDomain
      });
      throw error;
    }
  }

  async findByUserId(userId: string, pagination?: PaginationOptions): Promise<{ domains: CustomDomain[]; total: number }> {
    const offset = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const limit = pagination?.limit || 50;
    const sortBy = pagination?.sortBy || 'created_at';
    const sortOrder = pagination?.sortOrder || 'DESC';

    // Count query
    const countQuery = 'SELECT COUNT(*) as total FROM custom_domains WHERE user_id = $1';
    
    // Data query
    const dataQuery = `
      SELECT * FROM custom_domains 
      WHERE user_id = $1 
      ORDER BY ${sortBy} ${sortOrder} 
      LIMIT $2 OFFSET $3
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.db.query(countQuery, [userId]),
        this.db.query(dataQuery, [userId, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const domains = dataResult.rows.map(row => this.mapRowToDomain(row));

      this.logger.debug('Retrieved user custom domains', {
        userId,
        count: domains.length,
        total
      });

      return { domains, total };
    } catch (error) {
      this.logger.error('Failed to find custom domains by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async update(id: string, updates: Partial<CustomDomain>): Promise<CustomDomain | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbColumn = this.mapFieldToDbColumn(key);
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
      return this.findById(id);
    }

    // Always update the updated_at timestamp
    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE custom_domains 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedDomain = this.mapRowToDomain(result.rows[0]);
      
      this.logger.info('Custom domain updated', {
        domainId: id,
        updatedFields: Object.keys(updates)
      });

      return updatedDomain;
    } catch (error) {
      this.logger.error('Failed to update custom domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: id,
        updates
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM custom_domains WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      const deleted = (result.rowCount || 0) > 0;
      
      if (deleted) {
        this.logger.info('Custom domain deleted', { domainId: id });
      } else {
        this.logger.warn('Attempted to delete non-existent custom domain', { domainId: id });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete custom domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: id
      });
      throw error;
    }
  }

  async findExpiringSslCertificates(daysUntilExpiry: number): Promise<CustomDomain[]> {
    const query = `
      SELECT * FROM custom_domains 
      WHERE ssl_status = 'active' 
        AND auto_renew_ssl = true 
        AND ssl_expires_at <= NOW() + INTERVAL '${daysUntilExpiry} days'
        AND ssl_expires_at > NOW()
      ORDER BY ssl_expires_at ASC
    `;

    try {
      const result = await this.db.query(query);
      const domains = result.rows.map(row => this.mapRowToDomain(row));
      
      this.logger.debug('Retrieved expiring SSL certificates', {
        count: domains.length,
        daysUntilExpiry
      });

      return domains;
    } catch (error) {
      this.logger.error('Failed to find expiring SSL certificates', {
        error: error instanceof Error ? error.message : 'Unknown error',
        daysUntilExpiry
      });
      throw error;
    }
  }

  private mapRowToDomain(row: any): CustomDomain {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      domain: row.domain,
      subdomain: row.subdomain,
      fullDomain: row.full_domain,
      status: row.status,
      verificationMethod: row.verification_method,
      verificationToken: row.verification_token,
      verificationValue: row.verification_value,
      verifiedAt: row.verified_at,
      sslStatus: row.ssl_status,
      sslCertificateId: row.ssl_certificate_id,
      sslIssuedAt: row.ssl_issued_at,
      sslExpiresAt: row.ssl_expires_at,
      autoRenewSsl: row.auto_renew_ssl,
      redirectSettings: typeof row.redirect_settings === 'string' 
        ? JSON.parse(row.redirect_settings) 
        : row.redirect_settings || {},
      customHeaders: typeof row.custom_headers === 'string' 
        ? JSON.parse(row.custom_headers) 
        : row.custom_headers || {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      organizationId: 'organization_id',
      fullDomain: 'full_domain',
      verificationMethod: 'verification_method',
      verificationToken: 'verification_token',
      verificationValue: 'verification_value',
      verifiedAt: 'verified_at',
      sslStatus: 'ssl_status',
      sslCertificateId: 'ssl_certificate_id',
      sslIssuedAt: 'ssl_issued_at',
      sslExpiresAt: 'ssl_expires_at',
      autoRenewSsl: 'auto_renew_ssl',
      redirectSettings: 'redirect_settings',
      customHeaders: 'custom_headers',
      isActive: 'is_active'
    };

    return fieldMap[field] || field;
  }
}

export class DomainVerificationRepository implements IDomainVerificationRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(verification: Omit<DomainVerification, 'id' | 'createdAt'>): Promise<DomainVerification> {
    const query = `
      INSERT INTO domain_verifications (
        id, domain_id, verification_type, record_name, record_value,
        expected_value, verification_status, attempts, max_attempts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      verification.domainId,
      verification.verificationType,
      verification.recordName || null,
      verification.recordValue || null,
      verification.expectedValue || null,
      verification.verificationStatus || 'pending',
      verification.attempts || 0,
      verification.maxAttempts || 10
    ];

    try {
      const result = await this.db.query(query, values);
      const createdVerification = this.mapRowToVerification(result.rows[0]);
      
      this.logger.info('Domain verification record created', {
        verificationId: id,
        domainId: verification.domainId,
        type: verification.verificationType
      });

      return createdVerification;
    } catch (error) {
      this.logger.error('Failed to create domain verification record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: verification.domainId
      });
      throw error;
    }
  }

  async findByDomainId(domainId: string): Promise<DomainVerification[]> {
    const query = 'SELECT * FROM domain_verifications WHERE domain_id = $1 ORDER BY created_at DESC';
    
    try {
      const result = await this.db.query(query, [domainId]);
      return result.rows.map(row => this.mapRowToVerification(row));
    } catch (error) {
      this.logger.error('Failed to find domain verifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      throw error;
    }
  }

  async update(id: string, updates: Partial<DomainVerification>): Promise<DomainVerification | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbColumn = this.mapFieldToDbColumn(key);
        if (dbColumn) {
          setClause.push(`${dbColumn} = $${paramCount++}`);
          values.push(value);
        }
      }
    });

    if (setClause.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE domain_verifications 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      return result.rows.length > 0 ? this.mapRowToVerification(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to update domain verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        verificationId: id
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM domain_verifications WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      this.logger.error('Failed to delete domain verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        verificationId: id
      });
      throw error;
    }
  }

  async findPendingVerifications(): Promise<DomainVerification[]> {
    const query = `
      SELECT * FROM domain_verifications 
      WHERE verification_status = 'pending' 
        AND attempts < max_attempts
      ORDER BY created_at ASC
    `;
    
    try {
      const result = await this.db.query(query);
      return result.rows.map(row => this.mapRowToVerification(row));
    } catch (error) {
      this.logger.error('Failed to find pending verifications', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async findById(id: string): Promise<DomainVerification | null> {
    const query = 'SELECT * FROM domain_verifications WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToVerification(result.rows[0]) : null;
  }

  private mapRowToVerification(row: any): DomainVerification {
    return {
      id: row.id,
      domainId: row.domain_id,
      verificationType: row.verification_type,
      recordName: row.record_name,
      recordValue: row.record_value,
      expectedValue: row.expected_value,
      actualValue: row.actual_value,
      verificationStatus: row.verification_status,
      lastCheckedAt: row.last_checked_at,
      errorMessage: row.error_message,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at
    };
  }

  private mapFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      domainId: 'domain_id',
      verificationType: 'verification_type',
      recordName: 'record_name',
      recordValue: 'record_value',
      expectedValue: 'expected_value',
      actualValue: 'actual_value',
      verificationStatus: 'verification_status',
      lastCheckedAt: 'last_checked_at',
      errorMessage: 'error_message',
      maxAttempts: 'max_attempts'
    };

    return fieldMap[field] || field;
  }
}

export class SSLCertificateRepository implements ISSLCertificateRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(certificate: Omit<SSLCertificate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSLCertificate> {
    const query = `
      INSERT INTO ssl_certificates (
        id, domain_id, provider, certificate_data, private_key_data,
        certificate_chain, serial_number, issued_at, expires_at,
        auto_renew, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      certificate.domainId,
      certificate.provider || 'letsencrypt',
      certificate.certificateData || null,
      certificate.privateKeyData || null,
      certificate.certificateChain || null,
      certificate.serialNumber || null,
      certificate.issuedAt || null,
      certificate.expiresAt || null,
      certificate.autoRenew !== false,
      certificate.status || 'pending'
    ];

    try {
      const result = await this.db.query(query, values);
      const createdCertificate = this.mapRowToSSLCertificate(result.rows[0]);
      
      this.logger.info('SSL certificate record created', {
        certificateId: id,
        domainId: certificate.domainId,
        provider: certificate.provider
      });

      return createdCertificate;
    } catch (error) {
      this.logger.error('Failed to create SSL certificate record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: certificate.domainId
      });
      throw error;
    }
  }

  async findById(id: string): Promise<SSLCertificate | null> {
    const query = 'SELECT * FROM ssl_certificates WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToSSLCertificate(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find SSL certificate by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        certificateId: id
      });
      throw error;
    }
  }

  async findByDomainId(domainId: string): Promise<SSLCertificate | null> {
    const query = 'SELECT * FROM ssl_certificates WHERE domain_id = $1 ORDER BY created_at DESC LIMIT 1';
    
    try {
      const result = await this.db.query(query, [domainId]);
      return result.rows.length > 0 ? this.mapRowToSSLCertificate(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find SSL certificate by domain ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      throw error;
    }
  }

  async update(id: string, updates: Partial<SSLCertificate>): Promise<SSLCertificate | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbColumn = this.mapFieldToDbColumn(key);
        if (dbColumn) {
          setClause.push(`${dbColumn} = $${paramCount++}`);
          values.push(value);
        }
      }
    });

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE ssl_certificates 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      return result.rows.length > 0 ? this.mapRowToSSLCertificate(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to update SSL certificate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        certificateId: id
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM ssl_certificates WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      this.logger.error('Failed to delete SSL certificate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        certificateId: id
      });
      throw error;
    }
  }

  async findExpiringCertificates(daysUntilExpiry: number): Promise<SSLCertificate[]> {
    const query = `
      SELECT * FROM ssl_certificates 
      WHERE status = 'active' 
        AND auto_renew = true 
        AND expires_at <= NOW() + INTERVAL '${daysUntilExpiry} days'
        AND expires_at > NOW()
      ORDER BY expires_at ASC
    `;

    try {
      const result = await this.db.query(query);
      const certificates = result.rows.map(row => this.mapRowToSSLCertificate(row));
      
      this.logger.debug('Retrieved expiring SSL certificates', {
        count: certificates.length,
        daysUntilExpiry
      });

      return certificates;
    } catch (error) {
      this.logger.error('Failed to find expiring SSL certificates', {
        error: error instanceof Error ? error.message : 'Unknown error',
        daysUntilExpiry
      });
      throw error;
    }
  }

  private mapRowToSSLCertificate(row: any): SSLCertificate {
    return {
      id: row.id,
      domainId: row.domain_id,
      provider: row.provider,
      certificateData: row.certificate_data,
      privateKeyData: row.private_key_data,
      certificateChain: row.certificate_chain,
      serialNumber: row.serial_number,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      autoRenew: row.auto_renew,
      renewalAttempts: row.renewal_attempts || 0,
      lastRenewalAttempt: row.last_renewal_attempt,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      domainId: 'domain_id',
      certificateData: 'certificate_data',
      privateKeyData: 'private_key_data',
      certificateChain: 'certificate_chain',
      serialNumber: 'serial_number',
      issuedAt: 'issued_at',
      expiresAt: 'expires_at',
      autoRenew: 'auto_renew',
      renewalAttempts: 'renewal_attempts',
      lastRenewalAttempt: 'last_renewal_attempt'
    };

    return fieldMap[field] || field;
  }
}