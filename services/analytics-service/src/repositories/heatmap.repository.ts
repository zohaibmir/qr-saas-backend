import { Pool } from 'pg';
import { Logger } from '../services/logger.service';
import { AppError } from '../interfaces';

/**
 * Heatmap Repository
 * 
 * Handles database operations for heatmap analytics
 */
export class HeatmapRepository {
  constructor(
    private database: Pool,
    private logger: Logger
  ) {}

  /**
   * Get geographic heatmap data
   */
  async getGeographicHeatmap(params: {
    qrCodeId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT 
          country,
          region,
          city,
          latitude,
          longitude,
          COUNT(*) as scan_count,
          COUNT(DISTINCT visitor_id) as unique_visitors
        FROM scan_events
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramIndex = 1;
      
      if (params.qrCodeId) {
        query += ` AND qr_code_id = $${paramIndex}`;
        values.push(params.qrCodeId);
        paramIndex++;
      }
      
      if (params.startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        values.push(params.startDate);
        paramIndex++;
      }
      
      if (params.endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        values.push(params.endDate);
        paramIndex++;
      }
      
      query += `
        GROUP BY country, region, city, latitude, longitude
        HAVING COUNT(*) > 0
        ORDER BY scan_count DESC
        LIMIT 1000
      `;
      
      const result = await this.database.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Error fetching geographic heatmap', { error });
      throw new AppError('GEOGRAPHIC_HEATMAP_FAILED', 'Failed to fetch geographic heatmap', 500);
    }
  }

  /**
   * Get temporal heatmap data
   */
  async getTemporalHeatmap(params: {
    qrCodeId?: string;
    timeRange?: string;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT 
          DATE_TRUNC('hour', created_at) as time_bucket,
          EXTRACT(dow FROM created_at) as day_of_week,
          EXTRACT(hour FROM created_at) as hour_of_day,
          COUNT(*) as scan_count
        FROM scan_events
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramIndex = 1;
      
      if (params.qrCodeId) {
        query += ` AND qr_code_id = $${paramIndex}`;
        values.push(params.qrCodeId);
        paramIndex++;
      }
      
      // Add time range filter
      const timeRange = params.timeRange || '7d';
      switch (timeRange) {
        case '24h':
          query += ` AND created_at >= NOW() - INTERVAL '24 hours'`;
          break;
        case '7d':
          query += ` AND created_at >= NOW() - INTERVAL '7 days'`;
          break;
        case '30d':
          query += ` AND created_at >= NOW() - INTERVAL '30 days'`;
          break;
      }
      
      query += `
        GROUP BY time_bucket, day_of_week, hour_of_day
        ORDER BY time_bucket DESC
      `;
      
      const result = await this.database.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Error fetching temporal heatmap', { error });
      throw new AppError('TEMPORAL_HEATMAP_FAILED', 'Failed to fetch temporal heatmap', 500);
    }
  }

  /**
   * Get device heatmap data
   */
  async getDeviceHeatmap(qrCodeId?: string): Promise<any[]> {
    try {
      let query = `
        SELECT 
          device_type,
          browser_name,
          os_name,
          COUNT(*) as scan_count,
          COUNT(DISTINCT visitor_id) as unique_visitors
        FROM scan_events
        WHERE 1=1
      `;
      
      const values: any[] = [];
      
      if (qrCodeId) {
        query += ` AND qr_code_id = $1`;
        values.push(qrCodeId);
      }
      
      query += `
        GROUP BY device_type, browser_name, os_name
        ORDER BY scan_count DESC
      `;
      
      const result = await this.database.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Error fetching device heatmap', { error });
      throw new AppError('DEVICE_HEATMAP_FAILED', 'Failed to fetch device heatmap', 500);
    }
  }

  /**
   * Get scan density by time periods
   */
  async getScanDensity(params: {
    qrCodeId?: string;
    granularity?: 'hour' | 'day' | 'week';
  }): Promise<any[]> {
    try {
      const granularity = params.granularity || 'day';
      
      let query = `
        SELECT 
          DATE_TRUNC('${granularity}', created_at) as time_period,
          COUNT(*) as scan_count,
          COUNT(DISTINCT visitor_id) as unique_visitors
        FROM scan_events
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;
      
      const values: any[] = [];
      
      if (params.qrCodeId) {
        query += ` AND qr_code_id = $1`;
        values.push(params.qrCodeId);
      }
      
      query += `
        GROUP BY time_period
        ORDER BY time_period DESC
      `;
      
      const result = await this.database.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Error fetching scan density', { error });
      throw new AppError('SCAN_DENSITY_FAILED', 'Failed to fetch scan density', 500);
    }
  }
}