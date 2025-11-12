/**
 * White Label Service
 * 
 * Business logic layer for white label configuration management including
 * branding settings, asset management, and preview functionality following
 * clean architecture and SOLID principles.
 * 
 * @author AI Agent
 * @date 2024
 */

import { 
  WhiteLabelConfig, 
  BrandAsset,
  IWhiteLabelService,
  IWhiteLabelRepository,
  ILogger,
  ServiceResponse,
  CreateWhiteLabelRequest,
  UpdateWhiteLabelRequest,
  UploadAssetRequest
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export class WhiteLabelService implements IWhiteLabelService {
  constructor(
    private whiteLabelRepository: IWhiteLabelRepository,
    private logger: ILogger
  ) {}

  async createConfig(userId: string, request: CreateWhiteLabelRequest): Promise<ServiceResponse<WhiteLabelConfig>> {
    try {
      // Validate required fields
      if (!request.configName || request.configName.trim().length === 0) {
        return {
          success: false,
          error: 'Configuration name is required',
          statusCode: 400
        };
      }

      // Check for existing config with same name for this user
      const existingConfigs = await this.whiteLabelRepository.findByUserId(userId);
      const nameExists = existingConfigs.some(config => 
        config.configName.toLowerCase() === request.configName.toLowerCase()
      );

      if (nameExists) {
        return {
          success: false,
          error: 'Configuration name already exists',
          statusCode: 409
        };
      }

      // Create white label configuration
      const config: WhiteLabelConfig = {
        id: uuidv4(),
        userId,
        organizationId: userId,
        configName: request.configName,
        primaryColor: request.primaryColor || '#007bff',
        secondaryColor: request.secondaryColor || '#6c757d',
        accentColor: request.accentColor || '#28a745',
        backgroundColor: request.backgroundColor || '#ffffff',
        textColor: request.textColor || '#212529',
        companyName: request.companyName,
        supportEmail: request.supportEmail,
        supportPhone: request.supportPhone,
        supportUrl: request.supportUrl,
        termsUrl: request.termsUrl,
        privacyUrl: request.privacyUrl,
        brandingSettings: request.brandingSettings || {},
        emailSettings: request.emailSettings || {},
        domainSettings: request.domainSettings || {},
        featureFlags: request.featureFlags || {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdConfig = await this.whiteLabelRepository.create(config);

      this.logger.info('White label configuration created successfully', {
        configId: createdConfig.id,
        configName: request.configName,
        userId
      });

      return {
        success: true,
        data: createdConfig,
        statusCode: 201
      };
    } catch (error) {
      this.logger.error('Failed to create white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configName: request.configName,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to create configuration',
        statusCode: 500
      };
    }
  }

  async getConfig(configId: string, userId: string): Promise<ServiceResponse<WhiteLabelConfig>> {
    try {
      const config = await this.whiteLabelRepository.findById(configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          statusCode: 404
        };
      }

      if (config.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to configuration',
          statusCode: 403
        };
      }

      return {
        success: true,
        data: config,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to get white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get configuration',
        statusCode: 500
      };
    }
  }

  async getUserConfigs(userId: string): Promise<ServiceResponse<WhiteLabelConfig[]>> {
    try {
      const configs = await this.whiteLabelRepository.findByUserId(userId);
      
      return {
        success: true,
        data: configs,
        statusCode: 200,
        meta: {
          total: configs.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user configurations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get configurations',
        statusCode: 500
      };
    }
  }

  async updateConfig(configId: string, userId: string, updates: UpdateWhiteLabelRequest): Promise<ServiceResponse<WhiteLabelConfig>> {
    try {
      const config = await this.whiteLabelRepository.findById(configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          statusCode: 404
        };
      }

      if (config.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to configuration',
          statusCode: 403
        };
      }

      // Check for name conflicts if updating configName
      if (updates.configName && updates.configName !== config.configName) {
        const existingConfigs = await this.whiteLabelRepository.findByUserId(userId);
        const nameExists = existingConfigs.some(c => 
          c.id !== configId && 
          c.configName.toLowerCase() === updates.configName!.toLowerCase()
        );

        if (nameExists) {
          return {
            success: false,
            error: 'Configuration name already exists',
            statusCode: 409
          };
        }
      }

      const updatedConfig = await this.whiteLabelRepository.update(configId, {
        ...updates,
        updatedAt: new Date()
      });

      if (!updatedConfig) {
        return {
          success: false,
          error: 'Failed to update configuration',
          statusCode: 500
        };
      }

      this.logger.info('White label configuration updated successfully', {
        configId,
        userId,
        changes: Object.keys(updates)
      });

      return {
        success: true,
        data: updatedConfig,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to update white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to update configuration',
        statusCode: 500
      };
    }
  }

  async deleteConfig(configId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      const config = await this.whiteLabelRepository.findById(configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          statusCode: 404
        };
      }

      if (config.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to configuration',
          statusCode: 403
        };
      }

      // Delete all associated assets first
      const assets = await this.whiteLabelRepository.findAssetsByConfigId(configId);
      for (const asset of assets) {
        await this.whiteLabelRepository.deleteAsset(asset.id);
      }

      const deleted = await this.whiteLabelRepository.delete(configId);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete configuration',
          statusCode: 500
        };
      }

      this.logger.info('White label configuration deleted successfully', {
        configId,
        userId
      });

      return {
        success: true,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to delete white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to delete configuration',
        statusCode: 500
      };
    }
  }

  async uploadAsset(configId: string, userId: string, file: Express.Multer.File, request: UploadAssetRequest): Promise<ServiceResponse<BrandAsset>> {
    try {
      const config = await this.whiteLabelRepository.findById(configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          statusCode: 404
        };
      }

      if (config.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to configuration',
          statusCode: 403
        };
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.mimetype)) {
        return {
          success: false,
          error: 'Invalid file type. Only images are allowed.',
          statusCode: 400
        };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size too large. Maximum 5MB allowed.',
          statusCode: 400
        };
      }

      // Generate file URL (in production, this would upload to cloud storage)
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const fileUrl = `/uploads/brand-assets/${fileName}`;

      // Extract image dimensions if possible
      let dimensions: { width: number; height: number } | undefined;
      // In a real implementation, you would use a library like sharp or jimp to get dimensions

      const asset: BrandAsset = {
        id: uuidv4(),
        whiteLabelConfigId: configId,
        assetType: request.assetType,
        assetName: request.assetName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        dimensions,
        altText: request.altText,
        usageContext: request.usageContext || {},
        isActive: true,
        createdAt: new Date()
      };

      const createdAsset = await this.whiteLabelRepository.createAsset(asset);

      // Update the configuration with asset URLs for quick access
      const updateData: Partial<WhiteLabelConfig> = {};
      switch (request.assetType) {
        case 'logo':
          updateData.logoUrl = fileUrl;
          break;
        case 'favicon':
          updateData.faviconUrl = fileUrl;
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await this.whiteLabelRepository.update(configId, {
          ...updateData,
          updatedAt: new Date()
        });
      }

      this.logger.info('Brand asset uploaded successfully', {
        assetId: createdAsset.id,
        configId,
        assetType: request.assetType,
        userId
      });

      return {
        success: true,
        data: createdAsset,
        statusCode: 201
      };
    } catch (error) {
      this.logger.error('Failed to upload brand asset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId,
        assetType: request.assetType,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to upload asset',
        statusCode: 500
      };
    }
  }

  async getAssets(configId: string, userId: string): Promise<ServiceResponse<BrandAsset[]>> {
    try {
      const config = await this.whiteLabelRepository.findById(configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          statusCode: 404
        };
      }

      if (config.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to configuration',
          statusCode: 403
        };
      }

      const assets = await this.whiteLabelRepository.findAssetsByConfigId(configId);
      
      return {
        success: true,
        data: assets,
        statusCode: 200,
        meta: {
          total: assets.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get brand assets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to get assets',
        statusCode: 500
      };
    }
  }

  async deleteAsset(assetId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // First get the asset to verify ownership
      const assets = await this.whiteLabelRepository.findAssetsByConfigId(''); // We'll need to modify this
      const asset = assets.find(a => a.id === assetId);
      
      if (!asset) {
        return {
          success: false,
          error: 'Asset not found',
          statusCode: 404
        };
      }

      // Verify the user owns the configuration
      const config = await this.whiteLabelRepository.findById(asset.whiteLabelConfigId);
      if (!config || config.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to asset',
          statusCode: 403
        };
      }

      const deleted = await this.whiteLabelRepository.deleteAsset(assetId);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete asset',
          statusCode: 500
        };
      }

      // Update configuration to remove asset URL if it was a primary asset
      const updateData: Partial<WhiteLabelConfig> = {};
      if (config.logoUrl === asset.fileUrl) {
        updateData.logoUrl = undefined;
      }
      if (config.faviconUrl === asset.fileUrl) {
        updateData.faviconUrl = undefined;
      }

      if (Object.keys(updateData).length > 0) {
        await this.whiteLabelRepository.update(asset.whiteLabelConfigId, {
          ...updateData,
          updatedAt: new Date()
        });
      }

      this.logger.info('Brand asset deleted successfully', {
        assetId,
        configId: asset.whiteLabelConfigId,
        userId
      });

      return {
        success: true,
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to delete brand asset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        assetId,
        userId
      });
      
      return {
        success: false,
        error: 'Failed to delete asset',
        statusCode: 500
      };
    }
  }

  async previewConfig(configId: string): Promise<ServiceResponse<{ previewHtml: string }>> {
    try {
      const config = await this.whiteLabelRepository.findById(configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          statusCode: 404
        };
      }

      if (!config.isActive) {
        return {
          success: false,
          error: 'Configuration is not active',
          statusCode: 400
        };
      }

      // Generate preview HTML
      const previewHtml = this.generatePreviewHTML(config);

      this.logger.debug('Generated white label preview', {
        configId,
        configName: config.configName
      });

      return {
        success: true,
        data: { previewHtml },
        statusCode: 200
      };
    } catch (error) {
      this.logger.error('Failed to generate white label preview', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId
      });
      
      return {
        success: false,
        error: 'Failed to generate preview',
        statusCode: 500
      };
    }
  }

  // Private helper methods
  private generatePreviewHTML(config: WhiteLabelConfig): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.companyName || 'QR Platform'} - Preview</title>
    <style>
        :root {
            --primary-color: ${config.primaryColor};
            --secondary-color: ${config.secondaryColor};
            --accent-color: ${config.accentColor};
            --background-color: ${config.backgroundColor};
            --text-color: ${config.textColor};
        }
        
        body {
            background-color: var(--background-color);
            color: var(--text-color);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
        }
        
        .header {
            display: flex;
            align-items: center;
            padding: 20px 0;
            border-bottom: 2px solid var(--primary-color);
        }
        
        .logo {
            width: 150px;
            height: 50px;
            background: var(--primary-color);
            margin-right: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .nav {
            background: var(--secondary-color);
            padding: 15px;
            margin: 20px 0;
        }
        
        .btn-primary {
            background: var(--primary-color);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            margin: 10px;
        }
        
        .btn-accent {
            background: var(--accent-color);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            margin: 10px;
        }
        
        .footer {
            margin-top: 40px;
            padding: 20px;
            background: var(--secondary-color);
            text-align: center;
        }
        
        ${config.customCss || ''}
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            ${config.logoUrl ? `<img src="${config.logoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%;">` : (config.companyName || 'LOGO')}
        </div>
        <h1>${config.companyName || 'Your Company'}</h1>
    </div>
    
    <div class="nav">
        <button class="btn-primary">Primary Button</button>
        <button class="btn-accent">Accent Button</button>
    </div>
    
    <div class="content">
        <h2>Welcome to ${config.companyName || 'Your Platform'}</h2>
        <p>This is a preview of your white label configuration.</p>
        <p>Primary Color: <span style="background: var(--primary-color); color: white; padding: 5px 10px;">■</span> ${config.primaryColor}</p>
        <p>Secondary Color: <span style="background: var(--secondary-color); color: white; padding: 5px 10px;">■</span> ${config.secondaryColor}</p>
        <p>Accent Color: <span style="background: var(--accent-color); color: white; padding: 5px 10px;">■</span> ${config.accentColor}</p>
    </div>
    
    <div class="footer">
        <p>&copy; 2024 ${config.companyName || 'Your Company'}. All rights reserved.</p>
        ${config.supportEmail ? `<p>Support: ${config.supportEmail}</p>` : ''}
        ${config.supportPhone ? `<p>Phone: ${config.supportPhone}</p>` : ''}
    </div>
    
    <script>
        ${config.customJs || ''}
    </script>
</body>
</html>
    `.trim();
  }
}