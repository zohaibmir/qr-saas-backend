/**
 * Custom Domains Service
 * 
 * Business logic layer for custom domain management including domain verification,
 * SSL certificate provisioning, and DNS configuration following clean architecture
 * and SOLID principles.
 * 
 * @author AI Agent
 * @date 2024
 */

import { 
  CustomDomain, 
  DomainVerification, 
  SSLCertificate,
  ICustomDomainsService,
  ICustomDomainsRepository,
  IDomainVerificationRepository,
  ISSLCertificateRepository,
  ILogger,
  ServiceResponse,
  CreateDomainRequest,
  UpdateDomainRequest,
  PaginationOptions
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export class CustomDomainsService implements ICustomDomainsService {
  constructor(
    private customDomainsRepository: ICustomDomainsRepository,
    private domainVerificationRepository: IDomainVerificationRepository,
    private sslRepository: ISSLCertificateRepository,
    private logger: ILogger
  ) {}

  async createDomain(userId: string, request: CreateDomainRequest): Promise<ServiceResponse<CustomDomain>> {
    try {
      // Validate domain format
      if (!this.isValidDomain(request.domain)) {
        return {
          success: false,
          error: 'Invalid domain format',
          statusCode: 400
        };
      }

      const fullDomain = request.subdomain ? `${request.subdomain}.${request.domain}` : request.domain;

      // Check if domain already exists
      const existingDomain = await this.customDomainsRepository.findByFullDomain(fullDomain);
      if (existingDomain) {
        return {
          success: false,
          error: 'Domain already exists',
          statusCode: 409
        };
      }

      // Create custom domain record
      const customDomain: CustomDomain = {
        id: uuidv4(),
        userId,
        organizationId: userId,
        domain: request.domain.toLowerCase(),
        subdomain: request.subdomain,
        fullDomain,
        status: 'pending',
        verificationMethod: request.verificationMethod || 'dns',
        verificationToken: uuidv4(),
        sslStatus: 'pending',
        autoRenewSsl: request.sslEnabled !== false,
        redirectSettings: request.redirectSettings || {},
        customHeaders: request.customHeaders || {},
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdDomain = await this.customDomainsRepository.create(customDomain);

      // Start domain verification process
      await this.initiateVerification(createdDomain.id);

      this.logger.info('Custom domain created successfully', {
        domainId: createdDomain.id,
        domain: fullDomain,
        userId
      });

      return {
        success: true,
        data: createdDomain,
        statusCode: 201
      };
    } catch (error) {
      this.logger.error('Failed to create custom domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domain: request.domain,
        userId
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create domain',
        statusCode: 500
      };
    }
  }

  async getDomain(domainId: string, userId: string): Promise<ServiceResponse<CustomDomain>> {
    try {
      const domain = await this.customDomainsRepository.findById(domainId);
      
      if (!domain) {
        return {
          success: false,
          error: 'Domain not found',
          statusCode: 404
        };
      }

      if (domain.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to domain',
          statusCode: 403
        };
      }

      return {
        success: true,
        data: domain,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to get domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get domain',
        statusCode: 500
      };
    }
  }

  async getUserDomains(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<CustomDomain[]>> {
    try {
      const result = await this.customDomainsRepository.findByUserId(userId, pagination);
      
      return {
        success: true,
        data: result.domains,
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
      this.logger.error('Failed to get user domains', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get domains',
        statusCode: 500
      };
    }
  }

  async updateDomain(domainId: string, userId: string, updates: UpdateDomainRequest): Promise<ServiceResponse<CustomDomain>> {
    try {
      const domain = await this.customDomainsRepository.findById(domainId);
      
      if (!domain) {
        return {
          success: false,
          error: 'Domain not found',
          statusCode: 404
        };
      }

      if (domain.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to domain',
          statusCode: 403
        };
      }

      const updatedDomain = await this.customDomainsRepository.update(domainId, {
        ...updates,
        updatedAt: new Date()
      });

      if (!updatedDomain) {
        return {
          success: false,
          error: 'Failed to update domain',
          statusCode: 500
        };
      }

      this.logger.info('Domain updated successfully', {
        domainId,
        userId,
        changes: Object.keys(updates)
      });

      return {
        success: true,
        data: updatedDomain,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to update domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to update domain',
        statusCode: 500
      };
    }
  }

  async deleteDomain(domainId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      const domain = await this.customDomainsRepository.findById(domainId);
      
      if (!domain) {
        return {
          success: false,
          error: 'Domain not found',
          statusCode: 404
        };
      }

      if (domain.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to domain',
          statusCode: 403
        };
      }

      // Delete SSL certificate if exists
      if (domain.sslCertificateId) {
        await this.sslRepository.delete(domain.sslCertificateId);
      }

      const deleted = await this.customDomainsRepository.delete(domainId);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete domain',
          statusCode: 500
        };
      }

      this.logger.info('Domain deleted successfully', {
        domainId,
        userId
      });

      return {
        success: true,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to delete domain', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to delete domain',
        statusCode: 500
      };
    }
  }

  async verifyDomain(domainId: string): Promise<ServiceResponse<void>> {
    try {
      const domain = await this.customDomainsRepository.findById(domainId);
      
      if (!domain) {
        return {
          success: false,
          error: 'Domain not found',
          statusCode: 404
        };
      }

      // Check DNS records
      const dnsVerified = await this.verifyDNSRecords(domain);
      
      if (dnsVerified) {
        // Update domain status
        await this.customDomainsRepository.update(domainId, {
          status: 'active',
          verifiedAt: new Date(),
          updatedAt: new Date()
        });

        // Create verification record
        await this.domainVerificationRepository.create({
          id: uuidv4(),
          domainId,
          verificationType: 'dns_txt',
          recordName: `_verification.${domain.fullDomain}`,
          recordValue: domain.verificationToken,
          expectedValue: domain.verificationToken,
          actualValue: domain.verificationToken,
          verificationStatus: 'success',
          lastCheckedAt: new Date(),
          attempts: 1,
          maxAttempts: 3,
          createdAt: new Date()
        });

        // Start SSL provisioning if enabled
        if (domain.autoRenewSsl) {
          await this.provisionSSL(domainId);
        }

        this.logger.info('Domain verified successfully', {
          domainId,
          domain: domain.fullDomain
        });

        return {
          success: true,
          statusCode: 200
        };
      } else {
        this.logger.warn('Domain verification failed', {
          domainId,
          domain: domain.fullDomain
        });

        return {
          success: false,
          error: 'Domain verification failed',
          statusCode: 400
        };
      }
    } catch (error) {
      this.logger.error('Domain verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      
      return {
        success: false,
        error: 'Failed to verify domain',
        statusCode: 500
      };
    }
  }

  async checkDomainVerification(domainId: string): Promise<ServiceResponse<DomainVerification[]>> {
    try {
      const verifications = await this.domainVerificationRepository.findByDomainId(domainId);
      
      return {
        success: true,
        data: verifications,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to check domain verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      
      return {
        success: false,
        error: 'Failed to check verification status',
        statusCode: 500
      };
    }
  }

  async provisionSSL(domainId: string): Promise<ServiceResponse<SSLCertificate>> {
    try {
      const domain = await this.customDomainsRepository.findById(domainId);
      
      if (!domain) {
        return {
          success: false,
          error: 'Domain not found',
          statusCode: 404
        };
      }

      if (domain.status !== 'active') {
        return {
          success: false,
          error: 'Domain must be verified before SSL provisioning',
          statusCode: 400
        };
      }

      const certificate: SSLCertificate = {
        id: uuidv4(),
        domainId,
        provider: 'letsencrypt',
        serialNumber: uuidv4(),
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        autoRenew: domain.autoRenewSsl,
        renewalAttempts: 0,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdCertificate = await this.sslRepository.create(certificate);

      // Update domain with SSL certificate ID and status
      await this.customDomainsRepository.update(domainId, {
        sslCertificateId: createdCertificate.id,
        sslStatus: 'pending',
        updatedAt: new Date()
      });

      // Simulate SSL provisioning process
      setTimeout(async () => {
        try {
          await this.sslRepository.update(createdCertificate.id, {
            status: 'active',
            certificateData: 'mock-certificate-data',
            updatedAt: new Date()
          });

          await this.customDomainsRepository.update(domainId, {
            sslStatus: 'active',
            sslIssuedAt: new Date(),
            sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          });

          this.logger.info('SSL certificate provisioned successfully', {
            certificateId: createdCertificate.id,
            domainId,
            domain: domain.fullDomain
          });
        } catch (error) {
          this.logger.error('SSL certificate provisioning failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            certificateId: createdCertificate.id,
            domainId
          });
        }
      }, 5000);

      return {
        success: true,
        data: createdCertificate,
        statusCode: 201
      };
    } catch (error) {
      this.logger.error('Failed to provision SSL certificate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      
      return {
        success: false,
        error: 'Failed to provision SSL certificate',
        statusCode: 500
      };
    }
  }

  async renewSSLCertificate(domainId: string): Promise<ServiceResponse<SSLCertificate>> {
    try {
      const domain = await this.customDomainsRepository.findById(domainId);
      
      if (!domain) {
        return {
          success: false,
          error: 'Domain not found',
          statusCode: 404
        };
      }

      if (domain.status !== 'active') {
        return {
          success: false,
          error: 'Domain must be verified before SSL renewal',
          statusCode: 400
        };
      }

      // Get existing certificate
      const existingCertificate = await this.sslRepository.findByDomainId(domainId);
      
      if (existingCertificate) {
        // Update existing certificate for renewal
        const renewedCertificate = await this.sslRepository.update(existingCertificate.id, {
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          renewalAttempts: existingCertificate.renewalAttempts + 1,
          lastRenewalAttempt: new Date(),
          status: 'active',
          updatedAt: new Date()
        });

        if (!renewedCertificate) {
          return {
            success: false,
            error: 'Failed to renew SSL certificate',
            statusCode: 500
          };
        }

        this.logger.info('SSL certificate renewed successfully', {
          certificateId: renewedCertificate.id,
          domainId
        });

        return {
          success: true,
          data: renewedCertificate,
          statusCode: 200
        };
      } else {
        // No existing certificate, provision new one
        return await this.provisionSSL(domainId);
      }
    } catch (error) {
      this.logger.error('Failed to renew SSL certificate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId
      });
      
      return {
        success: false,
        error: 'Failed to renew SSL certificate',
        statusCode: 500
      };
    }
  }

  // Private helper methods
  private async initiateVerification(domainId: string): Promise<void> {
    const verification: DomainVerification = {
      id: uuidv4(),
      domainId,
      verificationType: 'dns_txt',
      verificationStatus: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date()
    };

    await this.domainVerificationRepository.create(verification);
  }

  private async verifyDNSRecords(domain: CustomDomain): Promise<boolean> {
    try {
      // In a real implementation, this would use DNS lookup libraries
      // For now, we'll simulate DNS verification
      
      // Simulate DNS lookup delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes, return true to simulate successful verification
      return true;
    } catch (error) {
      this.logger.error('DNS verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domain: domain.fullDomain
      });
      return false;
    }
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }
}