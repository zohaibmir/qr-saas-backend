import { Pool } from 'pg';
import { Logger } from '../services/logger.service';
import { AppError, ValidationError, NotFoundError } from '../interfaces';

/**
 * Campaign Repository
 * 
 * Handles database operations for campaigns
 */
export class CampaignRepository {
  constructor(
    private database: Pool,
    private logger: Logger
  ) {}

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData: any): Promise<any> {
    try {
      const query = `
        INSERT INTO campaigns (
          user_id, name, description, status, start_date, end_date,
          budget, target_audience, utm_source, utm_medium, utm_campaign,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        campaignData.userId,
        campaignData.name,
        campaignData.description,
        campaignData.status || 'draft',
        campaignData.startDate,
        campaignData.endDate,
        campaignData.budget,
        JSON.stringify(campaignData.targetAudience || {}),
        campaignData.utmSource,
        campaignData.utmMedium,
        campaignData.utmCampaign
      ];
      
      const result = await this.database.query(query, values);
      
      this.logger.info('Campaign created successfully', { 
        campaignId: result.rows[0].id,
        userId: campaignData.userId 
      });
      
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating campaign', { error });
      throw new AppError('CAMPAIGN_CREATE_FAILED', 'Failed to create campaign', 500);
    }
  }

  /**
   * Get campaigns for a user
   */
  async getCampaignsByUserId(userId: string): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM campaigns 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await this.database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error fetching user campaigns', { userId, error });
      throw new AppError('CAMPAIGN_FETCH_FAILED', 'Failed to fetch campaigns', 500);
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string): Promise<any> {
    try {
      const query = 'SELECT * FROM campaigns WHERE id = $1';
      const result = await this.database.query(query, [campaignId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Campaign not found');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      this.logger.error('Error fetching campaign', { campaignId, error });
      throw new AppError('CAMPAIGN_FETCH_FAILED', 'Failed to fetch campaign', 500);
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, updateData: any): Promise<any> {
    try {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      
      // Build dynamic SET clause
      for (const [key, value] of Object.entries(updateData)) {
        if (key === 'targetAudience') {
          setClauses.push(`target_audience = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
      
      setClauses.push(`updated_at = NOW()`);
      values.push(campaignId);
      
      const query = `
        UPDATE campaigns 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await this.database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Campaign not found');
      }
      
      this.logger.info('Campaign updated successfully', { campaignId });
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      this.logger.error('Error updating campaign', { campaignId, error });
      throw new AppError('CAMPAIGN_UPDATE_FAILED', 'Failed to update campaign', 500);
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const query = 'DELETE FROM campaigns WHERE id = $1 RETURNING id';
      const result = await this.database.query(query, [campaignId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Campaign not found');
      }
      
      this.logger.info('Campaign deleted successfully', { campaignId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      this.logger.error('Error deleting campaign', { campaignId, error });
      throw new AppError('CAMPAIGN_DELETE_FAILED', 'Failed to delete campaign', 500);
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    try {
      // Get basic campaign stats
      const statsQuery = `
        SELECT 
          c.*,
          COUNT(DISTINCT se.id) as total_scans,
          COUNT(DISTINCT se.visitor_id) as unique_visitors,
          COUNT(DISTINCT DATE(se.created_at)) as active_days
        FROM campaigns c
        LEFT JOIN scan_events se ON se.utm_campaign = c.utm_campaign
        WHERE c.id = $1
        GROUP BY c.id
      `;
      
      const result = await this.database.query(statsQuery, [campaignId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Campaign not found');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      this.logger.error('Error fetching campaign analytics', { campaignId, error });
      throw new AppError('CAMPAIGN_ANALYTICS_FAILED', 'Failed to fetch campaign analytics', 500);
    }
  }
}