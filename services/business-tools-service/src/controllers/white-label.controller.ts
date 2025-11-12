/**
 * White Label Controller
 * 
 * HTTP request handlers for white label configuration management including
 * branding settings, asset uploads, and preview functionality. Follows REST API 
 * conventions with proper validation, authentication, and error handling.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response } from 'express';
import '../types/express.d'; // Import type extensions
import { 
  IWhiteLabelService,
  ILogger,
  CreateWhiteLabelRequest,
  UpdateWhiteLabelRequest,
  UploadAssetRequest
} from '../interfaces';
import multer from 'multer';
import path from 'path';

export class WhiteLabelController {
  constructor(
    private whiteLabelService: IWhiteLabelService,
    private logger: ILogger
  ) {}

  /**
   * Create a new white label configuration
   * POST /api/business/white-label
   */
  async createConfig(req: Request, res: Response): Promise<void> {
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
      const { configName } = req.body;
      if (!configName || configName.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Configuration name is required',
          statusCode: 400
        });
        return;
      }

      const createRequest: CreateWhiteLabelRequest = {
        configName: configName.trim(),
        companyName: req.body.companyName?.trim(),
        primaryColor: req.body.primaryColor,
        secondaryColor: req.body.secondaryColor,
        accentColor: req.body.accentColor,
        backgroundColor: req.body.backgroundColor,
        textColor: req.body.textColor,
        supportEmail: req.body.supportEmail?.toLowerCase(),
        supportPhone: req.body.supportPhone,
        supportUrl: req.body.supportUrl,
        termsUrl: req.body.termsUrl,
        privacyUrl: req.body.privacyUrl,
        brandingSettings: req.body.brandingSettings || {},
        emailSettings: req.body.emailSettings || {},
        domainSettings: req.body.domainSettings || {},
        featureFlags: req.body.featureFlags || {}
      };

      // Validate email format if provided
      if (createRequest.supportEmail && !this.isValidEmail(createRequest.supportEmail)) {
        res.status(400).json({
          success: false,
          error: 'Invalid support email format',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.createConfig(userId, createRequest);

      this.logger.info('White label configuration creation request processed', {
        userId,
        configName,
        success: result.success,
        statusCode: result.statusCode
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in createConfig controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        configName: req.body?.configName
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get a specific white label configuration
   * GET /api/business/white-label/:configId
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { configId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'Configuration ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.getConfig(configId, userId);

      this.logger.debug('White label configuration retrieval request processed', {
        userId,
        configId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getConfig controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        configId: req.params?.configId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get all white label configurations for authenticated user
   * GET /api/business/white-label
   */
  async getUserConfigs(req: Request, res: Response): Promise<void> {
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

      const result = await this.whiteLabelService.getUserConfigs(userId);

      this.logger.debug('User white label configurations retrieval request processed', {
        userId,
        success: result.success,
        totalConfigs: result.meta?.total
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getUserConfigs controller', {
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
   * Update a white label configuration
   * PUT /api/business/white-label/:configId
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { configId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'Configuration ID is required',
          statusCode: 400
        });
        return;
      }

      const updates: UpdateWhiteLabelRequest = {};

      // Only include fields that are present in the request body
      if (req.body.configName !== undefined) {
        if (!req.body.configName.trim()) {
          res.status(400).json({
            success: false,
            error: 'Configuration name cannot be empty',
            statusCode: 400
          });
          return;
        }
        updates.configName = req.body.configName.trim();
      }

      const updateFields = [
        'companyName', 'primaryColor', 'secondaryColor', 'accentColor', 
        'backgroundColor', 'textColor', 'supportEmail', 'supportPhone',
        'supportUrl', 'termsUrl', 'privacyUrl', 'logoUrl', 'logoDarkUrl',
        'faviconUrl', 'customCss', 'customJs', 'brandingSettings',
        'emailSettings', 'domainSettings', 'featureFlags', 'isActive'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          (updates as any)[field] = req.body[field];
        }
      });

      // Validate email format if provided
      if (updates.supportEmail && !this.isValidEmail(updates.supportEmail)) {
        res.status(400).json({
          success: false,
          error: 'Invalid support email format',
          statusCode: 400
        });
        return;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid fields provided for update',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.updateConfig(configId, userId, updates);

      this.logger.info('White label configuration update request processed', {
        userId,
        configId,
        updates: Object.keys(updates),
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in updateConfig controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        configId: req.params?.configId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Delete a white label configuration
   * DELETE /api/business/white-label/:configId
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { configId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'Configuration ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.deleteConfig(configId, userId);

      this.logger.info('White label configuration deletion request processed', {
        userId,
        configId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in deleteConfig controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        configId: req.params?.configId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Upload a brand asset
   * POST /api/business/white-label/:configId/assets
   */
  async uploadAsset(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { configId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'Configuration ID is required',
          statusCode: 400
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'File is required',
          statusCode: 400
        });
        return;
      }

      const { assetType, assetName, altText, usageContext } = req.body;

      if (!assetType || !assetName) {
        res.status(400).json({
          success: false,
          error: 'Asset type and name are required',
          statusCode: 400
        });
        return;
      }

      const validAssetTypes = ['logo', 'favicon', 'background', 'email_header', 'custom'];
      if (!validAssetTypes.includes(assetType)) {
        res.status(400).json({
          success: false,
          error: `Invalid asset type. Must be one of: ${validAssetTypes.join(', ')}`,
          statusCode: 400
        });
        return;
      }

      const uploadRequest: UploadAssetRequest = {
        assetType,
        assetName: assetName.trim(),
        altText: altText?.trim(),
        usageContext: usageContext ? JSON.parse(usageContext) : {}
      };

      const result = await this.whiteLabelService.uploadAsset(configId, userId, req.file, uploadRequest);

      this.logger.info('Brand asset upload request processed', {
        userId,
        configId,
        assetType,
        assetName: uploadRequest.assetName,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in uploadAsset controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        configId: req.params?.configId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Get brand assets for a configuration
   * GET /api/business/white-label/:configId/assets
   */
  async getAssets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { configId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'Configuration ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.getAssets(configId, userId);

      this.logger.debug('Brand assets retrieval request processed', {
        userId,
        configId,
        success: result.success,
        totalAssets: result.meta?.total
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in getAssets controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        configId: req.params?.configId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Delete a brand asset
   * DELETE /api/business/white-label/assets/:assetId
   */
  async deleteAsset(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { assetId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          statusCode: 401
        });
        return;
      }

      if (!assetId) {
        res.status(400).json({
          success: false,
          error: 'Asset ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.deleteAsset(assetId, userId);

      this.logger.info('Brand asset deletion request processed', {
        userId,
        assetId,
        success: result.success
      });

      res.status(result.statusCode || 500).json(result);
    } catch (error) {
      this.logger.error('Error in deleteAsset controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        assetId: req.params?.assetId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  /**
   * Preview a white label configuration
   * GET /api/business/white-label/:configId/preview
   */
  async previewConfig(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;

      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'Configuration ID is required',
          statusCode: 400
        });
        return;
      }

      const result = await this.whiteLabelService.previewConfig(configId);

      if (result.success && result.data) {
        // Return HTML directly for preview
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(result.data.previewHtml);
      } else {
        res.status(result.statusCode || 500).json(result);
      }

      this.logger.debug('White label configuration preview request processed', {
        configId,
        success: result.success
      });
    } catch (error) {
      this.logger.error('Error in previewConfig controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId: req.params?.configId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  }

  // Helper methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}