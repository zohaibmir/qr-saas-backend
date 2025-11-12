/**
 * Custom Domains Controller
 * 
 * HTTP request handlers for custom domain management including domain verification,
 * SSL certificate provisioning, and DNS configuration. Follows REST API conventions
 * with proper validation, authentication, and error handling.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response } from 'express';
import '../types/express.d'; // Import type extensions
import { 
  ICustomDomainsService,
  ILogger,
  CreateDomainRequest,
  UpdateDomainRequest,
  PaginationOptions 
} from '../interfaces';

export class CustomDomainsController {
  constructor(
    private customDomainsService: ICustomDomainsService,
    private logger: ILogger
  ) {}

  /**
   * Create a new custom domain
   * POST /api/business/domains
   */
  async createDomain(req: Request, res: Response): Promise<void> {
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

      // Validate required fields
      const { domain } = req.body;
      if (!domain) {
        res.status(400).json({
          success: false,
          error: 'Domain is required',
          statusCode: 400
        });
        return;
      }

      const createRequest: CreateDomainRequest = {
        domain: domain.toLowerCase().trim(),
        subdomain: req.body.subdomain?.trim(),
        verificationMethod: req.body.verificationMethod || 'dns',
        sslEnabled: req.body.sslEnabled !== false,
        redirectSettings: req.body.redirectSettings || {},
        customHeaders: req.body.customHeaders || {}
      };

      const result = await this.customDomainsService.createDomain(userId, createRequest);

      this.logger.info('Domain creation request processed', {
        userId,
        domain,
        success: result.success,
        statusCode: result.statusCode
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in createDomain controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domain: req.body?.domain
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get a specific domain
   * GET /api/business/domains/:domainId
   */
  async getDomain(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.getDomain(domainId, userId);

      this.logger.debug('Domain retrieval request processed', {
        userId,
        domainId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getDomain controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get all domains for authenticated user
   * GET /api/business/domains
   */
  async getUserDomains(req: Request, res: Response): Promise<void> {
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

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const pagination: PaginationOptions = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      const result = await this.customDomainsService.getUserDomains(userId, pagination);

      this.logger.debug('User domains retrieval request processed', {
        userId,
        pagination,
        success: result.success,
        totalDomains: result.meta?.total
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getUserDomains controller', {
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
   * Update a domain configuration
   * PUT /api/business/domains/:domainId
   */
  async updateDomain(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const updates: UpdateDomainRequest = {};

      // Only include fields that are present in the request body
      if (req.body.redirectSettings !== undefined) {
        updates.redirectSettings = req.body.redirectSettings;
      }
      if (req.body.customHeaders !== undefined) {
        updates.customHeaders = req.body.customHeaders;
      }
      if (req.body.autoRenewSsl !== undefined) {
        updates.autoRenewSsl = req.body.autoRenewSsl;
      }
      if (req.body.isActive !== undefined) {
        updates.isActive = req.body.isActive;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid fields provided for update',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.updateDomain(domainId, userId, updates);

      this.logger.info('Domain update request processed', {
        userId,
        domainId,
        updates: Object.keys(updates),
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in updateDomain controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Delete a domain
   * DELETE /api/business/domains/:domainId
   */
  async deleteDomain(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.deleteDomain(domainId, userId);

      this.logger.info('Domain deletion request processed', {
        userId,
        domainId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in deleteDomain controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Verify a domain
   * POST /api/business/domains/:domainId/verify
   */
  async verifyDomain(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.verifyDomain(domainId);

      this.logger.info('Domain verification request processed', {
        userId,
        domainId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in verifyDomain controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Check domain verification status
   * GET /api/business/domains/:domainId/verification
   */
  async checkDomainVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.checkDomainVerification(domainId);

      this.logger.debug('Domain verification check request processed', {
        userId,
        domainId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in checkDomainVerification controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Provision SSL certificate
   * POST /api/business/domains/:domainId/ssl
   */
  async provisionSSL(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.provisionSSL(domainId);

      this.logger.info('SSL provisioning request processed', {
        userId,
        domainId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in provisionSSL controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Renew SSL certificate
   * POST /api/business/domains/:domainId/ssl/renew
   */
  async renewSSLCertificate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { domainId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!domainId) {
        res.status(400).json({
          success: false,
          error: 'Domain ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.customDomainsService.renewSSLCertificate(domainId);

      this.logger.info('SSL renewal request processed', {
        userId,
        domainId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in renewSSLCertificate controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        domainId: req.params?.domainId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }
}