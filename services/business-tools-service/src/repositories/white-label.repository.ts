/**
 * White Label Repository
 * 
 * Data access layer for white label configurations and brand assets
 * following clean architecture principles.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Pool } from 'pg';
import { 
  WhiteLabelConfig, 
  BrandAsset,
  IWhiteLabelRepository,
  ILogger
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export class WhiteLabelRepository implements IWhiteLabelRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(config: Omit<WhiteLabelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WhiteLabelConfig> {
    const query = `
      INSERT INTO white_label_configs (
        id, user_id, organization_id, config_name, logo_url, logo_dark_url,
        favicon_url, primary_color, secondary_color, accent_color, 
        background_color, text_color, company_name, support_email,
        support_phone, support_url, terms_url, privacy_url, custom_css,
        custom_js, branding_settings, email_settings, domain_settings,
        feature_flags, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      config.userId,
      config.organizationId || null,
      config.configName,
      config.logoUrl || null,
      config.logoDarkUrl || null,
      config.faviconUrl || null,
      config.primaryColor || '#3B82F6',
      config.secondaryColor || '#1E40AF',
      config.accentColor || '#F59E0B',
      config.backgroundColor || '#FFFFFF',
      config.textColor || '#111827',
      config.companyName || null,
      config.supportEmail || null,
      config.supportPhone || null,
      config.supportUrl || null,
      config.termsUrl || null,
      config.privacyUrl || null,
      config.customCss || null,
      config.customJs || null,
      JSON.stringify(config.brandingSettings || {}),
      JSON.stringify(config.emailSettings || {}),
      JSON.stringify(config.domainSettings || {}),
      JSON.stringify(config.featureFlags || {}),
      config.isActive !== false
    ];

    try {
      const result = await this.db.query(query, values);
      const createdConfig = this.mapRowToConfig(result.rows[0]);
      
      this.logger.info('White label configuration created', {
        configId: id,
        userId: config.userId,
        configName: config.configName
      });

      return createdConfig;
    } catch (error) {
      this.logger.error('Failed to create white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: config.userId,
        configName: config.configName
      });
      throw error;
    }
  }

  async findById(id: string): Promise<WhiteLabelConfig | null> {
    const query = 'SELECT * FROM white_label_configs WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToConfig(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Failed to find white label configuration by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId: id
      });
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<WhiteLabelConfig[]> {
    const query = 'SELECT * FROM white_label_configs WHERE user_id = $1 ORDER BY created_at DESC';
    
    try {
      const result = await this.db.query(query, [userId]);
      const configs = result.rows.map(row => this.mapRowToConfig(row));
      
      this.logger.debug('Retrieved user white label configurations', {
        userId,
        count: configs.length
      });

      return configs;
    } catch (error) {
      this.logger.error('Failed to find white label configurations by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async update(id: string, updates: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig | null> {
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
      UPDATE white_label_configs 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedConfig = this.mapRowToConfig(result.rows[0]);
      
      this.logger.info('White label configuration updated', {
        configId: id,
        updatedFields: Object.keys(updates)
      });

      return updatedConfig;
    } catch (error) {
      this.logger.error('Failed to update white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId: id,
        updates
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM white_label_configs WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      const deleted = (result.rowCount || 0) > 0;
      
      if (deleted) {
        this.logger.info('White label configuration deleted', { configId: id });
      } else {
        this.logger.warn('Attempted to delete non-existent white label configuration', { configId: id });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete white label configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId: id
      });
      throw error;
    }
  }

  async createAsset(asset: Omit<BrandAsset, 'id' | 'createdAt'>): Promise<BrandAsset> {
    const query = `
      INSERT INTO brand_assets (
        id, white_label_config_id, asset_type, asset_name, file_url,
        file_size, mime_type, dimensions, alt_text, usage_context, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      asset.whiteLabelConfigId,
      asset.assetType,
      asset.assetName,
      asset.fileUrl,
      asset.fileSize || null,
      asset.mimeType || null,
      asset.dimensions ? JSON.stringify(asset.dimensions) : null,
      asset.altText || null,
      JSON.stringify(asset.usageContext || {}),
      asset.isActive !== false
    ];

    try {
      const result = await this.db.query(query, values);
      const createdAsset = this.mapRowToAsset(result.rows[0]);
      
      this.logger.info('Brand asset created', {
        assetId: id,
        configId: asset.whiteLabelConfigId,
        assetType: asset.assetType,
        assetName: asset.assetName
      });

      return createdAsset;
    } catch (error) {
      this.logger.error('Failed to create brand asset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId: asset.whiteLabelConfigId,
        assetType: asset.assetType
      });
      throw error;
    }
  }

  async findAssetsByConfigId(configId: string): Promise<BrandAsset[]> {
    const query = 'SELECT * FROM brand_assets WHERE white_label_config_id = $1 ORDER BY created_at DESC';
    
    try {
      const result = await this.db.query(query, [configId]);
      const assets = result.rows.map(row => this.mapRowToAsset(row));
      
      this.logger.debug('Retrieved brand assets for configuration', {
        configId,
        count: assets.length
      });

      return assets;
    } catch (error) {
      this.logger.error('Failed to find brand assets by config ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configId
      });
      throw error;
    }
  }

  async updateAsset(id: string, updates: Partial<BrandAsset>): Promise<BrandAsset | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbColumn = this.mapAssetFieldToDbColumn(key);
        if (dbColumn) {
          if (typeof value === 'object' && value !== null) {
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
      return this.findAssetById(id);
    }

    values.push(id);

    const query = `
      UPDATE brand_assets 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedAsset = this.mapRowToAsset(result.rows[0]);
      
      this.logger.info('Brand asset updated', {
        assetId: id,
        updatedFields: Object.keys(updates)
      });

      return updatedAsset;
    } catch (error) {
      this.logger.error('Failed to update brand asset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        assetId: id,
        updates
      });
      throw error;
    }
  }

  async deleteAsset(id: string): Promise<boolean> {
    const query = 'DELETE FROM brand_assets WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      const deleted = (result.rowCount || 0) > 0;
      
      if (deleted) {
        this.logger.info('Brand asset deleted', { assetId: id });
      } else {
        this.logger.warn('Attempted to delete non-existent brand asset', { assetId: id });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete brand asset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        assetId: id
      });
      throw error;
    }
  }

  private async findAssetById(id: string): Promise<BrandAsset | null> {
    const query = 'SELECT * FROM brand_assets WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToAsset(result.rows[0]) : null;
  }

  private mapRowToConfig(row: any): WhiteLabelConfig {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      configName: row.config_name,
      logoUrl: row.logo_url,
      logoDarkUrl: row.logo_dark_url,
      faviconUrl: row.favicon_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      accentColor: row.accent_color,
      backgroundColor: row.background_color,
      textColor: row.text_color,
      companyName: row.company_name,
      supportEmail: row.support_email,
      supportPhone: row.support_phone,
      supportUrl: row.support_url,
      termsUrl: row.terms_url,
      privacyUrl: row.privacy_url,
      customCss: row.custom_css,
      customJs: row.custom_js,
      brandingSettings: typeof row.branding_settings === 'string' 
        ? JSON.parse(row.branding_settings) 
        : row.branding_settings || {},
      emailSettings: typeof row.email_settings === 'string' 
        ? JSON.parse(row.email_settings) 
        : row.email_settings || {},
      domainSettings: typeof row.domain_settings === 'string' 
        ? JSON.parse(row.domain_settings) 
        : row.domain_settings || {},
      featureFlags: typeof row.feature_flags === 'string' 
        ? JSON.parse(row.feature_flags) 
        : row.feature_flags || {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToAsset(row: any): BrandAsset {
    return {
      id: row.id,
      whiteLabelConfigId: row.white_label_config_id,
      assetType: row.asset_type,
      assetName: row.asset_name,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      dimensions: row.dimensions ? JSON.parse(row.dimensions) : undefined,
      altText: row.alt_text,
      usageContext: typeof row.usage_context === 'string' 
        ? JSON.parse(row.usage_context) 
        : row.usage_context || {},
      isActive: row.is_active,
      createdAt: row.created_at
    };
  }

  private mapFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      organizationId: 'organization_id',
      configName: 'config_name',
      logoUrl: 'logo_url',
      logoDarkUrl: 'logo_dark_url',
      faviconUrl: 'favicon_url',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      accentColor: 'accent_color',
      backgroundColor: 'background_color',
      textColor: 'text_color',
      companyName: 'company_name',
      supportEmail: 'support_email',
      supportPhone: 'support_phone',
      supportUrl: 'support_url',
      termsUrl: 'terms_url',
      privacyUrl: 'privacy_url',
      customCss: 'custom_css',
      customJs: 'custom_js',
      brandingSettings: 'branding_settings',
      emailSettings: 'email_settings',
      domainSettings: 'domain_settings',
      featureFlags: 'feature_flags',
      isActive: 'is_active'
    };

    return fieldMap[field] || field;
  }

  private mapAssetFieldToDbColumn(field: string): string | null {
    const fieldMap: Record<string, string> = {
      whiteLabelConfigId: 'white_label_config_id',
      assetType: 'asset_type',
      assetName: 'asset_name',
      fileUrl: 'file_url',
      fileSize: 'file_size',
      mimeType: 'mime_type',
      altText: 'alt_text',
      usageContext: 'usage_context',
      isActive: 'is_active'
    };

    return fieldMap[field] || field;
  }
}