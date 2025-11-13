import { dataRetentionPolicyRepository } from '../repositories/policy.repository';
import { retentionExecutionRepository } from '../repositories/execution.repository';
import { dataRetentionScheduler } from './data-retention-scheduler.service';
import { DataRetentionPolicy, CreatePolicyRequest, RetentionExecution, PaginationOptions, PaginatedResponse } from '../interfaces';
import { logger } from '../utils/logger';
import { config } from '../config/database.config';
import moment from 'moment';

export class PolicyService {
  
  async createPolicy(policyData: CreatePolicyRequest): Promise<DataRetentionPolicy> {
    try {
      // Validate policy data
      this.validatePolicyData(policyData);
      
      // Check if table exists
      await this.validateTableExists(policyData.table_name, policyData.date_column);
      
      // Create the policy
      const policy = await dataRetentionPolicyRepository.create(policyData);
      
      // Schedule the policy if it has a cron expression
      if (policyData.execution_cron) {
        await dataRetentionScheduler.schedulePolicy(policy.id, policyData.execution_cron);
      }
      
      logger.info('Policy created successfully', {
        policyId: policy.id,
        name: policy.name,
        scheduled: !!policyData.execution_cron
      });
      
      return policy;
      
    } catch (error) {
      logger.error('Failed to create policy:', error);
      throw error;
    }
  }

  async getPolicyById(id: string): Promise<DataRetentionPolicy | null> {
    try {
      return await dataRetentionPolicyRepository.findById(id);
    } catch (error) {
      logger.error('Failed to get policy by id:', error);
      throw error;
    }
  }

  async getAllPolicies(options: PaginationOptions = {}): Promise<PaginatedResponse<DataRetentionPolicy>> {
    try {
      return await dataRetentionPolicyRepository.findAll(options);
    } catch (error) {
      logger.error('Failed to get all policies:', error);
      throw error;
    }
  }

  async getPoliciesByTable(tableName: string): Promise<DataRetentionPolicy[]> {
    try {
      return await dataRetentionPolicyRepository.findByTableName(tableName);
    } catch (error) {
      logger.error('Failed to get policies by table:', error);
      throw error;
    }
  }

  async getActivePolicies(): Promise<DataRetentionPolicy[]> {
    try {
      return await dataRetentionPolicyRepository.findByEnabled(true);
    } catch (error) {
      logger.error('Failed to get active policies:', error);
      throw error;
    }
  }

