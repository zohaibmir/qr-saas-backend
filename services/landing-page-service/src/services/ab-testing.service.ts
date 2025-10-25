import { Logger } from './logger.service';
import { DatabaseConfig } from '../config/database.config';
import { Pool } from 'pg';

export interface ABTestVariant {
  id: string;
  test_id: string;
  name: string;
  template_id: string;
  traffic_percentage: number;
  is_control: boolean;
  created_at: Date;
}

export interface ABTestConfig {
  id: string;
  landing_page_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  start_date?: Date;
  end_date?: Date;
  variants: ABTestVariant[];
  goals: ABTestGoal[];
  confidence_level: number;
  min_sample_size: number;
}

export interface ABTestGoal {
  id: string;
  name: string;
  type: 'conversion' | 'click' | 'form_submit' | 'time_on_page';
  target_value?: number;
  weight: number;
}

export interface ABTestResults {
  test_id: string;
  variants: VariantResults[];
  statistical_significance: number;
  confidence_interval: number;
  winner_variant_id?: string;
  test_status: 'inconclusive' | 'significant' | 'insufficient_data';
}

export interface VariantResults {
  variant_id: string;
  variant_name: string;
  visitors: number;
  conversions: number;
  conversion_rate: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  is_winner: boolean;
}

export interface TrafficAllocation {
  variant_id: string;
  user_identifier: string;
  allocated_at: Date;
}

export class ABTestingService {
  private logger: Logger;
  private db: Pool;

  constructor(logger: Logger) {
    this.logger = logger;
    this.db = DatabaseConfig.getPool();
  }

