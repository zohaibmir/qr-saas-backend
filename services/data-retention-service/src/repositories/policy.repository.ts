import { Pool } from 'pg';
import { config } from '../config/database.config';
import { DataRetentionPolicy, CreatePolicyRequest, PaginationOptions, PaginatedResponse } from '../interfaces';
import { logger } from '../utils/logger';

export class DataRetentionPolicyRepository {
  private pool: Pool;

  constructor() {
    this.pool = config.pool;
  }

  async create(policyData: CreatePolicyRequest): Promise<DataRetentionPolicy> {
    const client = await this.pool.connect();
    
    try {
      const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(`
        INSERT INTO data_retention_policies (
          id, name, description, table_name, retention_period_days,
          date_column, conditions, archive_before_delete, archive_location,
          enabled, schedule_cron, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        id,
        policyData.name,
        policyData.description,
        policyData.table_name,
        policyData.retention_period_days,
        policyData.date_column,
        policyData.conditions ? JSON.stringify(policyData.conditions) : null,
        policyData.archive_before_delete,
        policyData.archive_location,
        true, // enabled by default
        policyData.execution_cron
      ]);

      logger.info('Created retention policy', {
        policyId: id,
        name: policyData.name,
        tableName: policyData.table_name
      });

      return this.mapRowToPolicy(result.rows[0]);
      
    } catch (error) {
      logger.error('Failed to create retention policy:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<DataRetentionPolicy | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM data_retention_policies WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPolicy(result.rows[0]);
      
    } catch (error) {
      logger.error('Failed to find retention policy:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(options: PaginationOptions = {}): Promise<PaginatedResponse<DataRetentionPolicy>> {
    const client = await this.pool.connect();
    
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100); // Max 100 per page
      const offset = (page - 1) * limit;
      const sortBy = options.sort_by || 'created_at';
      const sortOrder = options.sort_order || 'DESC';

      // Validate sort column to prevent SQL injection
      const allowedSortColumns = ['id', 'name', 'table_name', 'created_at', 'updated_at', 'last_executed'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM data_retention_policies'
      );
      const totalRecords = parseInt(countResult.rows[0].total, 10);

      // Get policies with pagination
      const result = await client.query(`
        SELECT * FROM data_retention_policies
        ORDER BY ${safeSortBy} ${sortOrder}
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const policies = result.rows.map(row => this.mapRowToPolicy(row));
      
      const totalPages = Math.ceil(totalRecords / limit);
      
      return {
        data: policies,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limit,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      };
      
    } catch (error) {
      logger.error('Failed to find retention policies:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByEnabled(enabled: boolean): Promise<DataRetentionPolicy[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM data_retention_policies WHERE enabled = $1 ORDER BY created_at DESC',
        [enabled]
      );

      return result.rows.map(row => this.mapRowToPolicy(row));
      
    } catch (error) {
      logger.error('Failed to find retention policies by enabled status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByTableName(tableName: string): Promise<DataRetentionPolicy[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM data_retention_policies WHERE table_name = $1 ORDER BY created_at DESC',
        [tableName]
      );

      return result.rows.map(row => this.mapRowToPolicy(row));
      
    } catch (error) {
      logger.error('Failed to find retention policies by table name:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy> {
    const client = await this.pool.connect();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const allowedFields = [
        'name', 'description', 'table_name', 'retention_period_days',
        'date_column', 'conditions', 'archive_before_delete', 'archive_location',
        'enabled', 'schedule_cron'
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex + 1}`);
          if (key === 'conditions' && value !== null) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const result = await client.query(`
        UPDATE data_retention_policies 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `, [id, ...values]);

      if (result.rows.length === 0) {
        throw new Error(`Policy with id ${id} not found`);
      }

      logger.info('Updated retention policy', {
        policyId: id,
        updatedFields: Object.keys(updates)
      });

      return this.mapRowToPolicy(result.rows[0]);
      
    } catch (error) {
      logger.error('Failed to update retention policy:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM data_retention_policies WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error(`Policy with id ${id} not found`);
      }

      logger.info('Deleted retention policy', { policyId: id });
      
    } catch (error) {
      logger.error('Failed to delete retention policy:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastExecution(id: string, lastExecuted: Date, nextExecution?: Date): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE data_retention_policies 
        SET last_executed = $1, next_execution = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [lastExecuted, nextExecution, id]);
      
    } catch (error) {
      logger.error('Failed to update policy execution times:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findScheduledPolicies(): Promise<DataRetentionPolicy[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM data_retention_policies 
        WHERE enabled = true 
        AND schedule_cron IS NOT NULL 
        AND schedule_cron != ''
        ORDER BY created_at ASC
      `);

      return result.rows.map(row => this.mapRowToPolicy(row));
      
    } catch (error) {
      logger.error('Failed to find scheduled policies:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToPolicy(row: any): DataRetentionPolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      table_name: row.table_name,
      retention_period_days: row.retention_period_days,
      date_column: row.date_column,
      conditions: row.conditions ? JSON.parse(row.conditions) : null,
      archive_before_delete: row.archive_before_delete,
      archive_location: row.archive_location,
      enabled: row.enabled,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_executed: row.last_executed,
      next_execution: row.next_execution,
      execution_cron: row.schedule_cron
    };
  }
}

export const dataRetentionPolicyRepository = new DataRetentionPolicyRepository();
export default dataRetentionPolicyRepository;