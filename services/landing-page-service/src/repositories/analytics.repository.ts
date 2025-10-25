import { Pool, PoolClient } from 'pg';
import {
  ILandingPageABTestRepository,
  ILandingPageAnalyticsRepository,
  LandingPageABTest,
  LandingPageAnalytics,
  AnalyticsQueryOptions,
  DateRange,
  DatabaseError,
  NotFoundError,
  ILogger
} from '../interfaces';

export class LandingPageABTestRepository implements ILandingPageABTestRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(testData: any): Promise<LandingPageABTest> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Creating A/B test', {
        userId: testData.userId,
        testName: testData.testName,
        variantAPageId: testData.variantAPageId
      });

      const query = `
        INSERT INTO landing_page_ab_tests (
          id, user_id, test_name, description, variant_a_page_id, variant_b_page_id,
          traffic_split, start_date, end_date, status, confidence_level,
          statistical_significance, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *
      `;

      const values = [
        testData.id || require('crypto').randomUUID(),
        testData.userId,
        testData.testName,
        testData.description || null,
        testData.variantAPageId,
        testData.variantBPageId,
        testData.trafficSplit || 50,
        testData.startDate,
        testData.endDate || null,
        testData.status || 'draft',
        testData.confidenceLevel || 0,
        testData.statisticalSignificance || 0,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const abTest = this.mapRowToABTest(result.rows[0]);
      
      this.logger.info('Successfully created A/B test', {
        testId: abTest.id,
        testName: abTest.testName,
        userId: abTest.userId
      });

      return abTest;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create A/B test', {
        userId: testData.userId,
        error
      });
      throw new DatabaseError('Failed to create A/B test', error);
    } finally {
      client.release();
    }
  }

  async findById(testId: string): Promise<LandingPageABTest | null> {
    try {
      this.logger.info('Fetching A/B test by ID', { testId });
      
      const query = `
        SELECT * FROM landing_page_ab_tests
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [testId]);
      
      if (result.rows.length === 0) {
        this.logger.warn('A/B test not found', { testId });
        return null;
      }
      
      const abTest = this.mapRowToABTest(result.rows[0]);
      this.logger.info('Successfully fetched A/B test', {
        testId,
        testName: abTest.testName,
        status: abTest.status
      });
      return abTest;
      
    } catch (error) {
      this.logger.error('Failed to fetch A/B test by ID', { testId, error });
      throw new DatabaseError('Failed to fetch A/B test', error);
    }
  }

  async findByLandingPageId(landingPageId: string): Promise<LandingPageABTest[]> {
    try {
      this.logger.info('Fetching A/B tests by landing page ID', { landingPageId });
      
      const query = `
        SELECT * FROM landing_page_ab_tests
        WHERE variant_a_page_id = $1 OR variant_b_page_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [landingPageId]);
      const abTests = result.rows.map(this.mapRowToABTest.bind(this));
      
      this.logger.info('Successfully fetched A/B tests for landing page', {
        landingPageId,
        count: abTests.length
      });
      return abTests;
      
    } catch (error) {
      this.logger.error('Failed to fetch A/B tests for landing page', { landingPageId, error });
      throw new DatabaseError('Failed to fetch A/B tests for landing page', error);
    }
  }

  async findByUserId(userId: string): Promise<LandingPageABTest[]> {
    try {
      this.logger.info('Fetching A/B tests by user ID', { userId });
      
      const query = `
        SELECT * FROM landing_page_ab_tests
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [userId]);
      const abTests = result.rows.map(this.mapRowToABTest.bind(this));
      
      this.logger.info('Successfully fetched user A/B tests', {
        userId,
        count: abTests.length
      });
      return abTests;
      
    } catch (error) {
      this.logger.error('Failed to fetch user A/B tests', { userId, error });
      throw new DatabaseError('Failed to fetch user A/B tests', error);
    }
  }

  async update(testId: string, testData: any): Promise<LandingPageABTest> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Updating A/B test', { testId, updates: Object.keys(testData) });

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (testData.testName !== undefined) {
        updateFields.push(`test_name = $${paramIndex++}`);
        values.push(testData.testName);
      }
      if (testData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(testData.description);
      }
      if (testData.trafficSplit !== undefined) {
        updateFields.push(`traffic_split = $${paramIndex++}`);
        values.push(testData.trafficSplit);
      }
      if (testData.startDate !== undefined) {
        updateFields.push(`start_date = $${paramIndex++}`);
        values.push(testData.startDate);
      }
      if (testData.endDate !== undefined) {
        updateFields.push(`end_date = $${paramIndex++}`);
        values.push(testData.endDate);
      }
      if (testData.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(testData.status);
      }
      if (testData.winnerVariant !== undefined) {
        updateFields.push(`winner_variant = $${paramIndex++}`);
        values.push(testData.winnerVariant);
      }
      if (testData.confidenceLevel !== undefined) {
        updateFields.push(`confidence_level = $${paramIndex++}`);
        values.push(testData.confidenceLevel);
      }
      if (testData.statisticalSignificance !== undefined) {
        updateFields.push(`statistical_significance = $${paramIndex++}`);
        values.push(testData.statisticalSignificance);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(testId);

      const query = `
        UPDATE landing_page_ab_tests 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('A/B test not found');
      }

      await client.query('COMMIT');
      
      const updatedTest = this.mapRowToABTest(result.rows[0]);
      
      this.logger.info('Successfully updated A/B test', {
        testId,
        testName: updatedTest.testName,
        status: updatedTest.status
      });

      return updatedTest;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to update A/B test', { testId, error });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update A/B test', error);
    } finally {
      client.release();
    }
  }

  async delete(testId: string): Promise<boolean> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Deleting A/B test', { testId });

      // Delete related analytics first
      await client.query('DELETE FROM landing_page_analytics WHERE ab_test_id = $1', [testId]);
      
      // Delete the test
      const result = await client.query('DELETE FROM landing_page_ab_tests WHERE id = $1', [testId]);
      
      await client.query('COMMIT');
      
      const deleted = (result.rowCount || 0) > 0;
      
      this.logger.info('A/B test deletion completed', { testId, deleted });
      return deleted;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to delete A/B test', { testId, error });
      throw new DatabaseError('Failed to delete A/B test', error);
    } finally {
      client.release();
    }
  }

  private mapRowToABTest(row: any): LandingPageABTest {
    return {
      id: row.id,
      userId: row.user_id,
      testName: row.test_name,
      description: row.description,
      variantAPageId: row.variant_a_page_id,
      variantBPageId: row.variant_b_page_id,
      trafficSplit: row.traffic_split,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      status: row.status,
      winnerVariant: row.winner_variant,
      confidenceLevel: row.confidence_level,
      statisticalSignificance: row.statistical_significance,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export class LandingPageAnalyticsRepository implements ILandingPageAnalyticsRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(analyticsData: any): Promise<LandingPageAnalytics> {
    try {
      this.logger.debug('Creating analytics event', {
        landingPageId: analyticsData.landingPageId,
        eventType: analyticsData.eventType,
        abTestId: analyticsData.abTestId
      });

      const query = `
        INSERT INTO landing_page_analytics (
          id, landing_page_id, ab_test_id, variant, event_type, event_data,
          visitor_id, session_id, ip_address, user_agent, device_type,
          browser, os, country, region, city, referrer_url, page_url,
          scroll_depth, time_on_page, conversion_value, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *
      `;

      const values = [
        analyticsData.id || require('crypto').randomUUID(),
        analyticsData.landingPageId,
        analyticsData.abTestId || null,
        analyticsData.variant || null,
        analyticsData.eventType,
        JSON.stringify(analyticsData.eventData || {}),
        analyticsData.visitorId || null,
        analyticsData.sessionId || null,
        analyticsData.ipAddress || null,
        analyticsData.userAgent || null,
        analyticsData.deviceType || null,
        analyticsData.browser || null,
        analyticsData.os || null,
        analyticsData.country || null,
        analyticsData.region || null,
        analyticsData.city || null,
        analyticsData.referrerUrl || null,
        analyticsData.pageUrl || null,
        analyticsData.scrollDepth || null,
        analyticsData.timeOnPage || null,
        analyticsData.conversionValue || null,
        analyticsData.timestamp || new Date()
      ];

      const result = await this.db.query(query, values);
      const analytics = this.mapRowToAnalytics(result.rows[0]);
      
      this.logger.debug('Successfully created analytics event', {
        analyticsId: analytics.id,
        landingPageId: analytics.landingPageId,
        eventType: analytics.eventType
      });

      return analytics;

    } catch (error) {
      this.logger.error('Failed to create analytics event', {
        landingPageId: analyticsData.landingPageId,
        error
      });
      throw new DatabaseError('Failed to create analytics event', error);
    }
  }

  async findByLandingPageId(landingPageId: string, options?: AnalyticsQueryOptions): Promise<LandingPageAnalytics[]> {
    try {
      this.logger.info('Fetching analytics by landing page ID', { landingPageId, options });
      
      let query = `
        SELECT * FROM landing_page_analytics
        WHERE landing_page_id = $1
      `;
      const values: any[] = [landingPageId];
      let paramIndex = 2;

      if (options?.dateRange) {
        query += ` AND timestamp BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        values.push(options.dateRange.startDate, options.dateRange.endDate);
      }

      if (options?.eventTypes && options.eventTypes.length > 0) {
        query += ` AND event_type = ANY($${paramIndex++})`;
        values.push(options.eventTypes);
      }

      query += ` ORDER BY timestamp DESC`;

      if (options?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(options.limit);
      }

      if (options?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        values.push(options.offset);
      }
      
      const result = await this.db.query(query, values);
      const analytics = result.rows.map(this.mapRowToAnalytics.bind(this));
      
      this.logger.info('Successfully fetched analytics for landing page', {
        landingPageId,
        count: analytics.length
      });
      return analytics;
      
    } catch (error) {
      this.logger.error('Failed to fetch analytics for landing page', { landingPageId, error });
      throw new DatabaseError('Failed to fetch analytics for landing page', error);
    }
  }

  async findByABTestId(abTestId: string): Promise<LandingPageAnalytics[]> {
    try {
      this.logger.info('Fetching analytics by A/B test ID', { abTestId });
      
      const query = `
        SELECT * FROM landing_page_analytics
        WHERE ab_test_id = $1
        ORDER BY timestamp DESC
      `;
      
      const result = await this.db.query(query, [abTestId]);
      const analytics = result.rows.map(this.mapRowToAnalytics.bind(this));
      
      this.logger.info('Successfully fetched A/B test analytics', {
        abTestId,
        count: analytics.length
      });
      return analytics;
      
    } catch (error) {
      this.logger.error('Failed to fetch A/B test analytics', { abTestId, error });
      throw new DatabaseError('Failed to fetch A/B test analytics', error);
    }
  }

  async getAnalyticsSummary(landingPageId: string, dateRange?: DateRange): Promise<any> {
    try {
      this.logger.info('Generating analytics summary', { landingPageId, dateRange });
      
      let query = `
        SELECT 
          COUNT(*) FILTER (WHERE event_type = 'page_view') as total_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') as unique_visitors,
          COUNT(*) FILTER (WHERE event_type = 'conversion') as total_conversions,
          AVG(time_on_page) FILTER (WHERE time_on_page IS NOT NULL) as avg_time_on_page,
          COUNT(*) FILTER (WHERE event_type = 'bounce') as bounces
        FROM landing_page_analytics
        WHERE landing_page_id = $1
      `;
      
      const values: any[] = [landingPageId];
      let paramIndex = 2;

      if (dateRange) {
        query += ` AND timestamp BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        values.push(dateRange.startDate, dateRange.endDate);
      }
      
      const result = await this.db.query(query, values);
      const row = result.rows[0];
      
      const totalViews = parseInt(row.total_views) || 0;
      const uniqueVisitors = parseInt(row.unique_visitors) || 0;
      const totalConversions = parseInt(row.total_conversions) || 0;
      const bounces = parseInt(row.bounces) || 0;
      
      const summary = {
        totalViews,
        uniqueVisitors,
        totalConversions,
        conversionRate: totalViews > 0 ? (totalConversions / totalViews) * 100 : 0,
        avgTimeOnPage: parseFloat(row.avg_time_on_page) || 0,
        bounceRate: totalViews > 0 ? (bounces / totalViews) * 100 : 0
      };
      
      this.logger.info('Successfully generated analytics summary', {
        landingPageId,
        totalViews: summary.totalViews,
        conversionRate: summary.conversionRate
      });
      
      return summary;
      
    } catch (error) {
      this.logger.error('Failed to generate analytics summary', { landingPageId, error });
      throw new DatabaseError('Failed to generate analytics summary', error);
    }
  }

  async getTopReferrers(landingPageId: string, limit: number = 10): Promise<Array<{ referrer: string; count: number }>> {
    try {
      this.logger.info('Fetching top referrers', { landingPageId, limit });
      
      const query = `
        SELECT 
          COALESCE(referrer_url, 'Direct') as referrer,
          COUNT(*) as count
        FROM landing_page_analytics
        WHERE landing_page_id = $1 AND event_type = 'page_view'
        GROUP BY referrer_url
        ORDER BY count DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [landingPageId, limit]);
      const referrers = result.rows.map(row => ({
        referrer: row.referrer,
        count: parseInt(row.count)
      }));
      
      this.logger.info('Successfully fetched top referrers', {
        landingPageId,
        count: referrers.length
      });
      
      return referrers;
      
    } catch (error) {
      this.logger.error('Failed to fetch top referrers', { landingPageId, error });
      throw new DatabaseError('Failed to fetch top referrers', error);
    }
  }

  async getDeviceBreakdown(landingPageId: string): Promise<Array<{ device: string; count: number; percentage: number }>> {
    try {
      this.logger.info('Fetching device breakdown', { landingPageId });
      
      const query = `
        SELECT 
          COALESCE(device_type, 'Unknown') as device,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
        FROM landing_page_analytics
        WHERE landing_page_id = $1 AND event_type = 'page_view'
        GROUP BY device_type
        ORDER BY count DESC
      `;
      
      const result = await this.db.query(query, [landingPageId]);
      const devices = result.rows.map(row => ({
        device: row.device,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      }));
      
      this.logger.info('Successfully fetched device breakdown', {
        landingPageId,
        count: devices.length
      });
      
      return devices;
      
    } catch (error) {
      this.logger.error('Failed to fetch device breakdown', { landingPageId, error });
      throw new DatabaseError('Failed to fetch device breakdown', error);
    }
  }

  async getConversionFunnel(landingPageId: string): Promise<Array<{ step: string; count: number }>> {
    try {
      this.logger.info('Fetching conversion funnel', { landingPageId });
      
      const query = `
        SELECT 
          event_type as step,
          COUNT(*) as count
        FROM landing_page_analytics
        WHERE landing_page_id = $1
        GROUP BY event_type
        ORDER BY 
          CASE event_type
            WHEN 'page_view' THEN 1
            WHEN 'form_view' THEN 2
            WHEN 'form_start' THEN 3
            WHEN 'form_submit' THEN 4
            WHEN 'conversion' THEN 5
            ELSE 6
          END
      `;
      
      const result = await this.db.query(query, [landingPageId]);
      const funnel = result.rows.map(row => ({
        step: row.step,
        count: parseInt(row.count)
      }));
      
      this.logger.info('Successfully fetched conversion funnel', {
        landingPageId,
        steps: funnel.length
      });
      
      return funnel;
      
    } catch (error) {
      this.logger.error('Failed to fetch conversion funnel', { landingPageId, error });
      throw new DatabaseError('Failed to fetch conversion funnel', error);
    }
  }

  private mapRowToAnalytics(row: any): LandingPageAnalytics {
    return {
      id: row.id,
      landingPageId: row.landing_page_id,
      abTestId: row.ab_test_id,
      variant: row.variant,
      eventType: row.event_type,
      eventData: JSON.parse(row.event_data || '{}'),
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      country: row.country,
      region: row.region,
      city: row.city,
      referrerUrl: row.referrer_url,
      pageUrl: row.page_url,
      scrollDepth: row.scroll_depth,
      timeOnPage: row.time_on_page,
      conversionValue: row.conversion_value,
      timestamp: new Date(row.timestamp)
    };
  }
}