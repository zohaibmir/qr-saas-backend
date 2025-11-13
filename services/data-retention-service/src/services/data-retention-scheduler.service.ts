import * as cron from 'node-cron';
import moment from 'moment';
import { config } from '../config/database.config';
import { componentLoggers } from '../utils/logger';
import { DataRetentionPolicy, RetentionExecution } from '../interfaces';

interface ScheduledTask {
  task: cron.ScheduledTask;
  policyId: string;
  cronExpression: string;
  nextExecution: Date;
}

class DataRetentionSchedulerService {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private isInitialized = false;

  async start(): Promise<void> {
    if (this.isInitialized) {
      componentLoggers.scheduler.warn('Scheduler already initialized');
      return;
    }

    componentLoggers.scheduler.info('Starting data retention scheduler');

    try {
      // Load existing policies and schedule them
      await this.loadAndSchedulePolicies();
      
      // Schedule automatic policy rescheduling (every hour)
      this.schedulePeriodicSync();
      
      this.isInitialized = true;
      componentLoggers.scheduler.info('Data retention scheduler started successfully');
      
    } catch (error) {
      componentLoggers.scheduler.error('Failed to start scheduler:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    componentLoggers.scheduler.info('Stopping data retention scheduler');
    
    // Stop all scheduled tasks
    for (const [policyId, scheduledTask] of this.scheduledTasks) {
      scheduledTask.task.stop();
      componentLoggers.scheduler.info(`Stopped task for policy: ${policyId}`);
    }
    
    this.scheduledTasks.clear();
    this.isInitialized = false;
    
    componentLoggers.scheduler.info('Data retention scheduler stopped');
  }

  async schedulePolicy(policyId: string, cronExpression: string): Promise<void> {
    componentLoggers.scheduler.info(`Scheduling policy ${policyId} with cron: ${cronExpression}`);
    
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    
    // Unschedule existing task if it exists
    await this.unschedulePolicy(policyId);
    
    // Create new scheduled task
    const task = cron.schedule(cronExpression, async () => {
      await this.executePolicyJob(policyId);
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });
    
    // Calculate next execution time
    const nextExecution = this.getNextExecution(cronExpression);
    
    // Store the scheduled task
    const scheduledTask: ScheduledTask = {
      task,
      policyId,
      cronExpression,
      nextExecution
    };
    
    this.scheduledTasks.set(policyId, scheduledTask);
    
    // Start the task
    task.start();
    
    // Update policy with next execution time
    await this.updatePolicyNextExecution(policyId, nextExecution);
    
    componentLoggers.scheduler.info(`Policy ${policyId} scheduled successfully. Next execution: ${nextExecution.toISOString()}`);
  }

  async unschedulePolicy(policyId: string): Promise<void> {
    const scheduledTask = this.scheduledTasks.get(policyId);
    
    if (scheduledTask) {
      scheduledTask.task.stop();
      this.scheduledTasks.delete(policyId);
      
      componentLoggers.scheduler.info(`Unscheduled policy: ${policyId}`);
    }
  }

  async reschedulePolicy(policyId: string, cronExpression: string): Promise<void> {
    await this.unschedulePolicy(policyId);
    await this.schedulePolicy(policyId, cronExpression);
  }

  private async loadAndSchedulePolicies(): Promise<void> {
    try {
      const client = await config.pool.connect();
      
      // Get all enabled policies with cron expressions
      const result = await client.query(`
        SELECT id, schedule_cron, name
        FROM data_retention_policies 
        WHERE status = 'ACTIVE' 
        AND schedule_cron IS NOT NULL
        AND schedule_cron != ''
      `);
      
      client.release();
      
      componentLoggers.scheduler.info(`Found ${result.rows.length} policies to schedule`);
      
      for (const policy of result.rows) {
        try {
          await this.schedulePolicy(policy.id, policy.schedule_cron);
        } catch (error) {
          componentLoggers.scheduler.error(`Failed to schedule policy ${policy.id} (${policy.name}):`, error);
        }
      }
      
    } catch (error) {
      componentLoggers.scheduler.error('Failed to load policies for scheduling:', error);
      throw error;
    }
  }

  private schedulePeriodicSync(): void {
    // Sync policies every hour
    cron.schedule('0 * * * *', async () => {
      componentLoggers.scheduler.info('Running periodic policy sync');
      try {
        await this.loadAndSchedulePolicies();
      } catch (error) {
        componentLoggers.scheduler.error('Periodic policy sync failed:', error);
      }
    }, {
      timezone: process.env.TIMEZONE || 'UTC'
    });
  }

  private async executePolicyJob(policyId: string): Promise<void> {
    const executionId = this.generateExecutionId();
    
    componentLoggers.scheduler.info(`Starting execution of policy ${policyId}`, {
      executionId,
      policyId
    });

    try {
      // Create execution record
      const execution = await this.createExecution(policyId, executionId);
      
      // TODO: Implement actual policy execution logic
      // This will be implemented when we create the retention engine
      componentLoggers.scheduler.info(`Policy execution completed for ${policyId}`, {
        executionId,
        policyId
      });
      
      // Update execution as completed
      await this.updateExecution(executionId, {
        status: 'completed',
        completed_at: new Date(),
        records_processed: 0, // TODO: Get actual counts
        records_archived: 0,
        records_deleted: 0
      });
      
      // Update policy last execution time and next execution
      const scheduledTask = this.scheduledTasks.get(policyId);
      if (scheduledTask) {
        const nextExecution = this.getNextExecution(scheduledTask.cronExpression);
        await this.updatePolicyNextExecution(policyId, nextExecution);
        scheduledTask.nextExecution = nextExecution;
      }
      
    } catch (error) {
      componentLoggers.scheduler.error(`Policy execution failed for ${policyId}:`, error);
      
      // Update execution as failed
      await this.updateExecution(executionId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async createExecution(policyId: string, executionId: string): Promise<RetentionExecution> {
    const client = await config.pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO data_retention_executions (
          id, policy_id, started_at, status, 
          records_processed, records_archived, records_deleted
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        executionId,
        policyId,
        new Date(),
        'running',
        0,
        0,
        0
      ]);
      
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }

  private async updateExecution(executionId: string, updates: Partial<RetentionExecution>): Promise<void> {
    const client = await config.pool.connect();
    
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [executionId, ...Object.values(updates)];
      
      await client.query(`
        UPDATE data_retention_executions 
        SET ${setClause}
        WHERE id = $1
      `, values);
      
    } finally {
      client.release();
    }
  }

  private async updatePolicyNextExecution(policyId: string, nextExecution: Date): Promise<void> {
    const client = await config.pool.connect();
    
    try {
      await client.query(`
        UPDATE data_retention_policies 
        SET next_run_at = $2, last_run_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [policyId, nextExecution]);
      
    } finally {
      client.release();
    }
  }

  private getNextExecution(cronExpression: string): Date {
    // Simple next execution calculation
    // This is a basic implementation; in production, you might want to use a more sophisticated library
    const now = new Date();
    const next = new Date(now.getTime() + 60000); // Default to 1 minute from now
    
    // TODO: Implement proper cron expression parsing for accurate next execution time
    // For now, we'll use a simple approach
    
    return next;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for monitoring
  getScheduledPolicies(): Array<{policyId: string; cronExpression: string; nextExecution: Date}> {
    return Array.from(this.scheduledTasks.values()).map(task => ({
      policyId: task.policyId,
      cronExpression: task.cronExpression,
      nextExecution: task.nextExecution
    }));
  }

  isScheduled(policyId: string): boolean {
    return this.scheduledTasks.has(policyId);
  }

  getNextExecutionTime(policyId: string): Date | null {
    const task = this.scheduledTasks.get(policyId);
    return task ? task.nextExecution : null;
  }
}

export const dataRetentionScheduler = new DataRetentionSchedulerService();
export default dataRetentionScheduler;