import { Pool } from 'pg';
import { 
  ScanEvent, 
  AnalyticsSummary, 
  IAnalyticsRepository, 
  ILogger,
  DatabaseError,
  NotFoundError 
} from '../interfaces';
import {
  ConversionGoal,
  ConversionEvent,
  ConversionFunnel,
  PeakTimeAnalysis
} from '../../../../shared/src/types/analytics.types';

export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(
    private database: Pool,
    private logger: ILogger
  ) {}

  async createScanEvent(scanEvent: Omit<ScanEvent, 'id'>): Promise<ScanEvent> {
    try {
      const query = `
        INSERT INTO scan_events (
          qr_code_id, timestamp, ip_address, user_agent,
          country, region, city, latitude, longitude,
          platform, device, referrer
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *
      `;

      const values = [
        scanEvent.qrCodeId,
        scanEvent.timestamp || new Date(),
        scanEvent.ipAddress,
        scanEvent.userAgent,
        scanEvent.location?.country,
        scanEvent.location?.region,
        scanEvent.location?.city,
        scanEvent.location?.latitude,
        scanEvent.location?.longitude,
        scanEvent.platform,
        scanEvent.device,
        scanEvent.referrer
      ];

      const result = await this.database.query(query, values);
      const row = result.rows[0];

      const event: ScanEvent = {
        id: row.id,
        qrCodeId: row.qr_code_id,
        timestamp: row.timestamp,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        location: {
          country: row.country,
          region: row.region,
          city: row.city,
          latitude: row.latitude,
          longitude: row.longitude
        },
        platform: row.platform,
        device: row.device,
        referrer: row.referrer
      };

      this.logger.info('Scan event created successfully', { 
        scanEventId: event.id,
        qrCodeId: event.qrCodeId 
      });

      return event;

    } catch (error) {
      this.logger.error('Failed to create scan event', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId: scanEvent.qrCodeId 
      });
      throw new DatabaseError('Failed to create scan event');
    }
  }

  async getScanEventsByQRCode(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<ScanEvent[]> {
    try {
      let query = `
        SELECT * FROM scan_events 
        WHERE qr_code_id = $1
      `;
      const values: any[] = [qrCodeId];

      if (startDate) {
        query += ` AND timestamp >= $${values.length + 1}`;
        values.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= $${values.length + 1}`;
        values.push(endDate);
      }

      query += ` ORDER BY timestamp DESC`;

      const result = await this.database.query(query, values);

      const events: ScanEvent[] = result.rows.map(row => ({
        id: row.id,
        qrCodeId: row.qr_code_id,
        timestamp: row.timestamp,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        location: {
          country: row.country,
          region: row.region,
          city: row.city,
          latitude: row.latitude,
          longitude: row.longitude
        },
        platform: row.platform,
        device: row.device,
        referrer: row.referrer
      }));

      this.logger.debug('Retrieved scan events', { 
        qrCodeId,
        eventCount: events.length,
        startDate,
        endDate 
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to retrieve scan events', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId 
      });
      throw new DatabaseError('Failed to retrieve scan events');
    }
  }

  async getAnalyticsSummary(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsSummary> {
    try {
      const [
        totalScans,
        uniqueScans,
        scansByDate,
        platformBreakdown,
        deviceBreakdown,
        geographicData
      ] = await Promise.all([
        this.getTotalScansForQRCode(qrCodeId),
        this.getUniqueScansForQRCode(qrCodeId),
        this.getScansGroupedByDate(qrCodeId, startDate, endDate),
        this.getPlatformBreakdown(qrCodeId),
        this.getDeviceBreakdown(qrCodeId),
        this.getGeographicData(qrCodeId)
      ]);

      const timeSeriesData = scansByDate.map(item => ({
        timestamp: item.date,
        scans: item.scans,
        uniqueScans: Math.floor(item.scans * 0.8) // Approximate unique scans
      }));

      const summary: AnalyticsSummary = {
        totalScans,
        uniqueScans,
        scansByDate,
        platformBreakdown,
        deviceBreakdown,
        geographicData,
        timeSeriesData
      };

      this.logger.info('Analytics summary generated', { 
        qrCodeId,
        totalScans,
        uniqueScans 
      });

      return summary;

    } catch (error) {
      this.logger.error('Failed to generate analytics summary', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId 
      });
      throw new DatabaseError('Failed to generate analytics summary');
    }
  }

  async getTotalScansForQRCode(qrCodeId: string): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as total FROM scan_events WHERE qr_code_id = $1';
      const result = await this.database.query(query, [qrCodeId]);
      return parseInt(result.rows[0].total);
    } catch (error) {
      this.logger.error('Failed to get total scans', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId });
      throw new DatabaseError('Failed to get total scans');
    }
  }

  async getUniqueScansForQRCode(qrCodeId: string): Promise<number> {
    try {
      const query = 'SELECT COUNT(DISTINCT ip_address) as unique_scans FROM scan_events WHERE qr_code_id = $1 AND ip_address IS NOT NULL';
      const result = await this.database.query(query, [qrCodeId]);
      return parseInt(result.rows[0].unique_scans);
    } catch (error) {
      this.logger.error('Failed to get unique scans', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId });
      throw new DatabaseError('Failed to get unique scans');
    }
  }

  async getScansGroupedByDate(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<{ date: string; scans: number }[]> {
    try {
      let query = `
        SELECT DATE(timestamp) as date, COUNT(*) as scans
        FROM scan_events 
        WHERE qr_code_id = $1
      `;
      const values: any[] = [qrCodeId];

      if (startDate) {
        query += ` AND timestamp >= $${values.length + 1}`;
        values.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= $${values.length + 1}`;
        values.push(endDate);
      }

      query += ` GROUP BY DATE(timestamp) ORDER BY date DESC`;

      const result = await this.database.query(query, values);
      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        scans: parseInt(row.scans)
      }));
    } catch (error) {
      this.logger.error('Failed to get scans by date', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId });
      throw new DatabaseError('Failed to get scans by date');
    }
  }

  async getPlatformBreakdown(qrCodeId: string): Promise<{ [platform: string]: number }> {
    try {
      const query = `
        SELECT platform, COUNT(*) as count
        FROM scan_events 
        WHERE qr_code_id = $1 AND platform IS NOT NULL
        GROUP BY platform
      `;
      const result = await this.database.query(query, [qrCodeId]);
      
      const breakdown: { [platform: string]: number } = {};
      result.rows.forEach(row => {
        breakdown[row.platform] = parseInt(row.count);
      });
      
      return breakdown;
    } catch (error) {
      this.logger.error('Failed to get platform breakdown', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId });
      throw new DatabaseError('Failed to get platform breakdown');
    }
  }

  async getDeviceBreakdown(qrCodeId: string): Promise<{ [device: string]: number }> {
    try {
      const query = `
        SELECT device, COUNT(*) as count
        FROM scan_events 
        WHERE qr_code_id = $1 AND device IS NOT NULL
        GROUP BY device
      `;
      const result = await this.database.query(query, [qrCodeId]);
      
      const breakdown: { [device: string]: number } = {};
      result.rows.forEach(row => {
        breakdown[row.device] = parseInt(row.count);
      });
      
      return breakdown;
    } catch (error) {
      this.logger.error('Failed to get device breakdown', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId });
      throw new DatabaseError('Failed to get device breakdown');
    }
  }

  async getGeographicData(qrCodeId: string): Promise<{ country: string; scans: number; percentage: number }[]> {
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM scan_events WHERE qr_code_id = $1';
      const totalResult = await this.database.query(totalQuery, [qrCodeId]);
      const totalScans = parseInt(totalResult.rows[0].total);

      if (totalScans === 0) {
        return [];
      }

      const query = `
        SELECT country, COUNT(*) as scans
        FROM scan_events 
        WHERE qr_code_id = $1 AND country IS NOT NULL
        GROUP BY country
        ORDER BY scans DESC
      `;
      const result = await this.database.query(query, [qrCodeId]);
      
      return result.rows.map(row => ({
        country: row.country,
        scans: parseInt(row.scans),
        percentage: Math.round((parseInt(row.scans) / totalScans) * 100)
      }));
    } catch (error) {
      this.logger.error('Failed to get geographic data', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId });
      throw new DatabaseError('Failed to get geographic data');
    }
  }

  // ===============================================
  // ADVANCED ANALYTICS METHODS
  // ===============================================

  // Conversion Tracking Methods
  async createConversionGoal(goal: ConversionGoal): Promise<ConversionGoal> {
    try {
      const result = await this.database.query(`
        INSERT INTO conversion_goals (id, qr_code_id, name, goal_type, target_url, target_value, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [goal.id, goal.qrCodeId, goal.name, goal.type, goal.targetUrl, goal.targetValue, goal.isActive]);
      
      return this.mapRowToConversionGoal(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating conversion goal:', error);
      throw error;
    }
  }

  async updateConversionGoal(goalId: string, updates: Partial<ConversionGoal>): Promise<ConversionGoal> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'createdAt')
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE conversion_goals 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *, created_at, updated_at
      `;

      const values = [goalId, ...Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'createdAt')
        .map(key => updates[key as keyof ConversionGoal])];

      const result = await this.database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Conversion goal not found');
      }

      return this.mapRowToConversionGoal(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to update conversion goal', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        goalId 
      });
      throw new DatabaseError('Failed to update conversion goal');
    }
  }

  async getConversionGoal(goalId: string): Promise<ConversionGoal | null> {
    try {
      const query = 'SELECT *, created_at, updated_at FROM conversion_goals WHERE id = $1';
      const result = await this.database.query(query, [goalId]);
      
      return result.rows.length > 0 ? this.mapRowToConversionGoal(result.rows[0]) : null;

    } catch (error) {
      this.logger.error('Failed to get conversion goal', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        goalId 
      });
      throw new DatabaseError('Failed to get conversion goal');
    }
  }

  async getConversionGoalsByQRCode(qrCodeId: string): Promise<ConversionGoal[]> {
    try {
      const query = `
        SELECT *, created_at, updated_at 
        FROM conversion_goals 
        WHERE qr_code_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await this.database.query(query, [qrCodeId]);
      return result.rows.map(row => this.mapRowToConversionGoal(row));

    } catch (error) {
      this.logger.error('Failed to get conversion goals by QR code', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId 
      });
      throw new DatabaseError('Failed to get conversion goals by QR code');
    }
  }

  async createConversionEvent(event: Omit<ConversionEvent, 'id' | 'createdAt'>): Promise<ConversionEvent> {
    return this.recordConversionEvent(event);
  }

  async recordConversionEvent(event: Omit<ConversionEvent, 'id' | 'createdAt'>): Promise<ConversionEvent> {
    try {
      const query = `
        INSERT INTO conversion_events (
          id, goal_id, scan_event_id, qr_code_id, user_id,
          conversion_value, conversion_data, attribution_model, time_to_conversion, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
        ) RETURNING *
      `;
      
      const result = await this.database.query(query, [
        event.goalId, event.scanEventId, event.qrCodeId, event.userId,
        event.conversionValue, JSON.stringify(event.conversionData),
        event.attributionModel, event.timeToConversion
      ]);
      
      return this.mapRowToConversionEvent(result.rows[0]);
    } catch (error) {
      this.logger.error('Error recording conversion event:', error);
      throw error;
    }
  }

  async getConversionEventsByGoal(goalId: string, startDate?: Date, endDate?: Date): Promise<ConversionEvent[]> {
    try {
      let query = 'SELECT * FROM conversion_events WHERE goal_id = $1';
      const values: any[] = [goalId];

      if (startDate) {
        query += ' AND timestamp >= $' + (values.length + 1);
        values.push(startDate);
      }

      if (endDate) {
        query += ' AND timestamp <= $' + (values.length + 1);
        values.push(endDate);
      }

      query += ' ORDER BY timestamp DESC';

      const result = await this.database.query(query, values);
      return result.rows.map(row => this.mapRowToConversionEvent(row));

    } catch (error) {
      this.logger.error('Failed to get conversion events by goal', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        goalId 
      });
      throw new DatabaseError('Failed to get conversion events by goal');
    }
  }

  async getConversionFunnelData(goalId: string, startDate?: Date, endDate?: Date): Promise<ConversionFunnel> {
    try {
      let query = `
        SELECT 
          step_number,
          step_name,
          COUNT(*) as step_completions,
          COUNT(DISTINCT session_id) as unique_sessions,
          SUM(conversion_value) as total_value
        FROM conversion_events 
        WHERE goal_id = $1
      `;
      const values: any[] = [goalId];

      if (startDate) {
        query += ' AND timestamp >= $' + (values.length + 1);
        values.push(startDate);
      }

      if (endDate) {
        query += ' AND timestamp <= $' + (values.length + 1);
        values.push(endDate);
      }

      query += ' GROUP BY step_number, step_name ORDER BY step_number';

      const result = await this.database.query(query, values);
      
      const steps = result.rows.map(row => ({
        stepNumber: row.step_number,
        stepName: row.step_name,
        completions: parseInt(row.step_completions),
        uniqueUsers: parseInt(row.unique_sessions),
        conversionRate: 0,
        dropoffRate: 0,
        averageValue: row.total_value ? parseFloat(row.total_value) / parseInt(row.step_completions) : 0
      }));

      for (let i = 0; i < steps.length; i++) {
        if (i === 0) {
          steps[i].conversionRate = 100;
          steps[i].dropoffRate = 0;
        } else {
          const previousStep = steps[i - 1];
          steps[i].conversionRate = (steps[i].completions / previousStep.completions) * 100;
          steps[i].dropoffRate = 100 - steps[i].conversionRate;
        }
      }

      return {
        goalId,
        goalName: 'Conversion Goal',
        stages: steps.map(step => ({
          stage: `Step ${step.stepNumber}`,
          count: step.completions,
          conversionRate: step.conversionRate,
          dropOffRate: 100 - step.conversionRate
        })),
        totalConversions: steps.length > 0 ? steps[steps.length - 1].completions : 0,
        overallConversionRate: steps.length > 0 ? (steps[steps.length - 1].uniqueUsers / steps[0].uniqueUsers) * 100 : 0,
        averageTimeToConversion: steps.reduce((sum, step) => sum + step.averageValue, 0) / steps.length || 0,
        topConvertingSegments: []
      };

    } catch (error) {
      this.logger.error('Failed to get conversion funnel data', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        goalId 
      });
      throw new DatabaseError('Failed to get conversion funnel data');
    }
  }

  // Heatmap Data Methods
  async updateHeatmapData(qrCodeId: string, heatmapType: string, dataKey: string, increment: number, metadata?: any): Promise<void> {
    try {
      await this.database.query(
        'SELECT update_heatmap_data($1, $2, $3, $4, $5, $6, $7)',
        [
          qrCodeId, heatmapType, dataKey, increment,
          metadata?.coordinates_lat || null,
          metadata?.coordinates_lng || null,
          metadata?.time_period || null
        ]
      );

    } catch (error) {
      this.logger.error('Failed to update heatmap data', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId, heatmapType, dataKey 
      });
      throw new DatabaseError('Failed to update heatmap data');
    }
  }

  async getHeatmapData(qrCodeId: string, heatmapType: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM heatmap_data 
        WHERE qr_code_id = $1 AND heatmap_type = $2
      `;
      const values: any[] = [qrCodeId, heatmapType];

      if (startDate) {
        query += ' AND generated_at >= $' + (values.length + 1);
        values.push(startDate);
      }

      if (endDate) {
        query += ' AND generated_at <= $' + (values.length + 1);
        values.push(endDate);
      }

      query += ' ORDER BY data_value DESC';

      const result = await this.database.query(query, values);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get heatmap data', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId, heatmapType 
      });
      throw new DatabaseError('Failed to get heatmap data');
    }
  }

  async normalizeHeatmapData(qrCodeId: string, heatmapType: string): Promise<number> {
    try {
      const result = await this.database.query(
        'SELECT normalize_heatmap_data($1, $2)',
        [qrCodeId, heatmapType]
      );

      return result.rows[0]?.normalize_heatmap_data || 0;

    } catch (error) {
      this.logger.error('Failed to normalize heatmap data', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId, heatmapType 
      });
      throw new DatabaseError('Failed to normalize heatmap data');
    }
  }

  // Real-time Metrics Methods
  async cacheRealtimeMetric(qrCodeId: string, metricType: string, value: number, unit?: string, ttl?: number): Promise<void> {
    try {
      await this.database.query(
        'SELECT cache_realtime_metric($1, $2, $3, $4, $5, $6, $7)',
        [qrCodeId, metricType, value, unit || null, 'instant', null, ttl || 3600]
      );

    } catch (error) {
      this.logger.error('Failed to cache realtime metric', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId, metricType 
      });
      throw new DatabaseError('Failed to cache realtime metric');
    }
  }

  async getRealtimeMetrics(qrCodeId: string, metricTypes?: string[]): Promise<Record<string, any>> {
    try {
      let query = `
        SELECT metric_type, metric_value, metric_unit, tags, timestamp
        FROM realtime_metrics_cache 
        WHERE qr_code_id = $1 AND expires_at > NOW()
      `;
      const values: any[] = [qrCodeId];

      if (metricTypes && metricTypes.length > 0) {
        query += ' AND metric_type = ANY($2)';
        values.push(metricTypes);
      }

      query += ' ORDER BY timestamp DESC';

      const result = await this.database.query(query, values);
      
      const metrics: Record<string, any> = {};
      result.rows.forEach(row => {
        metrics[row.metric_type] = {
          value: parseFloat(row.metric_value),
          unit: row.metric_unit,
          tags: row.tags,
          timestamp: row.timestamp
        };
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get realtime metrics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId 
      });
      throw new DatabaseError('Failed to get realtime metrics');
    }
  }

  async clearExpiredMetrics(): Promise<number> {
    try {
      const result = await this.database.query(
        'DELETE FROM realtime_metrics_cache WHERE expires_at <= NOW()'
      );

      return result.rowCount || 0;

    } catch (error) {
      this.logger.error('Failed to clear expired metrics', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to clear expired metrics');
    }
  }

  // Peak Time Analysis Methods
  async savePeakTimeAnalysis(qrCodeId: string, analysis: PeakTimeAnalysis): Promise<void> {
    return this.storePeakTimeAnalysis(qrCodeId, analysis);
  }

  async storePeakTimeAnalysis(qrCodeId: string, analysis: PeakTimeAnalysis): Promise<void> {
    try {
      const query = `
        INSERT INTO peak_time_analysis (
          qr_code_id, analysis_date, time_granularity, peak_periods,
          trough_periods, business_hours_performance, day_of_week_patterns,
          seasonal_trends, confidence_score, data_points_analyzed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (qr_code_id, analysis_date) DO UPDATE SET
          peak_periods = EXCLUDED.peak_periods,
          trough_periods = EXCLUDED.trough_periods,
          business_hours_performance = EXCLUDED.business_hours_performance,
          day_of_week_patterns = EXCLUDED.day_of_week_patterns,
          seasonal_trends = EXCLUDED.seasonal_trends,
          confidence_score = EXCLUDED.confidence_score,
          data_points_analyzed = EXCLUDED.data_points_analyzed,
          updated_at = NOW()
      `;
      
      await this.database.query(query, [
        qrCodeId,
        new Date(),
        'hourly',
        JSON.stringify(analysis.peakHours || []),
        JSON.stringify([]),
        JSON.stringify({ businessHours: 0, afterHours: 0 }),
        JSON.stringify(analysis.dailyDistribution || []),
        JSON.stringify(analysis.seasonalTrends || []),
        90.0,
        100
      ]);
    } catch (error) {
      this.logger.error('Error storing peak time analysis:', error);
      throw error;
    }
  }

  async getPeakTimeAnalysis(qrCodeId: string, date?: Date): Promise<PeakTimeAnalysis | null> {
    try {
      let query = 'SELECT * FROM peak_time_analysis WHERE qr_code_id = $1';
      const values: any[] = [qrCodeId];

      if (date) {
        query += ' AND analysis_date = $2';
        values.push(date);
      }

      query += ' ORDER BY analysis_date DESC LIMIT 1';

      const result = await this.database.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        hourlyDistribution: [],
        dailyDistribution: row.day_of_week_patterns ? JSON.parse(row.day_of_week_patterns) : [],
        seasonalTrends: row.seasonal_trends ? JSON.parse(row.seasonal_trends) : [],
        peakHours: row.peak_periods ? JSON.parse(row.peak_periods) : [],
        recommendations: row.recommendations ? JSON.parse(row.recommendations) : []
      };

    } catch (error) {
      this.logger.error('Failed to get peak time analysis', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId 
      });
      throw new DatabaseError('Failed to get peak time analysis');
    }
  }

  // Export Jobs Methods
  async createExportJob(job: Omit<any, 'id' | 'createdAt'>): Promise<any> {
    try {
      const query = `
        INSERT INTO analytics_export_jobs (
          user_id, qr_code_id, export_type, export_format, configuration,
          file_name, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        job.userId, job.qrCodeId, job.exportType, job.exportFormat,
        JSON.stringify(job.configuration), job.fileName, job.status || 'queued',
        job.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to create export job', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        job 
      });
      throw new DatabaseError('Failed to create export job');
    }
  }

  async updateExportJob(jobId: string, updates: any): Promise<any> {
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE analytics_export_jobs 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const values = [jobId, ...Object.values(updates)];
      const result = await this.database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Export job not found');
      }

      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to update export job', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId 
      });
      throw new DatabaseError('Failed to update export job');
    }
  }

  async getExportJob(jobId: string): Promise<any | null> {
    try {
      const result = await this.database.query(
        'SELECT * FROM analytics_export_jobs WHERE id = $1',
        [jobId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      this.logger.error('Failed to get export job', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId 
      });
      throw new DatabaseError('Failed to get export job');
    }
  }

  async getUserExportJobs(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await this.database.query(
        'SELECT * FROM analytics_export_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get user export jobs', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      throw new DatabaseError('Failed to get user export jobs');
    }
  }

  // Analytics Alerts Methods
  async createAnalyticsAlert(alert: Omit<any, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    try {
      const query = `
        INSERT INTO analytics_alerts (
          user_id, qr_code_id, alert_type, alert_name, conditions,
          notification_channels, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        alert.userId, alert.qrCodeId, alert.alertType, alert.alertName,
        JSON.stringify(alert.conditions), JSON.stringify(alert.notificationChannels),
        alert.isActive !== false
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to create analytics alert', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alert 
      });
      throw new DatabaseError('Failed to create analytics alert');
    }
  }

  async getAnalyticsAlerts(qrCodeId: string): Promise<any[]> {
    try {
      const result = await this.database.query(
        'SELECT * FROM analytics_alerts WHERE qr_code_id = $1 AND is_active = true ORDER BY created_at DESC',
        [qrCodeId]
      );
      
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get analytics alerts', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId 
      });
      throw new DatabaseError('Failed to get analytics alerts');
    }
  }

  async updateAlertTrigger(alertId: string, triggeredAt: Date, value: number): Promise<void> {
    try {
      const client = await this.database.connect();
      
      try {
        await client.query('BEGIN');
        
        await client.query(
          'UPDATE analytics_alerts SET last_triggered_at = $1, trigger_count = trigger_count + 1 WHERE id = $2',
          [triggeredAt, alertId]
        );
        
        await client.query(
          'INSERT INTO analytics_alert_history (alert_id, triggered_at, trigger_value) VALUES ($1, $2, $3)',
          [alertId, triggeredAt, value]
        );
        
        await client.query('COMMIT');
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('Failed to update alert trigger', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId 
      });
      throw new DatabaseError('Failed to update alert trigger');
    }
  }

  // Helper methods
  private mapRowToConversionGoal(row: any): ConversionGoal {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      name: row.name,
      type: row.goal_type,
      targetUrl: row.target_url,
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionEvent(row: any): ConversionEvent {
    return {
      id: row.id,
      goalId: row.goal_id,
      scanEventId: row.scan_event_id,
      qrCodeId: row.qr_code_id,
      userId: row.user_id,
      conversionValue: row.conversion_value ? parseFloat(row.conversion_value) : undefined,
      conversionData: row.conversion_data ? JSON.parse(row.conversion_data) : undefined,
      attributionModel: row.attribution_model,
      timeToConversion: row.time_to_conversion,
      createdAt: row.created_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}