import { Pool } from 'pg';
import { config } from '../config/database.config';
import { RetentionExecution, PaginationOptions, PaginatedResponse } from '../interfaces';
import { logger } from '../utils/logger';

export class RetentionExecutionRepository {
  private pool: Pool;

  constructor() {
    this.pool = config.pool;
  }

  async create(executionData: Omit<RetentionExecution, 'id' | 'started_at'>): Promise<RetentionExecution> {
    const client = await this.pool.connect();
    
    try {
      const id = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      const result = await client.query(
        `INSERT INTO retention_executions (
          id, policy_id, status, records_processed, records_archived, 
          records_deleted, error_message, execution_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          id,
          executionData.policy_id,
          executionData.status || 'running',
          executionData.records_processed || 0,
          executionData.records_archived || 0,
          executionData.records_deleted || 0,
          executionData.error_message,
          executionData.execution_metadata ? JSON.stringify(executionData.execution_metadata) : null
        ]
      );

      logger.info('Execution created', { 
        executionId: id, 
        policyId: executionData.policy_id 
      });

      return this.mapRowToExecution(result.rows[0]);

    } catch (error) {
      logger.error('Error creating execution:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<RetentionExecution | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT re.*, drp.name as policy_name, drp.table_name
         FROM retention_executions re
         LEFT JOIN data_retention_policies drp ON re.policy_id = drp.id
         WHERE re.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToExecution(result.rows[0]);

    } catch (error) {
      logger.error('Error finding execution by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(options: PaginationOptions & { 
    status?: string; 
    policyId?: string;
    sortBy?: string;
    sortOrder?: string; 
  } = {}): Promise<PaginatedResponse<RetentionExecution>> {
    const client = await this.pool.connect();
    
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || options.sort_by || 'started_at';
      const sortOrder = options.sortOrder || options.sort_order || 'DESC';

      // Build WHERE clause
      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (options.status) {
        paramCount++;
        conditions.push(`re.status = $${paramCount}`);
        params.push(options.status);
      }

      if (options.policyId) {
        paramCount++;
        conditions.push(`re.policy_id = $${paramCount}`);
        params.push(options.policyId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Validate sort column
      const allowedSortColumns = ['started_at', 'completed_at', 'status', 'records_processed'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'started_at';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM retention_executions re ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].total, 10);

      // Build the main query
      const orderBy = `ORDER BY re.${safeSortBy} ${sortOrder}`;
      const limitOffsetClause = `LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      
      const query = `
        SELECT re.*, drp.name as policy_name, drp.table_name
        FROM retention_executions re
        LEFT JOIN data_retention_policies drp ON re.policy_id = drp.id
        ${whereClause}
        ${orderBy}
        ${limitOffsetClause}
      `;
      
      const result = await client.query(query, [...params, limit, offset]);

      return {
        data: result.rows.map(row => this.mapRowToExecution(row)),
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          records_per_page: limit,
          has_next: page < Math.ceil(totalRecords / limit),
          has_previous: page > 1
        }
      };

    } catch (error) {
      logger.error('Error finding all executions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async count(options: { status?: string; policyId?: string } = {}): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const conditions = [];
      const params = [];
      let paramCount = 0;

      if (options.status) {
        paramCount++;
        conditions.push(`status = $${paramCount}`);
        params.push(options.status);
      }

      if (options.policyId) {
        paramCount++;
        conditions.push(`policy_id = $${paramCount}`);
        params.push(options.policyId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT COUNT(*) as total FROM retention_executions ${whereClause}`;
      
      const result = await client.query(query, params);
      return parseInt(result.rows[0].total, 10);

    } catch (error) {
      logger.error('Error counting executions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: Partial<RetentionExecution>): Promise<RetentionExecution> {
    const client = await this.pool.connect();
    
    try {
      const updateFields = [];
      const params = [id];
      let paramIndex = 1;

      // Build update fields dynamically
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'started_at') {
          paramIndex++;
          if (key === 'execution_metadata') {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(value ? JSON.stringify(value) : null as any);
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            params.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE retention_executions
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        throw new Error(`Execution with id ${id} not found`);
      }

      logger.info('Execution updated', { 
        executionId: id, 
        updates: Object.keys(updates) 
      });

      return this.mapRowToExecution(result.rows[0]);

    } catch (error) {
      logger.error('Error updating execution:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: RetentionExecution['status'], errorMessage?: string): Promise<RetentionExecution> {
    const updates: Partial<RetentionExecution> = {
      status,
      completed_at: ['completed', 'failed', 'cancelled'].includes(status) ? new Date() : undefined
    };

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    return await this.update(id, updates);
  }

  async findByPolicyId(policyId: string, options: PaginationOptions = {}): Promise<PaginatedResponse<RetentionExecution>> {
    return this.findAll({ ...options, policyId });
  }

  async findByStatus(status: RetentionExecution['status'], options: PaginationOptions = {}): Promise<PaginatedResponse<RetentionExecution>> {
    return this.findAll({ ...options, status });
  }

  async markAsCompleted(id: string, recordsProcessed: number, recordsArchived: number, recordsDeleted: number, metadata?: any): Promise<RetentionExecution> {
    return await this.update(id, {
      status: 'completed',
      completed_at: new Date(),
      records_processed: recordsProcessed,
      records_archived: recordsArchived,
      records_deleted: recordsDeleted,
      execution_metadata: metadata
    });
  }

  async markAsFailed(id: string, errorMessage: string, metadata?: any): Promise<RetentionExecution> {
    return await this.update(id, {
      status: 'failed',
      completed_at: new Date(),
      error_message: errorMessage,
      execution_metadata: metadata
    });
  }

  async cancel(id: string): Promise<RetentionExecution> {
    return await this.update(id, {
      status: 'cancelled',
      completed_at: new Date()
    });
  }

  async getExecutionStats(policyId?: string): Promise<{
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    running_executions: number;
    cancelled_executions: number;
    total_records_processed: number;
    total_records_archived: number;
    total_records_deleted: number;
    avg_execution_time_minutes: number;
  }> {
    return this.getStatistics(30, policyId); // Default to 30 days for backward compatibility
  }

  async getStatistics(days: number = 30, policyId?: string): Promise<{
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    running_executions: number;
    cancelled_executions: number;
    total_records_processed: number;
    total_records_archived: number;
    total_records_deleted: number;
    avg_execution_time_minutes: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      let whereClause = 'WHERE started_at >= $1';
      let params: any[] = [sinceDate];

      if (policyId) {
        whereClause += ' AND policy_id = $2';
        params.push(policyId);
      }

      const query = `
        SELECT 
          COUNT(*) as total_executions,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
          COUNT(*) FILTER (WHERE status = 'running') as running_executions,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_executions,
          COALESCE(SUM(records_processed), 0) as total_records_processed,
          COALESCE(SUM(records_archived), 0) as total_records_archived,
          COALESCE(SUM(records_deleted), 0) as total_records_deleted,
          COALESCE(AVG(
            EXTRACT(epoch FROM (completed_at - started_at)) / 60
          ) FILTER (WHERE completed_at IS NOT NULL), 0) as avg_execution_time_minutes
        FROM retention_executions 
        ${whereClause}
      `;

      const result = await client.query(query, params);
      const row = result.rows[0];

      return {
        total_executions: parseInt(row.total_executions, 10),
        successful_executions: parseInt(row.successful_executions, 10),
        failed_executions: parseInt(row.failed_executions, 10),
        running_executions: parseInt(row.running_executions, 10),
        cancelled_executions: parseInt(row.cancelled_executions, 10),
        total_records_processed: parseInt(row.total_records_processed, 10),
        total_records_archived: parseInt(row.total_records_archived, 10),
        total_records_deleted: parseInt(row.total_records_deleted, 10),
        avg_execution_time_minutes: parseFloat(row.avg_execution_time_minutes) || 0
      };

    } catch (error) {
      logger.error('Error getting execution statistics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToExecution(row: any): RetentionExecution {
    return {
      id: row.id,
      policy_id: row.policy_id,
      started_at: row.started_at,
      completed_at: row.completed_at,
      status: row.status,
      records_processed: row.records_processed,
      records_archived: row.records_archived,
      records_deleted: row.records_deleted,
      error_message: row.error_message,
      execution_metadata: row.execution_metadata ? JSON.parse(row.execution_metadata) : null
    };
  }
}

export const retentionExecutionRepository = new RetentionExecutionRepository();
export default retentionExecutionRepository;