  /**
   * Utility function to handle error messaging consistently
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  /**
   * Create a new A/B test
   */
  public async createABTest(
    landingPageId: string,
    testConfig: Partial<ABTestConfig>
  ): Promise<ABTestConfig> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Create the A/B test
      const testResult = await client.query(`
        INSERT INTO landing_page_ab_tests (
          landing_page_id, name, description, status, start_date, end_date,
          confidence_level, min_sample_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        landingPageId,
        testConfig.name,
        testConfig.description,
        testConfig.status || 'draft',
        testConfig.start_date,
        testConfig.end_date,
        testConfig.confidence_level || 95,
        testConfig.min_sample_size || 100
      ]);

      const test = testResult.rows[0];

      // Create variants if provided
      const variants: ABTestVariant[] = [];
      if (testConfig.variants && testConfig.variants.length > 0) {
        for (const variant of testConfig.variants) {
          const variantResult = await client.query(`
            INSERT INTO landing_page_ab_test_variants (
              test_id, name, template_id, traffic_percentage, is_control
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [
            test.id,
            variant.name,
            variant.template_id,
            variant.traffic_percentage,
            variant.is_control
          ]);
          variants.push(variantResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      this.logger.info('A/B test created successfully', {
        testId: test.id,
        landingPageId,
        variantCount: variants.length
      });

      return {
        ...test,
        variants,
        goals: []
      };

    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create A/B test', {
        error: errorMessage,
        landingPageId
      });
      throw new Error(`A/B test creation failed: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  /**
   * Allocate user to a variant based on traffic distribution
   */
  public async allocateUserToVariant(
    testId: string,
    userIdentifier: string
  ): Promise<ABTestVariant | null> {
    try {
      // Check if user is already allocated
      const existingAllocation = await this.db.query(`
        SELECT v.* FROM landing_page_ab_test_variants v
        JOIN landing_page_ab_test_allocations a ON v.id = a.variant_id
        WHERE a.test_id = $1 AND a.user_identifier = $2
      `, [testId, userIdentifier]);

      if (existingAllocation.rows.length > 0) {
        return existingAllocation.rows[0];
      }

      // Get active variants for the test
      const variantsResult = await this.db.query(`
        SELECT v.* FROM landing_page_ab_test_variants v
        JOIN landing_page_ab_tests t ON v.test_id = t.id
        WHERE t.id = $1 AND t.status = 'running'
        ORDER BY v.traffic_percentage DESC
      `, [testId]);

      if (variantsResult.rows.length === 0) {
        return null;
      }

      const variants = variantsResult.rows;
      
      // Validate traffic percentages sum to 100
      const totalTraffic = variants.reduce((sum, v) => sum + v.traffic_percentage, 0);
      if (totalTraffic !== 100) {
        throw new Error('Traffic percentages must sum to 100%');
      }

      // Use deterministic allocation based on user identifier
      const selectedVariant = this.selectVariantDeterministic(variants, userIdentifier);

      // Record the allocation
      await this.db.query(`
        INSERT INTO landing_page_ab_test_allocations (
          test_id, variant_id, user_identifier, allocated_at
        ) VALUES ($1, $2, $3, NOW())
      `, [testId, selectedVariant.id, userIdentifier]);

      this.logger.info('User allocated to A/B test variant', {
        testId,
        variantId: selectedVariant.id,
        userIdentifier: userIdentifier.substring(0, 8) + '...' // Log partial ID for privacy
      });

      return selectedVariant;

    } catch (error) {
      this.logger.error('Failed to allocate user to variant', {
        error: error.message,
        testId,
        userIdentifier: userIdentifier.substring(0, 8) + '...'
      });
      throw new Error(`Variant allocation failed: ${error.message}`);
    }
  }

  /**
   * Deterministic variant selection based on user identifier
   */
  private selectVariantDeterministic(variants: ABTestVariant[], userIdentifier: string): ABTestVariant {
    // Create a hash from user identifier
    let hash = 0;
    for (let i = 0; i < userIdentifier.length; i++) {
      const char = userIdentifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Normalize to 0-99 range
    const bucket = Math.abs(hash) % 100;

    // Allocate based on cumulative traffic percentages
    let cumulativePercentage = 0;
    for (const variant of variants) {
      cumulativePercentage += variant.traffic_percentage;
      if (bucket < cumulativePercentage) {
        return variant;
      }
    }

    // Fallback to control variant
    return variants.find(v => v.is_control) || variants[0];
  }

  /**
   * Record conversion event for A/B test
   */
  public async recordConversion(
    testId: string,
    variantId: string,
    userIdentifier: string,
    conversionType: string = 'conversion',
    conversionValue?: number
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO landing_page_ab_test_conversions (
          test_id, variant_id, user_identifier, conversion_type, conversion_value, converted_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [testId, variantId, userIdentifier, conversionType, conversionValue]);

      this.logger.info('Conversion recorded for A/B test', {
        testId,
        variantId,
        conversionType,
        userIdentifier: userIdentifier.substring(0, 8) + '...'
      });

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error('Failed to record conversion', {
        error: errorMessage,
        testId,
        variantId
      });
      throw new Error(`Conversion recording failed: ${errorMessage}`);
    }
  }

  /**
   * Get A/B test results with statistical analysis
   */
  public async getTestResults(testId: string): Promise<ABTestResults> {
    try {
      // Get variant performance data
      const resultsQuery = await this.db.query(`
        WITH variant_stats AS (
          SELECT 
            v.id as variant_id,
            v.name as variant_name,
            v.is_control,
            COUNT(DISTINCT a.user_identifier) as visitors,
            COUNT(DISTINCT c.user_identifier) as conversions,
            CASE 
              WHEN COUNT(DISTINCT a.user_identifier) > 0 
              THEN (COUNT(DISTINCT c.user_identifier)::float / COUNT(DISTINCT a.user_identifier)) * 100
              ELSE 0 
            END as conversion_rate
          FROM landing_page_ab_test_variants v
          LEFT JOIN landing_page_ab_test_allocations a ON v.id = a.variant_id
          LEFT JOIN landing_page_ab_test_conversions c ON v.id = c.variant_id AND a.user_identifier = c.user_identifier
          WHERE v.test_id = $1
          GROUP BY v.id, v.name, v.is_control
          ORDER BY v.is_control DESC, v.created_at ASC
        )
        SELECT * FROM variant_stats
      `, [testId]);

      const variantResults: VariantResults[] = resultsQuery.rows.map(row => ({
        variant_id: row.variant_id,
        variant_name: row.variant_name,
        visitors: parseInt(row.visitors),
        conversions: parseInt(row.conversions),
        conversion_rate: parseFloat(row.conversion_rate),
        confidence_interval_lower: 0, // Will be calculated
        confidence_interval_upper: 0, // Will be calculated
        is_winner: false // Will be determined
      }));

      // Calculate statistical significance
      const statisticalAnalysis = this.calculateStatisticalSignificance(variantResults);

      return {
        test_id: testId,
        variants: statisticalAnalysis.variants,
        statistical_significance: statisticalAnalysis.significance,
        confidence_interval: statisticalAnalysis.confidence,
        winner_variant_id: statisticalAnalysis.winnerVariantId,
        test_status: statisticalAnalysis.status
      };

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error('Failed to get test results', {
        error: errorMessage,
        testId
      });
      throw new Error(`Test results retrieval failed: ${errorMessage}`);
    }
  }

  /**
   * Calculate statistical significance using Z-test for proportions
   */
  private calculateStatisticalSignificance(variants: VariantResults[]): {
    variants: VariantResults[];
    significance: number;
    confidence: number;
    winnerVariantId?: string;
    status: 'inconclusive' | 'significant' | 'insufficient_data';
  } {
    if (variants.length < 2) {
      return {
        variants,
        significance: 0,
        confidence: 0,
        status: 'insufficient_data'
      };
    }

    const controlVariant = variants.find(v => v.variant_id.includes('control')) || variants[0];
    const testVariants = variants.filter(v => v.variant_id !== controlVariant.variant_id);

    let maxSignificance = 0;
    let winnerVariantId: string | undefined;
    const confidenceLevel = 95; // 95% confidence level

    // Calculate significance for each test variant vs control
    testVariants.forEach(testVariant => {
      const p1 = controlVariant.conversion_rate / 100;
      const p2 = testVariant.conversion_rate / 100;
      const n1 = controlVariant.visitors;
      const n2 = testVariant.visitors;

      if (n1 < 30 || n2 < 30) {
        return; // Insufficient sample size
      }

      // Pooled proportion
      const pPool = (controlVariant.conversions + testVariant.conversions) / (n1 + n2);
      
      // Standard error
      const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
      
      // Z-score
      const z = Math.abs(p2 - p1) / se;
      
      // Two-tailed p-value
      const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
      const significance = (1 - pValue) * 100;

      if (significance > maxSignificance) {
        maxSignificance = significance;
        winnerVariantId = testVariant.conversion_rate > controlVariant.conversion_rate 
          ? testVariant.variant_id 
          : controlVariant.variant_id;
      }

      // Calculate confidence intervals
      const margin1 = 1.96 * Math.sqrt((p1 * (1 - p1)) / n1);
      const margin2 = 1.96 * Math.sqrt((p2 * (1 - p2)) / n2);

      testVariant.confidence_interval_lower = Math.max(0, (p2 - margin2) * 100);
      testVariant.confidence_interval_upper = Math.min(100, (p2 + margin2) * 100);
    });

    // Calculate confidence intervals for control
    const p1 = controlVariant.conversion_rate / 100;
    const n1 = controlVariant.visitors;
    const margin1 = 1.96 * Math.sqrt((p1 * (1 - p1)) / n1);
    controlVariant.confidence_interval_lower = Math.max(0, (p1 - margin1) * 100);
    controlVariant.confidence_interval_upper = Math.min(100, (p1 + margin1) * 100);

    // Mark winner
    if (winnerVariantId) {
      const winner = variants.find(v => v.variant_id === winnerVariantId);
      if (winner) {
        winner.is_winner = true;
      }
    }

    const status = maxSignificance >= confidenceLevel 
      ? 'significant' 
      : variants.every(v => v.visitors >= 30) 
        ? 'inconclusive' 
        : 'insufficient_data';

    return {
      variants,
      significance: maxSignificance,
      confidence: confidenceLevel,
      winnerVariantId,
      status
    };
  }

  /**
   * Cumulative Distribution Function for standard normal distribution
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Update A/B test status
   */
  public async updateTestStatus(
    testId: string, 
    status: 'draft' | 'running' | 'paused' | 'completed'
  ): Promise<void> {
    try {
      await this.db.query(`
        UPDATE landing_page_ab_tests 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [status, testId]);

