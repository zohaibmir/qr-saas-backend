import { Pool } from 'pg';
import { 
  ScanEvent, 
  AnalyticsSummary, 
  IAnalyticsRepository, 
  ILogger,
  DatabaseError,
  NotFoundError 
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
}