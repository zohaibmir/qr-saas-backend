import { Pool } from 'pg';
import { 
  ScanEvent, 
  AnalyticsSummary, 
  IAnalyticsRepository, 
  ILogger,
  DatabaseError,
  NotFoundError,
  ConversionGoal,
  ConversionEvent,
  ConversionFunnel,
  PeakTimeAnalysis
} from '../interfaces';

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
        this.getTotalScans(qrCodeId, startDate, endDate),
        this.getUniqueScans(qrCodeId, startDate, endDate),
        this.getScansGroupedByDate(qrCodeId, startDate, endDate),
        this.getPlatformBreakdown(qrCodeId, startDate, endDate),
        this.getDeviceBreakdown(qrCodeId, startDate, endDate),
        this.getGeographicData(qrCodeId, startDate, endDate)
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

  async getUserAnalyticsSummary(userId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      this.logger.info('=== START getUserAnalyticsSummary ===', { userId, startDate, endDate });
      
      // Debug: Check if we're using userId path or all users path
      if (userId) {
        this.logger.info('Using USER-SPECIFIC analytics path', { userId });
      } else {
        this.logger.info('Using ALL USERS analytics path');
      }
      
      // Get aggregated data across user's QR codes (or all users if userId not provided)
      this.logger.info('Starting parallel data fetch...');
      
      const [
        totalScans,
        uniqueScans,
        scanTrends,
        platformBreakdown,
        deviceBreakdown,
        geographicData
      ] = await Promise.all([
        userId ? this.getTotalScansForUser(userId, startDate, endDate) : this.getTotalScans(undefined, startDate, endDate),
        userId ? this.getUniqueScansForUser(userId, startDate, endDate) : this.getUniqueScans(undefined, startDate, endDate),
        userId ? this.getScansGroupedByDateForUser(userId, startDate, endDate) : this.getScansGroupedByDate(undefined, startDate, endDate),
        userId ? this.getPlatformBreakdownForUser(userId, startDate, endDate) : this.getPlatformBreakdown(undefined, startDate, endDate),
        userId ? this.getDeviceBreakdownForUser(userId, startDate, endDate) : this.getDeviceBreakdown(undefined, startDate, endDate),
        userId ? this.getGeographicDataForUser(userId, startDate, endDate) : this.getGeographicData(undefined, startDate, endDate)
      ]);

      this.logger.info('=== ANALYTICS RESULTS ===', {
        totalScans,
        uniqueScans,
        scanTrendsCount: scanTrends.length,
        platformBreakdownKeys: Object.keys(platformBreakdown),
        deviceBreakdownKeys: Object.keys(deviceBreakdown),
        geographicDataCount: geographicData.length
      });

      return {
        totalScans,
        uniqueScans,
        scanTrends,
        platformBreakdown,
        deviceBreakdown,
        geographicData
      };
    } catch (error) {
      this.logger.error('Failed to get user analytics summary', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new DatabaseError('Failed to get user analytics summary');
    }
  }

  async getTotalScans(qrCodeId?: string, startDate?: Date, endDate?: Date, userId?: string): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as total FROM scan_events se';
      const values: any[] = [];
      let whereConditions: string[] = [];

      this.logger.info('=== getTotalScans DEBUG ===', { qrCodeId, startDate, endDate, userId });

      if (qrCodeId) {
        whereConditions.push(`se.qr_code_id = $${values.length + 1}`);
        values.push(qrCodeId);
        this.logger.info('Added qrCodeId condition', { qrCodeId });
      } else if (userId) {
        // Join with qr_codes table to filter by user ownership (cast UUID to text for join)
        query = 'SELECT COUNT(*) as total FROM scan_events se JOIN qr_codes qr ON se.qr_code_id = qr.id::text';
        whereConditions.push(`qr.user_id = $${values.length + 1}`);
        values.push(userId);
        this.logger.info('Added userId condition with JOIN', { userId });
      } else {
        this.logger.info('No qrCodeId or userId - querying ALL scan_events');
      }

      if (startDate) {
        whereConditions.push(`se.timestamp >= $${values.length + 1}`);
        values.push(startDate);
        this.logger.info('Added startDate condition', { startDate });
      }

      if (endDate) {
        whereConditions.push(`se.timestamp <= $${values.length + 1}`);
        values.push(endDate);
        this.logger.info('Added endDate condition', { endDate });
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      this.logger.info('Final query and values', { query, values });

      const result = await this.database.query(query, values);
      const total = parseInt(result.rows[0].total);
      
      this.logger.info('Query result', { total, rawResult: result.rows[0] });
      
      return total;
    } catch (error) {
      this.logger.error('Failed to get total scans', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        stack: error instanceof Error ? error.stack : undefined,
        qrCodeId, 
        userId 
      });
      throw new DatabaseError('Failed to get total scans');
    }
  }

  // User-specific helper methods
  async getTotalScansForUser(userId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    return this.getTotalScans(undefined, startDate, endDate, userId);
  }

  async getUniqueScansForUser(userId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    return this.getUniqueScans(undefined, startDate, endDate, userId);
  }

  async getScansGroupedByDateForUser(userId?: string, startDate?: Date, endDate?: Date): Promise<{ date: string; scans: number }[]> {
    return this.getScansGroupedByDate(undefined, startDate, endDate, userId);
  }

  async getPlatformBreakdownForUser(userId?: string, startDate?: Date, endDate?: Date): Promise<{ [platform: string]: number }> {
    return this.getPlatformBreakdown(undefined, startDate, endDate, userId);
  }

  async getDeviceBreakdownForUser(userId?: string, startDate?: Date, endDate?: Date): Promise<{ [device: string]: number }> {
    return this.getDeviceBreakdown(undefined, startDate, endDate, userId);
  }

  async getGeographicDataForUser(userId?: string, startDate?: Date, endDate?: Date): Promise<{ country: string; scans: number }[]> {
    return this.getGeographicData(undefined, startDate, endDate, userId);
  }

  // Keep the original method for backwards compatibility
  async getTotalScansForQRCode(qrCodeId: string): Promise<number> {
    return this.getTotalScans(qrCodeId);
  }

  async getUniqueScans(qrCodeId?: string, startDate?: Date, endDate?: Date, userId?: string): Promise<number> {
    try {
      let query = 'SELECT COUNT(DISTINCT se.ip_address) as unique_scans FROM scan_events se';
      const values: any[] = [];
      let whereConditions: string[] = ['se.ip_address IS NOT NULL'];

      if (qrCodeId) {
        whereConditions.push(`se.qr_code_id = $${values.length + 1}`);
        values.push(qrCodeId);
      } else if (userId) {
        // Join with qr_codes table to filter by user ownership
        query = 'SELECT COUNT(DISTINCT se.ip_address) as unique_scans FROM scan_events se JOIN qr_codes qr ON se.qr_code_id = qr.id::text';
        whereConditions.push(`qr.user_id = $${values.length + 1}`);
        values.push(userId);
      }

      if (startDate) {
        whereConditions.push(`se.timestamp >= $${values.length + 1}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`se.timestamp <= $${values.length + 1}`);
        values.push(endDate);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      const result = await this.database.query(query, values);
      return parseInt(result.rows[0].unique_scans);
    } catch (error) {
      this.logger.error('Failed to get unique scans', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId, userId });
      throw new DatabaseError('Failed to get unique scans');
    }
  }

  // Keep the original method for backwards compatibility
  async getUniqueScansForQRCode(qrCodeId: string): Promise<number> {
    return this.getUniqueScans(qrCodeId);
  }

  async getScansGroupedByDate(qrCodeId?: string, startDate?: Date, endDate?: Date, userId?: string): Promise<{ date: string; scans: number }[]> {
    try {
      let query = `
        SELECT DATE(se.timestamp) as date, COUNT(*) as scans
        FROM scan_events se
      `;
      const values: any[] = [];
      let whereConditions: string[] = [];

      if (qrCodeId) {
        whereConditions.push(`se.qr_code_id = $${values.length + 1}`);
        values.push(qrCodeId);
      } else if (userId) {
        // Join with qr_codes table to filter by user ownership
        query = `
          SELECT DATE(se.timestamp) as date, COUNT(*) as scans
          FROM scan_events se 
          JOIN qr_codes qr ON se.qr_code_id = qr.id::text
        `;
        whereConditions.push(`qr.user_id = $${values.length + 1}`);
        values.push(userId);
      }

      if (startDate) {
        whereConditions.push(`se.timestamp >= $${values.length + 1}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`se.timestamp <= $${values.length + 1}`);
        values.push(endDate);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      query += ` GROUP BY DATE(se.timestamp) ORDER BY date DESC`;

      const result = await this.database.query(query, values);
      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        scans: parseInt(row.scans)
      }));
    } catch (error) {
      this.logger.error('Failed to get scans by date', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId, userId });
      throw new DatabaseError('Failed to get scans by date');
    }
  }

  async getPlatformBreakdown(qrCodeId?: string, startDate?: Date, endDate?: Date, userId?: string): Promise<{ [platform: string]: number }> {
    try {
      let query = `
        SELECT se.platform, COUNT(*) as count
        FROM scan_events se
      `;
      const values: any[] = [];
      let whereConditions: string[] = ['se.platform IS NOT NULL'];

      if (qrCodeId) {
        whereConditions.push(`se.qr_code_id = $${values.length + 1}`);
        values.push(qrCodeId);
      } else if (userId) {
        // Join with qr_codes table to filter by user ownership
        query = `
          SELECT se.platform, COUNT(*) as count
          FROM scan_events se 
          JOIN qr_codes qr ON se.qr_code_id = qr.id::text
        `;
        whereConditions.push(`qr.user_id = $${values.length + 1}`);
        values.push(userId);
      }

      if (startDate) {
        whereConditions.push(`se.timestamp >= $${values.length + 1}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`se.timestamp <= $${values.length + 1}`);
        values.push(endDate);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      query += ` GROUP BY se.platform`;

      const result = await this.database.query(query, values);
      
      const breakdown: { [platform: string]: number } = {};
      result.rows.forEach(row => {
        breakdown[row.platform] = parseInt(row.count);
      });
      
      return breakdown;
    } catch (error) {
      this.logger.error('Failed to get platform breakdown', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId, userId });
      throw new DatabaseError('Failed to get platform breakdown');
    }
  }

  async getDeviceBreakdown(qrCodeId?: string, startDate?: Date, endDate?: Date, userId?: string): Promise<{ [device: string]: number }> {
    try {
      let query = `
        SELECT se.device, COUNT(*) as count
        FROM scan_events se
      `;
      const values: any[] = [];
      let whereConditions: string[] = ['se.device IS NOT NULL'];

      if (qrCodeId) {
        whereConditions.push(`se.qr_code_id = $${values.length + 1}`);
        values.push(qrCodeId);
      } else if (userId) {
        // Join with qr_codes table to filter by user ownership
        query = `
          SELECT se.device, COUNT(*) as count
          FROM scan_events se 
          JOIN qr_codes qr ON se.qr_code_id = qr.id::text
        `;
        whereConditions.push(`qr.user_id = $${values.length + 1}`);
        values.push(userId);
      }

      if (startDate) {
        whereConditions.push(`se.timestamp >= $${values.length + 1}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`se.timestamp <= $${values.length + 1}`);
        values.push(endDate);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      query += ` GROUP BY se.device`;

      const result = await this.database.query(query, values);
      
      const breakdown: { [device: string]: number } = {};
      result.rows.forEach(row => {
        breakdown[row.device] = parseInt(row.count);
      });
      
      return breakdown;
    } catch (error) {
      this.logger.error('Failed to get device breakdown', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId, userId });
      throw new DatabaseError('Failed to get device breakdown');
    }
  }

  async getGeographicData(qrCodeId?: string, startDate?: Date, endDate?: Date, userId?: string): Promise<{ country: string; scans: number; percentage: number }[]> {
    try {
      // Get total scans first
      const totalScans = await this.getTotalScans(qrCodeId, startDate, endDate, userId);

      if (totalScans === 0) {
        return [];
      }

      let query = `
        SELECT se.country, COUNT(*) as scans
        FROM scan_events se
      `;
      const values: any[] = [];
      let whereConditions: string[] = ['se.country IS NOT NULL'];

      if (qrCodeId) {
        whereConditions.push(`se.qr_code_id = $${values.length + 1}`);
        values.push(qrCodeId);
      } else if (userId) {
        // Join with qr_codes table to filter by user ownership
        query = `
          SELECT se.country, COUNT(*) as scans
          FROM scan_events se 
          JOIN qr_codes qr ON se.qr_code_id = qr.id::text
        `;
        whereConditions.push(`qr.user_id = $${values.length + 1}`);
        values.push(userId);
      }

      if (startDate) {
        whereConditions.push(`se.timestamp >= $${values.length + 1}`);
        values.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`se.timestamp <= $${values.length + 1}`);
        values.push(endDate);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      query += ` GROUP BY se.country ORDER BY scans DESC`;

      const result = await this.database.query(query, values);
      
      return result.rows.map(row => ({
        country: row.country,
        scans: parseInt(row.scans),
        percentage: Math.round((parseInt(row.scans) / totalScans) * 100)
      }));
    } catch (error) {
      this.logger.error('Failed to get geographic data', { error: error instanceof Error ? error.message : 'Unknown error', qrCodeId, userId });
      throw new DatabaseError('Failed to get geographic data');
    }
  }



  // ===============================================
  // ADVANCED ANALYTICS METHODS
  // ===============================================

  // Conversion Tracking Methods
  async createConversionGoal(goal: Omit<ConversionGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionGoal> {
    try {
      const result = await this.database.query(`
        INSERT INTO conversion_goals (id, qr_code_id, user_id, name, goal_type, target_url, value_amount, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [goal.qrCodeId, goal.userId || null, goal.name, goal.type, goal.targetUrl, goal.targetValue, goal.isActive]);
      
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

  // ========== SUPER ADMIN ANALYTICS METHODS ==========
  
  async getSuperAdminSystemMetrics(): Promise<{totalUsers: number; totalQRCodes: number; totalScans: number}> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM qr_codes WHERE is_active = true) as total_qr_codes,
          (SELECT COUNT(*) FROM scan_events) as total_scans
      `;

      const result = await this.database.query(query);
      const row = result.rows[0];

      return {
        totalUsers: parseInt(row.total_users) || 0,
        totalQRCodes: parseInt(row.total_qr_codes) || 0,
        totalScans: parseInt(row.total_scans) || 0
      };
    } catch (error) {
      this.logger.error('Failed to get super admin system metrics', { error });
      throw new DatabaseError('Failed to fetch system metrics');
    }
  }
  
  async getTopUsersByScans(limit: number = 10): Promise<Array<{userId: string; totalScans: number; qrCodesCount: number; plan: string}>> {
    try {
      const query = `
        SELECT 
          u.email as user_id,
          COUNT(se.id) as total_scans,
          COUNT(DISTINCT qc.id) as qr_codes_count,
          COALESCE(u.subscription_tier, 'free') as plan
        FROM users u
        LEFT JOIN qr_codes qc ON qc.user_id = u.id AND qc.is_active = true
        LEFT JOIN scan_events se ON se.qr_code_id = qc.id::text
        GROUP BY u.id, u.email, u.subscription_tier
        HAVING COUNT(se.id) > 0
        ORDER BY total_scans DESC
        LIMIT $1
      `;

      const result = await this.database.query(query, [limit]);
      return result.rows.map(row => ({
        userId: row.user_id,
        totalScans: parseInt(row.total_scans) || 0,
        qrCodesCount: parseInt(row.qr_codes_count) || 0,
        plan: row.plan || 'free'
      }));
    } catch (error) {
      this.logger.error('Failed to get top users by scans', { error });
      throw new DatabaseError('Failed to fetch top users');
    }
  }
  
  async getTopQRCodesByScans(limit: number = 10): Promise<Array<{qrCodeId: string; scans: number; owner: string; type: string}>> {
    try {
      const query = `
        SELECT 
          qc.id as qr_code_id,
          COUNT(se.id) as scans,
          u.email as owner,
          qc.type
        FROM qr_codes qc
        LEFT JOIN scan_events se ON se.qr_code_id = qc.id::text
        LEFT JOIN users u ON u.id = qc.user_id
        WHERE qc.is_active = true
        GROUP BY qc.id, u.email, qc.type
        HAVING COUNT(se.id) > 0
        ORDER BY scans DESC
        LIMIT $1
      `;

      const result = await this.database.query(query, [limit]);
      return result.rows.map(row => ({
        qrCodeId: row.qr_code_id,
        scans: parseInt(row.scans) || 0,
        owner: row.owner || 'unknown',
        type: row.type || 'url'
      }));
    } catch (error) {
      this.logger.error('Failed to get top QR codes by scans', { error });
      throw new DatabaseError('Failed to fetch top QR codes');
    }
  }
  
  async getAnalyticsByCountry(limit: number = 10): Promise<Array<{country: string; users: number; scans: number}>> {
    try {
      const query = `
        SELECT 
          COALESCE(se.country, 'Unknown') as country,
          COUNT(DISTINCT qc.user_id) as users,
          COUNT(se.id) as scans
        FROM scan_events se
        LEFT JOIN qr_codes qc ON qc.id::text = se.qr_code_id
        WHERE se.country IS NOT NULL AND se.country != ''
        GROUP BY se.country
        ORDER BY scans DESC
        LIMIT $1
      `;

      const result = await this.database.query(query, [limit]);
      return result.rows.map(row => ({
        country: row.country,
        users: parseInt(row.users) || 0,
        scans: parseInt(row.scans) || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get analytics by country', { error });
      throw new DatabaseError('Failed to fetch country analytics');
    }
  }
  
  async getAnalyticsByPlan(): Promise<Array<{plan: string; users: number; revenue: number; scans: number}>> {
    try {
      const query = `
        SELECT 
          COALESCE(u.subscription_tier, 'free') as plan,
          COUNT(DISTINCT u.id) as users,
          CASE 
            WHEN u.subscription_tier = 'starter' THEN COUNT(DISTINCT u.id) * 9
            WHEN u.subscription_tier = 'pro' THEN COUNT(DISTINCT u.id) * 19
            WHEN u.subscription_tier = 'business' THEN COUNT(DISTINCT u.id) * 49  
            WHEN u.subscription_tier = 'enterprise' THEN COUNT(DISTINCT u.id) * 199
            ELSE 0
          END as revenue,
          COUNT(se.id) as scans
        FROM users u
        LEFT JOIN qr_codes qc ON qc.user_id = u.id AND qc.is_active = true
        LEFT JOIN scan_events se ON se.qr_code_id = qc.id::text
        GROUP BY u.subscription_tier
        ORDER BY users DESC
      `;

      const result = await this.database.query(query);
      return result.rows.map(row => ({
        plan: row.plan || 'free',
        users: parseInt(row.users) || 0,
        revenue: parseInt(row.revenue) || 0,
        scans: parseInt(row.scans) || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get analytics by plan', { error });
      throw new DatabaseError('Failed to fetch plan analytics');
    }
  }
  
  async getAnalyticsByQRType(limit: number = 10): Promise<Array<{type: string; count: number; scans: number}>> {
    try {
      const query = `
        SELECT 
          qc.type,
          COUNT(DISTINCT qc.id) as count,
          COUNT(se.id) as scans
        FROM qr_codes qc
        LEFT JOIN scan_events se ON se.qr_code_id = qc.id::text
        WHERE qc.is_active = true
        GROUP BY qc.type
        ORDER BY scans DESC
        LIMIT $1
      `;

      const result = await this.database.query(query, [limit]);
      return result.rows.map(row => ({
        type: row.type || 'url',
        count: parseInt(row.count) || 0,
        scans: parseInt(row.scans) || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get analytics by QR type', { error });
      throw new DatabaseError('Failed to fetch QR type analytics');
    }
  }
  
  async getSystemTimeSeriesData(days: number = 30): Promise<Array<{date: string; scans: number; uniqueScans: number}>> {
    try {
      const query = `
        SELECT 
          DATE(se.timestamp) as date,
          COUNT(se.id) as scans,
          COUNT(DISTINCT se.ip_address) as unique_scans
        FROM scan_events se
        WHERE se.timestamp >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(se.timestamp)
        ORDER BY date ASC
      `;

      const result = await this.database.query(query);
      return result.rows.map(row => ({
        date: row.date,
        scans: parseInt(row.scans) || 0,
        uniqueScans: parseInt(row.unique_scans) || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get system time series data', { error });
      throw new DatabaseError('Failed to fetch time series data');
    }
  }
  
  async getSystemDeviceBreakdown(): Promise<{mobile: number; desktop: number; tablet: number}> {
    try {
      const query = `
        SELECT 
          COALESCE(se.device, 'unknown') as device,
          COUNT(se.id) as count
        FROM scan_events se
        GROUP BY se.device
      `;

      const result = await this.database.query(query);
      const deviceCounts = result.rows.reduce((acc, row) => {
        acc[row.device] = parseInt(row.count) || 0;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(deviceCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0);
      
      if (total === 0) {
        return { mobile: 0.7, desktop: 0.25, tablet: 0.05 }; // Fallback ratios
      }

      const mobile = (deviceCounts.mobile || deviceCounts.smartphone || 0) / total;
      const desktop = (deviceCounts.desktop || deviceCounts.computer || 0) / total;
      const tablet = (deviceCounts.tablet || 0) / total;
      
      return {
        mobile: Math.round(mobile * 100) / 100,
        desktop: Math.round(desktop * 100) / 100,
        tablet: Math.round(tablet * 100) / 100
      };
    } catch (error) {
      this.logger.error('Failed to get system device breakdown', { error });
      throw new DatabaseError('Failed to fetch device breakdown');
    }
  }
  
  async getSystemHourlyActivity(): Promise<Array<{hour: number; scans: number}>> {
    try {
      const query = `
        SELECT 
          EXTRACT(HOUR FROM se.timestamp) as hour,
          COUNT(se.id) as scans
        FROM scan_events se
        WHERE se.timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM se.timestamp)
        ORDER BY hour ASC
      `;

      const result = await this.database.query(query);
      
      // Fill in missing hours with 0 scans
      const hourlyData = Array.from({length: 24}, (_, i) => ({hour: i, scans: 0}));
      
      result.rows.forEach(row => {
        const hour = parseInt(row.hour);
        if (hour >= 0 && hour < 24) {
          hourlyData[hour].scans = parseInt(row.scans) || 0;
        }
      });

      return hourlyData;
    } catch (error) {
      this.logger.error('Failed to get system hourly activity', { error });
      throw new DatabaseError('Failed to fetch hourly activity');
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
      userId: row.user_id,
      name: row.name,
      type: row.goal_type,
      targetUrl: row.target_url,
      targetValue: row.value_amount ? parseFloat(row.value_amount) : undefined,
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
    // Special case mappings
    const specialMappings: { [key: string]: string } = {
      'targetValue': 'value_amount',
      'qrCodeId': 'qr_code_id',
      'userId': 'user_id',
      'goalType': 'goal_type',
      'targetUrl': 'target_url',
      'isActive': 'is_active',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };
    
    if (specialMappings[str]) {
      return specialMappings[str];
    }
    
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // ===============================================
  // MARKETING TOOLS REPOSITORY METHODS
  // ===============================================

  // Campaign management methods
  async createCampaign(campaign: any): Promise<any> {
    try {
      const query = `
        INSERT INTO marketing_campaigns (
          id, user_id, name, description, campaign_type, status,
          target_audience, geographic_targets, device_targets,
          start_date, end_date, budget_amount, budget_currency,
          target_conversions, target_cpa, utm_source, utm_medium,
          utm_campaign, utm_term, utm_content, tags, metadata,
          is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *
      `;

      const values = [
        campaign.id,
        campaign.userId,
        campaign.name,
        campaign.description,
        campaign.campaignType,
        campaign.status,
        campaign.targetAudience,
        campaign.geographicTargets,
        campaign.deviceTargets,
        campaign.startDate,
        campaign.endDate,
        campaign.budgetAmount,
        campaign.budgetCurrency,
        campaign.targetConversions,
        campaign.targetCpa,
        campaign.utmSource,
        campaign.utmMedium,
        campaign.utmCampaign,
        campaign.utmTerm,
        campaign.utmContent,
        campaign.tags,
        campaign.metadata ? JSON.stringify(campaign.metadata) : null,
        campaign.isActive,
        campaign.createdAt,
        campaign.updatedAt
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create campaign:', error);
      throw new DatabaseError('Failed to create marketing campaign');
    }
  }

  async getCampaign(campaignId: string, userId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM marketing_campaigns 
        WHERE id = $1 AND user_id = $2 AND is_active = true
      `;
      const result = await this.database.query(query, [campaignId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Failed to get campaign:', error);
      throw new DatabaseError('Failed to retrieve marketing campaign');
    }
  }

  async getUserCampaigns(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM marketing_campaigns 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await this.database.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get user campaigns:', error);
      throw new DatabaseError('Failed to retrieve user campaigns');
    }
  }

  async updateCampaign(campaignId: string, updates: any): Promise<any> {
    try {
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'metadata' && value) {
          setFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else if (value !== undefined) {
          setFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }

      if (setFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(campaignId);

      const query = `
        UPDATE marketing_campaigns 
        SET ${setFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update campaign:', error);
      throw new DatabaseError('Failed to update marketing campaign');
    }
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE marketing_campaigns 
        SET is_active = false, status = 'archived', updated_at = NOW()
        WHERE id = $1
      `;
      const result = await this.database.query(query, [campaignId]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      this.logger.error('Failed to delete campaign:', error);
      throw new DatabaseError('Failed to delete marketing campaign');
    }
  }

  // Campaign QR Code association methods
  async createCampaignQRCode(association: any): Promise<any> {
    try {
      const query = `
        INSERT INTO campaign_qr_codes (
          id, campaign_id, qr_code_id, added_at, scans_count,
          conversions_count, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        association.id,
        association.campaignId,
        association.qrCodeId,
        association.addedAt,
        association.scansCount || 0,
        association.conversionsCount || 0,
        association.isActive
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create campaign QR code association:', error);
      throw new DatabaseError('Failed to create campaign QR code association');
    }
  }

  async getCampaignQRCodeAssociation(campaignId: string, qrCodeId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM campaign_qr_codes 
        WHERE campaign_id = $1 AND qr_code_id = $2 AND is_active = true
      `;
      const result = await this.database.query(query, [campaignId, qrCodeId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Failed to get campaign QR code association:', error);
      throw new DatabaseError('Failed to retrieve campaign QR code association');
    }
  }

  async getCampaignQRCodes(campaignId: string): Promise<any[]> {
    try {
      const query = `
        SELECT cqr.*, qr.name as qr_code_name, qr.type as qr_code_type
        FROM campaign_qr_codes cqr
        LEFT JOIN qr_codes qr ON cqr.qr_code_id = qr.id
        WHERE cqr.campaign_id = $1 AND cqr.is_active = true
        ORDER BY cqr.added_at DESC
      `;
      const result = await this.database.query(query, [campaignId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get campaign QR codes:', error);
      throw new DatabaseError('Failed to retrieve campaign QR codes');
    }
  }

  async removeCampaignQRCodeAssociation(campaignId: string, qrCodeId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE campaign_qr_codes 
        SET is_active = false
        WHERE campaign_id = $1 AND qr_code_id = $2
      `;
      const result = await this.database.query(query, [campaignId, qrCodeId]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      this.logger.error('Failed to remove campaign QR code association:', error);
      throw new DatabaseError('Failed to remove campaign QR code association');
    }
  }

  async updateCampaignQRCodeStats(
    campaignId: string, 
    qrCodeId: string, 
    scansIncrement: number = 0, 
    conversionsIncrement: number = 0
  ): Promise<void> {
    try {
      const query = `
        UPDATE campaign_qr_codes 
        SET 
          scans_count = scans_count + $3,
          conversions_count = conversions_count + $4,
          last_scan_at = CASE WHEN $3 > 0 THEN NOW() ELSE last_scan_at END
        WHERE campaign_id = $1 AND qr_code_id = $2
      `;
      await this.database.query(query, [campaignId, qrCodeId, scansIncrement, conversionsIncrement]);
    } catch (error) {
      this.logger.error('Failed to update campaign QR code stats:', error);
      throw new DatabaseError('Failed to update campaign QR code statistics');
    }
  }

  // UTM tracking methods
  async createUTMTracking(utmTracking: any): Promise<any> {
    try {
      const query = `
        INSERT INTO utm_tracking (
          id, qr_code_id, campaign_id, utm_source, utm_medium,
          utm_campaign, utm_term, utm_content, original_url, utm_url,
          clicks_count, unique_clicks_count, conversions_count,
          is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `;

      const values = [
        utmTracking.id,
        utmTracking.qrCodeId,
        utmTracking.campaignId,
        utmTracking.utmSource,
        utmTracking.utmMedium,
        utmTracking.utmCampaign,
        utmTracking.utmTerm,
        utmTracking.utmContent,
        utmTracking.originalUrl,
        utmTracking.utmUrl,
        utmTracking.clicksCount || 0,
        utmTracking.uniqueClicksCount || 0,
        utmTracking.conversionsCount || 0,
        utmTracking.isActive,
        utmTracking.createdAt,
        utmTracking.updatedAt
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create UTM tracking:', error);
      throw new DatabaseError('Failed to create UTM tracking');
    }
  }

  async getUTMTracking(utmTrackingId: string, userId: string): Promise<any | null> {
    try {
      const query = `
        SELECT ut.*, qr.user_id
        FROM utm_tracking ut
        JOIN qr_codes qr ON ut.qr_code_id = qr.id
        WHERE ut.id = $1 AND qr.user_id = $2 AND ut.is_active = true
      `;
      const result = await this.database.query(query, [utmTrackingId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Failed to get UTM tracking:', error);
      throw new DatabaseError('Failed to retrieve UTM tracking');
    }
  }

  async getUTMTrackingByQRCode(qrCodeId: string, userId: string): Promise<any[]> {
    try {
      const query = `
        SELECT ut.*
        FROM utm_tracking ut
        JOIN qr_codes qr ON ut.qr_code_id = qr.id
        WHERE ut.qr_code_id = $1 AND qr.user_id = $2 AND ut.is_active = true
        ORDER BY ut.created_at DESC
      `;
      const result = await this.database.query(query, [qrCodeId, userId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get UTM tracking by QR code:', error);
      throw new DatabaseError('Failed to retrieve UTM tracking for QR code');
    }
  }

  async updateUTMTracking(utmTrackingId: string, updates: any): Promise<any> {
    try {
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(utmTrackingId);

      const query = `
        UPDATE utm_tracking 
        SET ${setFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update UTM tracking:', error);
      throw new DatabaseError('Failed to update UTM tracking');
    }
  }

  async deleteUTMTracking(utmTrackingId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE utm_tracking 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      const result = await this.database.query(query, [utmTrackingId]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      this.logger.error('Failed to delete UTM tracking:', error);
      throw new DatabaseError('Failed to delete UTM tracking');
    }
  }

  // UTM events methods
  async createUTMEvent(event: any): Promise<any> {
    try {
      const query = `
        INSERT INTO utm_events (
          id, utm_tracking_id, qr_code_id, session_id, utm_source,
          utm_medium, utm_campaign, utm_term, utm_content, event_type,
          referrer_url, landing_page_url, user_agent, ip_address,
          attribution_type, attribution_value, country, region, city, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `;

      const values = [
        event.id,
        event.utmTrackingId,
        event.qrCodeId,
        event.sessionId,
        event.utmSource,
        event.utmMedium,
        event.utmCampaign,
        event.utmTerm,
        event.utmContent,
        event.eventType,
        event.referrerUrl,
        event.landingPageUrl,
        event.userAgent,
        event.ipAddress,
        event.attributionType,
        event.attributionValue,
        event.country,
        event.region,
        event.city,
        event.timestamp
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create UTM event:', error);
      throw new DatabaseError('Failed to create UTM event');
    }
  }

  async getUTMEvents(utmTrackingId: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM utm_events 
        WHERE utm_tracking_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await this.database.query(query, [utmTrackingId, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get UTM events:', error);
      throw new DatabaseError('Failed to retrieve UTM events');
    }
  }

  async updateUTMTrackingStats(utmTrackingId: string, eventType: string): Promise<void> {
    try {
      let query = '';
      
      if (eventType === 'click') {
        query = `
          UPDATE utm_tracking 
          SET 
            clicks_count = clicks_count + 1,
            first_click_at = COALESCE(first_click_at, NOW()),
            last_click_at = NOW()
          WHERE id = $1
        `;
      } else if (eventType === 'conversion') {
        query = `
          UPDATE utm_tracking 
          SET conversions_count = conversions_count + 1
          WHERE id = $1
        `;
      } else {
        return; // No update needed for other event types
      }

      await this.database.query(query, [utmTrackingId]);
    } catch (error) {
      this.logger.error('Failed to update UTM tracking stats:', error);
      throw new DatabaseError('Failed to update UTM tracking statistics');
    }
  }

  // Retargeting pixel methods
  async createRetargetingPixel(pixel: any): Promise<any> {
    try {
      const query = `
        INSERT INTO retargeting_pixels (
          id, user_id, campaign_id, name, pixel_type, pixel_id,
          pixel_code, trigger_events, target_qr_codes, target_campaigns,
          is_test_mode, custom_parameters, fires_count, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `;

      const values = [
        pixel.id,
        pixel.userId,
        pixel.campaignId,
        pixel.name,
        pixel.pixelType,
        pixel.pixelId,
        pixel.pixelCode,
        pixel.triggerEvents,
        pixel.targetQrCodes,
        pixel.targetCampaigns,
        pixel.isTestMode,
        pixel.customParameters ? JSON.stringify(pixel.customParameters) : null,
        pixel.firesCount || 0,
        pixel.isActive,
        pixel.createdAt,
        pixel.updatedAt
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create retargeting pixel:', error);
      throw new DatabaseError('Failed to create retargeting pixel');
    }
  }

  async getRetargetingPixel(pixelId: string, userId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM retargeting_pixels 
        WHERE id = $1 AND user_id = $2 AND is_active = true
      `;
      const result = await this.database.query(query, [pixelId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Failed to get retargeting pixel:', error);
      throw new DatabaseError('Failed to retrieve retargeting pixel');
    }
  }

  async getRetargetingPixelById(pixelId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM retargeting_pixels 
        WHERE id = $1 AND is_active = true
      `;
      const result = await this.database.query(query, [pixelId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Failed to get retargeting pixel by ID:', error);
      throw new DatabaseError('Failed to retrieve retargeting pixel');
    }
  }

  async getUserRetargetingPixels(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM retargeting_pixels 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await this.database.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get user retargeting pixels:', error);
      throw new DatabaseError('Failed to retrieve user retargeting pixels');
    }
  }

  async updateRetargetingPixel(pixelId: string, updates: any): Promise<any> {
    try {
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'customParameters' && value) {
          setFields.push(`custom_parameters = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else if (value !== undefined) {
          setFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }

      if (setFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(pixelId);

      const query = `
        UPDATE retargeting_pixels 
        SET ${setFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update retargeting pixel:', error);
      throw new DatabaseError('Failed to update retargeting pixel');
    }
  }

  async deleteRetargetingPixel(pixelId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE retargeting_pixels 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      const result = await this.database.query(query, [pixelId]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      this.logger.error('Failed to delete retargeting pixel:', error);
      throw new DatabaseError('Failed to delete retargeting pixel');
    }
  }

  async incrementPixelFireCount(pixelId: string): Promise<void> {
    try {
      const query = `
        UPDATE retargeting_pixels 
        SET fires_count = fires_count + 1, last_fired_at = NOW()
        WHERE id = $1
      `;
      await this.database.query(query, [pixelId]);
    } catch (error) {
      this.logger.error('Failed to increment pixel fire count:', error);
      throw new DatabaseError('Failed to increment pixel fire count');
    }
  }

  // Retargeting pixel events methods
  async createRetargetingPixelEvent(event: any): Promise<any> {
    try {
      const query = `
        INSERT INTO retargeting_pixel_events (
          id, pixel_id, qr_code_id, campaign_id, event_type,
          event_value, event_currency, session_id, user_fingerprint,
          ip_address, user_agent, referrer_url, page_url,
          platform_event_id, platform_response, country, region, city, fired_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *
      `;

      const values = [
        event.id,
        event.pixelId,
        event.qrCodeId,
        event.campaignId,
        event.eventType,
        event.eventValue,
        event.eventCurrency,
        event.sessionId,
        event.userFingerprint,
        event.ipAddress,
        event.userAgent,
        event.referrerUrl,
        event.pageUrl,
        event.platformEventId,
        event.platformResponse ? JSON.stringify(event.platformResponse) : null,
        event.country,
        event.region,
        event.city,
        event.firedAt
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create retargeting pixel event:', error);
      throw new DatabaseError('Failed to create retargeting pixel event');
    }
  }

  async getRetargetingPixelEvents(pixelId: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM retargeting_pixel_events 
        WHERE pixel_id = $1
        ORDER BY fired_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await this.database.query(query, [pixelId, limit, offset]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get retargeting pixel events:', error);
      throw new DatabaseError('Failed to retrieve retargeting pixel events');
    }
  }

  async updateRetargetingPixelEvent(eventId: string, updates: any): Promise<any> {
    try {
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'platformResponse' && value) {
          setFields.push(`platform_response = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else if (value !== undefined) {
          setFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }

      if (setFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(eventId);

      const query = `
        UPDATE retargeting_pixel_events 
        SET ${setFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update retargeting pixel event:', error);
      throw new DatabaseError('Failed to update retargeting pixel event');
    }
  }

  // Campaign analytics methods
  async createCampaignAnalytics(analytics: any): Promise<any> {
    try {
      const query = `
        INSERT INTO campaign_analytics (
          id, campaign_id, analytics_date, impressions, clicks, unique_clicks,
          scans, unique_scans, conversions, conversion_value, click_through_rate,
          conversion_rate, cost_per_click, cost_per_conversion, return_on_ad_spend,
          top_utm_source, top_utm_medium, top_utm_content, top_country, top_region,
          top_device_type, mobile_percentage, peak_hour, peak_day_of_week,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        ON CONFLICT (campaign_id, analytics_date) 
        DO UPDATE SET
          impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks,
          unique_clicks = EXCLUDED.unique_clicks,
          scans = EXCLUDED.scans,
          unique_scans = EXCLUDED.unique_scans,
          conversions = EXCLUDED.conversions,
          conversion_value = EXCLUDED.conversion_value,
          click_through_rate = EXCLUDED.click_through_rate,
          conversion_rate = EXCLUDED.conversion_rate,
          cost_per_click = EXCLUDED.cost_per_click,
          cost_per_conversion = EXCLUDED.cost_per_conversion,
          return_on_ad_spend = EXCLUDED.return_on_ad_spend,
          top_utm_source = EXCLUDED.top_utm_source,
          top_utm_medium = EXCLUDED.top_utm_medium,
          top_utm_content = EXCLUDED.top_utm_content,
          top_country = EXCLUDED.top_country,
          top_region = EXCLUDED.top_region,
          top_device_type = EXCLUDED.top_device_type,
          mobile_percentage = EXCLUDED.mobile_percentage,
          peak_hour = EXCLUDED.peak_hour,
          peak_day_of_week = EXCLUDED.peak_day_of_week,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;

      const values = [
        analytics.id,
        analytics.campaignId,
        analytics.analyticsDate,
        analytics.impressions || 0,
        analytics.clicks || 0,
        analytics.uniqueClicks || 0,
        analytics.scans || 0,
        analytics.uniqueScans || 0,
        analytics.conversions || 0,
        analytics.conversionValue || 0,
        analytics.clickThroughRate || 0,
        analytics.conversionRate || 0,
        analytics.costPerClick || 0,
        analytics.costPerConversion || 0,
        analytics.returnOnAdSpend || 0,
        analytics.topUtmSource,
        analytics.topUtmMedium,
        analytics.topUtmContent,
        analytics.topCountry,
        analytics.topRegion,
        analytics.topDeviceType,
        analytics.mobilePercentage || 0,
        analytics.peakHour,
        analytics.peakDayOfWeek,
        analytics.createdAt,
        analytics.updatedAt
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create campaign analytics:', error);
      throw new DatabaseError('Failed to create campaign analytics');
    }
  }

  async getCampaignAnalytics(campaignId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM campaign_analytics 
        WHERE campaign_id = $1
      `;
      const params = [campaignId];

      if (startDate) {
        query += ` AND analytics_date >= $${params.length + 1}`;
        params.push(startDate.toISOString().split('T')[0]); // Convert to date string
      }

      if (endDate) {
        query += ` AND analytics_date <= $${params.length + 1}`;
        params.push(endDate.toISOString().split('T')[0]); // Convert to date string
      }

      query += ` ORDER BY analytics_date DESC`;

      const result = await this.database.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get campaign analytics:', error);
      throw new DatabaseError('Failed to retrieve campaign analytics');
    }
  }

  async updateCampaignAnalytics(campaignId: string, date: Date, updates: any): Promise<any> {
    try {
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(campaignId);
      values.push(date);

      const query = `
        UPDATE campaign_analytics 
        SET ${setFields.join(', ')}, updated_at = NOW()
        WHERE campaign_id = $${paramIndex} AND analytics_date = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update campaign analytics:', error);
      throw new DatabaseError('Failed to update campaign analytics');
    }
  }

  // Campaign conversion attribution methods
  async createCampaignConversionAttribution(attribution: any): Promise<any> {
    try {
      const query = `
        INSERT INTO campaign_conversion_attribution (
          id, campaign_id, conversion_event_id, qr_code_id, utm_tracking_id,
          attribution_model, attribution_weight, touch_timestamp, conversion_timestamp,
          time_to_conversion, attributed_value, attributed_currency, touch_point,
          conversion_path, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *
      `;

      const values = [
        attribution.id,
        attribution.campaignId,
        attribution.conversionEventId,
        attribution.qrCodeId,
        attribution.utmTrackingId,
        attribution.attributionModel,
        attribution.attributionWeight || 1.0,
        attribution.touchTimestamp,
        attribution.conversionTimestamp,
        attribution.timeToConversion,
        attribution.attributedValue,
        attribution.attributedCurrency,
        attribution.touchPoint,
        attribution.conversionPath,
        attribution.createdAt
      ];

      const result = await this.database.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create campaign conversion attribution:', error);
      throw new DatabaseError('Failed to create campaign conversion attribution');
    }
  }

  async getCampaignConversionAttributions(campaignId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM campaign_conversion_attribution 
        WHERE campaign_id = $1
      `;
      const params = [campaignId];

      if (startDate) {
        query += ` AND conversion_timestamp >= $${params.length + 1}`;
        params.push(startDate.toISOString());
      }

      if (endDate) {
        query += ` AND conversion_timestamp <= $${params.length + 1}`;
        params.push(endDate.toISOString());
      }

      query += ` ORDER BY conversion_timestamp DESC`;

      const result = await this.database.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get campaign conversion attributions:', error);
      throw new DatabaseError('Failed to retrieve campaign conversion attributions');
    }
  }
}