      this.logger.info('A/B test status updated', { testId, status });

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error('Failed to update test status', {
        error: errorMessage,
        testId,
        status
      });
      throw new Error(`Test status update failed: ${errorMessage}`);
    }
  }

  /**
   * Get active tests for a landing page
   */
  public async getActiveTestsForPage(landingPageId: string): Promise<ABTestConfig[]> {
    try {
      const testsResult = await this.db.query(`
        SELECT t.*, 
               json_agg(
                 json_build_object(
                   'id', v.id,
                   'name', v.name,
                   'template_id', v.template_id,
                   'traffic_percentage', v.traffic_percentage,
                   'is_control', v.is_control
                 )
               ) as variants
        FROM landing_page_ab_tests t
        LEFT JOIN landing_page_ab_test_variants v ON t.id = v.test_id
        WHERE t.landing_page_id = $1 AND t.status = 'running'
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, [landingPageId]);

      return testsResult.rows.map(row => ({
        ...row,
        variants: row.variants || [],
        goals: [] // Would be loaded separately if needed
      }));

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error('Failed to get active tests', {
        error: errorMessage,
        landingPageId
      });
      throw new Error(`Active tests retrieval failed: ${errorMessage}`);
    }
  }

  /**
   * Clean up old test data (for maintenance)
   */
  public async cleanupOldTestData(daysToKeep: number = 90): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Delete old conversions
      const conversionsDeleted = await client.query(`
        DELETE FROM landing_page_ab_test_conversions 
        WHERE converted_at < $1
      `, [cutoffDate]);

      // Delete old allocations
      const allocationsDeleted = await client.query(`
        DELETE FROM landing_page_ab_test_allocations 
        WHERE allocated_at < $1
      `, [cutoffDate]);

      await client.query('COMMIT');

      this.logger.info('A/B test data cleanup completed', {
        conversionsDeleted: conversionsDeleted.rowCount,
        allocationsDeleted: allocationsDeleted.rowCount,
        cutoffDate
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = this.getErrorMessage(error);
      this.logger.error('Failed to cleanup old test data', {
        error: errorMessage
      });
      throw new Error(`Test data cleanup failed: ${errorMessage}`);
    } finally {
      client.release();
    }
  }
}