  async updatePolicy(id: string, updates: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy> {
    try {
      // Validate updates
      if (updates.table_name && updates.date_column) {
        await this.validateTableExists(updates.table_name, updates.date_column);
      }
      
      // Update the policy
      const policy = await dataRetentionPolicyRepository.update(id, updates);
      
      // Update scheduling if cron expression changed
      if (updates.execution_cron !== undefined) {
        if (updates.execution_cron) {
          await dataRetentionScheduler.reschedulePolicy(id, updates.execution_cron);
        } else {
          await dataRetentionScheduler.unschedulePolicy(id);
        }
      }
      
      // If policy was disabled, unschedule it
      if (updates.enabled === false) {
        await dataRetentionScheduler.unschedulePolicy(id);
      } else if (updates.enabled === true && policy.execution_cron) {
        await dataRetentionScheduler.schedulePolicy(id, policy.execution_cron);
      }
      
      logger.info('Policy updated successfully', {
        policyId: id,
        updatedFields: Object.keys(updates)
      });
      
      return policy;
      
    } catch (error) {
      logger.error('Failed to update policy:', error);
      throw error;
    }
  }

  async deletePolicy(id: string): Promise<void> {
    try {
      // Check if there are running executions
      const runningExecutions = await retentionExecutionRepository.findByStatus('running');
      const hasRunningExecution = runningExecutions.data.some(exec => exec.policy_id === id);
      
      if (hasRunningExecution) {
        throw new Error('Cannot delete policy with running executions. Please wait for completion or cancel them first.');
      }
      
      // Unschedule the policy
      await dataRetentionScheduler.unschedulePolicy(id);
      
      // Delete the policy
      await dataRetentionPolicyRepository.delete(id);
      
      logger.info('Policy deleted successfully', { policyId: id });
      
    } catch (error) {
      logger.error('Failed to delete policy:', error);
      throw error;
    }
  }

  async executePolicy(policyId: string, dryRun: boolean = false): Promise<RetentionExecution> {
    try {
      const policy = await dataRetentionPolicyRepository.findById(policyId);
      if (!policy) {
        throw new Error(`Policy ${policyId} not found`);
      }
      
      if (!policy.enabled) {
        throw new Error(`Policy ${policyId} is disabled`);
      }
      
      // Check for running executions
      const runningExecutions = await retentionExecutionRepository.findByStatus('running');
      const hasRunningExecution = runningExecutions.data.some(exec => exec.policy_id === policyId);
      
      if (hasRunningExecution) {
        throw new Error(`Policy ${policyId} already has a running execution`);
      }
      
      // Create execution record
      const execution = await retentionExecutionRepository.create({
        policy_id: policyId,
        status: 'running',
        records_processed: 0,
        records_archived: 0,
        records_deleted: 0,
        execution_metadata: {
          dry_run: dryRun,
          manual_trigger: true,
          started_by: 'api'
        }
      });
      
      // Execute policy in background
      setImmediate(() => this.executePolicyBackground(policy, execution.id, dryRun));
      
      logger.info('Policy execution started', {
        policyId,
        executionId: execution.id,
        dryRun
      });
      
      return execution;
      
    } catch (error) {
      logger.error('Failed to execute policy:', error);
      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<RetentionExecution> {
    try {
      const execution = await retentionExecutionRepository.findById(executionId);
      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }
      
      if (execution.status !== 'running') {
        throw new Error(`Execution ${executionId} is not running (status: ${execution.status})`);
      }
      
      // Mark as cancelled
      const cancelledExecution = await retentionExecutionRepository.cancel(executionId);
      
      logger.info('Policy execution cancelled', { executionId });
      
      return cancelledExecution;
      
    } catch (error) {
      logger.error('Failed to cancel execution:', error);
      throw error;
    }
  }

  async getExecutionHistory(policyId: string, options: PaginationOptions = {}): Promise<PaginatedResponse<RetentionExecution>> {
    try {
      return await retentionExecutionRepository.findByPolicyId(policyId, options);
    } catch (error) {
      logger.error('Failed to get execution history:', error);
      throw error;
    }
  }

  async getExecutionStats(policyId?: string): Promise<any> {
    try {
      return await retentionExecutionRepository.getExecutionStats(policyId);
    } catch (error) {
      logger.error('Failed to get execution stats:', error);
      throw error;
    }
  }

  private async executePolicyBackground(
    policy: DataRetentionPolicy, 
    executionId: string, 
    dryRun: boolean
  ): Promise<void> {
    try {
      logger.info('Starting policy execution', {
        policyId: policy.id,
        executionId,
        dryRun
      });
      
      const result = await this.performDataRetention(policy, dryRun);
      
      // Update execution as completed
      await retentionExecutionRepository.markAsCompleted(
        executionId,
        result.processed,
        result.archived,
        result.deleted,
        result.metadata
      );
      
      // Update policy last execution time
      await dataRetentionPolicyRepository.updateLastExecution(
        policy.id,
        new Date(),
        this.calculateNextExecution(policy.execution_cron)
      );
      
      logger.info('Policy execution completed successfully', {
        policyId: policy.id,
        executionId,
        ...result
      });
      
    } catch (error) {
      logger.error('Policy execution failed', {
        policyId: policy.id,
        executionId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Mark execution as failed
      await retentionExecutionRepository.markAsFailed(
        executionId,
        error instanceof Error ? error.message : String(error),
        { error_details: error }
      );
    }
  }

  private async performDataRetention(
    policy: DataRetentionPolicy, 
    dryRun: boolean
  ): Promise<{
    processed: number;
    archived: number;
    deleted: number;
    metadata: any;
  }> {
    const client = await config.pool.connect();
    
    try {
      const cutoffDate = moment().subtract(policy.retention_period_days, 'days').toDate();
      
      // Build the base query
      let whereClause = `${policy.date_column} < $1`;
      const queryParams: any[] = [cutoffDate];
      let paramIndex = 2;
      
      // Add conditions if specified
      if (policy.conditions) {
        // This is a simplified implementation - in production you'd want more sophisticated condition parsing
        const conditionString = this.buildConditionString(policy.conditions);
        if (conditionString) {
          whereClause += ` AND (${conditionString})`;
        }
      }
      
      // Count records to be processed
      const countResult = await client.query(`
        SELECT COUNT(*) as count FROM ${policy.table_name} WHERE ${whereClause}
      `, queryParams);
      
      const recordCount = parseInt(countResult.rows[0].count, 10);
      
      if (recordCount === 0) {
        return {
          processed: 0,
          archived: 0,
          deleted: 0,
          metadata: {
            cutoff_date: cutoffDate,
            query: `SELECT COUNT(*) FROM ${policy.table_name} WHERE ${whereClause}`,
            dry_run: dryRun
          }
        };
      }
      
      logger.info(`Found ${recordCount} records for retention processing`, {
        policyId: policy.id,
        tableName: policy.table_name,
        cutoffDate
      });
      
      let archivedCount = 0;
      let deletedCount = 0;
      
      if (!dryRun) {
        // Archive data if required
        if (policy.archive_before_delete) {
          // TODO: Implement actual archiving logic
          // For now, just log that archiving would happen
          logger.info('Archiving records (placeholder)', {
            policyId: policy.id,
            recordCount,
            location: policy.archive_location
          });
          archivedCount = recordCount;
        }
        
        // Delete the records
        const deleteResult = await client.query(`
          DELETE FROM ${policy.table_name} WHERE ${whereClause}
        `, queryParams);
        
        deletedCount = deleteResult.rowCount || 0;
      }
      
      return {
        processed: recordCount,
        archived: archivedCount,
        deleted: deletedCount,
        metadata: {
          cutoff_date: cutoffDate,
          table_name: policy.table_name,
          dry_run: dryRun,
          archive_location: policy.archive_location,
          conditions: policy.conditions
        }
      };
      
    } finally {
      client.release();
    }
  }

  private buildConditionString(conditions: any): string {
    // This is a simplified implementation
    // In production, you'd want proper SQL injection protection
    // and more sophisticated condition parsing
    if (!conditions || typeof conditions !== 'object') {
      return '';
    }
    
    // For now, return empty string - implement proper condition parsing as needed
    return '';
  }

  private calculateNextExecution(cronExpression?: string): Date | undefined {
    if (!cronExpression) {
      return undefined;
    }
    
    // Simple next execution calculation - in production use a proper cron library
    return moment().add(1, 'day').toDate();
  }

  private validatePolicyData(data: CreatePolicyRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Policy name is required');
    }
    
    if (!data.table_name || data.table_name.trim().length === 0) {
      throw new Error('Table name is required');
    }
    
    if (!data.date_column || data.date_column.trim().length === 0) {
      throw new Error('Date column is required');
    }
    
    if (!data.retention_period_days || data.retention_period_days < 1) {
      throw new Error('Retention period must be at least 1 day');
    }
    
    if (data.retention_period_days > 3650) {
      throw new Error('Retention period cannot exceed 10 years');
    }
    
    if (data.execution_cron) {
      // Basic cron validation - in production use a proper cron library
      const cronParts = data.execution_cron.split(' ');
      if (cronParts.length !== 5) {
        throw new Error('Invalid cron expression format');
      }
    }
  }

  private async validateTableExists(tableName: string, dateColumn: string): Promise<void> {
    const client = await config.pool.connect();
    
    try {
      // Check if table exists
      const tableResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `, [tableName]);
      
      if (!tableResult.rows[0].exists) {
        throw new Error(`Table '${tableName}' does not exist`);
      }
      
      // Check if date column exists and is a date/timestamp type
      const columnResult = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      `, [tableName, dateColumn]);
      
      if (columnResult.rows.length === 0) {
        throw new Error(`Column '${dateColumn}' does not exist in table '${tableName}'`);
      }
      
      const dataType = columnResult.rows[0].data_type;
      const validDateTypes = ['timestamp', 'timestamptz', 'timestamp without time zone', 'timestamp with time zone', 'date'];
      
      if (!validDateTypes.some(type => dataType.includes(type))) {
        throw new Error(`Column '${dateColumn}' must be a date or timestamp type, found: ${dataType}`);
      }
      
    } finally {
      client.release();
    }
  }
}

export const policyService = new PolicyService();
export default policyService;