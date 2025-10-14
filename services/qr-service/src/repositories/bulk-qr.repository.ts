import { Pool, PoolClient } from 'pg';
import { 
  IBulkQRRepository,
  BulkQRTemplate,
  BulkQRBatch,
  BulkQRItem,
  BulkItemStats,
  BulkStats,
  BulkBatchQueryOptions,
  BulkBatchStatus,
  BulkItemStatus,
  DatabaseError,
  NotFoundError,
  ILogger 
} from '../interfaces';

/**
 * Bulk QR Repository - Data Access Layer
 * 
 * Handles all database operations for bulk QR generation
 * Follows clean architecture principles with dependency inversion
 */
export class BulkQRRepository implements IBulkQRRepository {
  constructor(
    private readonly database: Pool,
    private readonly logger: ILogger
  ) {}

  // ===============================================
  // BULK TEMPLATES OPERATIONS
  // ===============================================

  /**
   * Create a new bulk template
   */
  async createBulkTemplate(templateData: any): Promise<BulkQRTemplate> {
    const client = await this.database.connect();
    try {
      this.logger.info('Creating bulk template', { templateData });

      const query = `
        INSERT INTO qr_bulk_templates (
          user_id, name, description, template_type, field_mappings,
          default_values, validation_rules, qr_settings, is_system_template
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        templateData.userId || null,
        templateData.name,
        templateData.description || null,
        templateData.templateType,
        JSON.stringify(templateData.fieldMappings),
        JSON.stringify(templateData.defaultValues || {}),
        JSON.stringify(templateData.validationRules || {}),
        JSON.stringify(templateData.qrSettings || {}),
        templateData.isSystemTemplate || false
      ];

      const result = await client.query(query, values);
      const template = this.mapTemplateFromDb(result.rows[0]);
      
      this.logger.info('Bulk template created successfully', { templateId: template.id });
      return template;

    } catch (error) {
      this.logger.error('Failed to create bulk template', { error, templateData });
      throw new DatabaseError('Failed to create bulk template');
    } finally {
      client.release();
    }
  }

  /**
   * Find bulk template by ID
   */
  async findBulkTemplateById(templateId: string): Promise<BulkQRTemplate | null> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Finding bulk template by ID', { templateId });

      const query = 'SELECT * FROM qr_bulk_templates WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [templateId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapTemplateFromDb(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find bulk template by ID', { error, templateId });
      throw new DatabaseError('Failed to find bulk template');
    } finally {
      client.release();
    }
  }

  /**
   * Find bulk templates by user
   */
  async findBulkTemplatesByUser(userId: string): Promise<BulkQRTemplate[]> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Finding bulk templates by user', { userId });

      const query = `
        SELECT * FROM qr_bulk_templates 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [userId]);

      return result.rows.map(row => this.mapTemplateFromDb(row));

    } catch (error) {
      this.logger.error('Failed to find bulk templates by user', { error, userId });
      throw new DatabaseError('Failed to find bulk templates');
    } finally {
      client.release();
    }
  }

  /**
   * Find system bulk templates
   */
  async findSystemBulkTemplates(): Promise<BulkQRTemplate[]> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Finding system bulk templates');

      const query = `
        SELECT * FROM qr_bulk_templates 
        WHERE is_system_template = true AND is_active = true
        ORDER BY name ASC
      `;
      const result = await client.query(query);

      return result.rows.map(row => this.mapTemplateFromDb(row));

    } catch (error) {
      this.logger.error('Failed to find system bulk templates', { error });
      throw new DatabaseError('Failed to find system bulk templates');
    } finally {
      client.release();
    }
  }

  /**
   * Update bulk template
   */
  async updateBulkTemplate(templateId: string, templateData: any): Promise<BulkQRTemplate> {
    const client = await this.database.connect();
    try {
      this.logger.info('Updating bulk template', { templateId, templateData });

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (templateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(templateData.name);
      }
      if (templateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(templateData.description);
      }
      if (templateData.fieldMappings !== undefined) {
        updateFields.push(`field_mappings = $${paramCount++}`);
        values.push(JSON.stringify(templateData.fieldMappings));
      }
      if (templateData.defaultValues !== undefined) {
        updateFields.push(`default_values = $${paramCount++}`);
        values.push(JSON.stringify(templateData.defaultValues));
      }
      if (templateData.validationRules !== undefined) {
        updateFields.push(`validation_rules = $${paramCount++}`);
        values.push(JSON.stringify(templateData.validationRules));
      }
      if (templateData.qrSettings !== undefined) {
        updateFields.push(`qr_settings = $${paramCount++}`);
        values.push(JSON.stringify(templateData.qrSettings));
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(templateId);

      const query = `
        UPDATE qr_bulk_templates 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Bulk template');
      }

      const template = this.mapTemplateFromDb(result.rows[0]);
      this.logger.info('Bulk template updated successfully', { templateId });
      return template;

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to update bulk template', { error, templateId });
      throw new DatabaseError('Failed to update bulk template');
    } finally {
      client.release();
    }
  }

  /**
   * Delete bulk template (soft delete)
   */
  async deleteBulkTemplate(templateId: string): Promise<boolean> {
    const client = await this.database.connect();
    try {
      this.logger.info('Deleting bulk template', { templateId });

      const query = `
        UPDATE qr_bulk_templates 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_system_template = false
      `;
      const result = await client.query(query, [templateId]);

      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        this.logger.info('Bulk template deleted successfully', { templateId });
      }
      return deleted;

    } catch (error) {
      this.logger.error('Failed to delete bulk template', { error, templateId });
      throw new DatabaseError('Failed to delete bulk template');
    } finally {
      client.release();
    }
  }

  /**
   * Increment template usage count
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    const client = await this.database.connect();
    try {
      const query = `
        UPDATE qr_bulk_templates 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await client.query(query, [templateId]);

    } catch (error) {
      this.logger.error('Failed to increment template usage', { error, templateId });
      // Don't throw - this is not critical
    } finally {
      client.release();
    }
  }

  // ===============================================
  // BULK BATCHES OPERATIONS
  // ===============================================

  /**
   * Create a new bulk batch
   */
  async createBulkBatch(batchData: any): Promise<BulkQRBatch> {
    const client = await this.database.connect();
    try {
      this.logger.info('Creating bulk batch', { batchData });

      const query = `
        INSERT INTO qr_bulk_batches (
          user_id, batch_name, description, template_id, category_id,
          total_count, input_file_id, input_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        batchData.userId,
        batchData.batchName,
        batchData.description || null,
        batchData.templateId || null,
        batchData.categoryId || null,
        batchData.totalCount || 0,
        batchData.inputFileId || null,
        JSON.stringify(batchData.inputData || []),
        batchData.status || 'pending'
      ];

      const result = await client.query(query, values);
      const batch = this.mapBatchFromDb(result.rows[0]);
      
      this.logger.info('Bulk batch created successfully', { batchId: batch.id });
      return batch;

    } catch (error) {
      this.logger.error('Failed to create bulk batch', { error, batchData });
      throw new DatabaseError('Failed to create bulk batch');
    } finally {
      client.release();
    }
  }

  /**
   * Find bulk batch by ID
   */
  async findBulkBatchById(batchId: string): Promise<BulkQRBatch | null> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Finding bulk batch by ID', { batchId });

      const query = 'SELECT * FROM qr_bulk_batches WHERE id = $1';
      const result = await client.query(query, [batchId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapBatchFromDb(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find bulk batch by ID', { error, batchId });
      throw new DatabaseError('Failed to find bulk batch');
    } finally {
      client.release();
    }
  }

  /**
   * Find bulk batches by user
   */
  async findBulkBatchesByUser(userId: string, options: BulkBatchQueryOptions = {}): Promise<BulkQRBatch[]> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Finding bulk batches by user', { userId, options });

      let query = 'SELECT * FROM qr_bulk_batches WHERE user_id = $1';
      const values = [userId];
      let paramCount = 2;

      // Add status filter
      if (options.status) {
        query += ` AND status = $${paramCount}`;
        values.push(options.status);
        paramCount++;
      }

      // Add sorting
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit.toString());
        paramCount++;
      }
      if (options.offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(options.offset.toString());
      }

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapBatchFromDb(row));

    } catch (error) {
      this.logger.error('Failed to find bulk batches by user', { error, userId, options });
      throw new DatabaseError('Failed to find bulk batches');
    } finally {
      client.release();
    }
  }

  /**
   * Update bulk batch
   */
  async updateBulkBatch(batchId: string, batchData: any): Promise<BulkQRBatch> {
    const client = await this.database.connect();
    try {
      this.logger.info('Updating bulk batch', { batchId, batchData });

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (batchData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(batchData.status);
      }
      if (batchData.totalCount !== undefined) {
        updateFields.push(`total_count = $${paramCount++}`);
        values.push(batchData.totalCount);
      }
      if (batchData.processedCount !== undefined) {
        updateFields.push(`processed_count = $${paramCount++}`);
        values.push(batchData.processedCount);
      }
      if (batchData.successCount !== undefined) {
        updateFields.push(`success_count = $${paramCount++}`);
        values.push(batchData.successCount);
      }
      if (batchData.failedCount !== undefined) {
        updateFields.push(`failed_count = $${paramCount++}`);
        values.push(batchData.failedCount);
      }
      if (batchData.progressPercentage !== undefined) {
        updateFields.push(`progress_percentage = $${paramCount++}`);
        values.push(batchData.progressPercentage);
      }
      if (batchData.processingStartedAt !== undefined) {
        updateFields.push(`processing_started_at = $${paramCount++}`);
        values.push(batchData.processingStartedAt);
      }
      if (batchData.processingCompletedAt !== undefined) {
        updateFields.push(`processing_completed_at = $${paramCount++}`);
        values.push(batchData.processingCompletedAt);
      }
      if (batchData.errorLog !== undefined) {
        updateFields.push(`error_log = $${paramCount++}`);
        values.push(JSON.stringify(batchData.errorLog));
      }
      if (batchData.estimatedCompletionTime !== undefined) {
        updateFields.push(`estimated_completion_time = $${paramCount++}`);
        values.push(batchData.estimatedCompletionTime);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(batchId);

      const query = `
        UPDATE qr_bulk_batches 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Bulk batch');
      }

      const batch = this.mapBatchFromDb(result.rows[0]);
      this.logger.info('Bulk batch updated successfully', { batchId });
      return batch;

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to update bulk batch', { error, batchId });
      throw new DatabaseError('Failed to update bulk batch');
    } finally {
      client.release();
    }
  }

  /**
   * Delete bulk batch
   */
  async deleteBulkBatch(batchId: string): Promise<boolean> {
    const client = await this.database.connect();
    try {
      this.logger.info('Deleting bulk batch', { batchId });

      await client.query('BEGIN');

      // Delete bulk items first (due to foreign key constraint)
      await client.query('DELETE FROM qr_bulk_items WHERE batch_id = $1', [batchId]);

      // Delete the batch
      const result = await client.query('DELETE FROM qr_bulk_batches WHERE id = $1', [batchId]);

      await client.query('COMMIT');

      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        this.logger.info('Bulk batch deleted successfully', { batchId });
      }
      return deleted;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to delete bulk batch', { error, batchId });
      throw new DatabaseError('Failed to delete bulk batch');
    } finally {
      client.release();
    }
  }

  // ===============================================
  // BULK ITEMS OPERATIONS
  // ===============================================

  /**
   * Create bulk items
   */
  async createBulkItems(items: any[]): Promise<BulkQRItem[]> {
    const client = await this.database.connect();
    try {
      this.logger.info('Creating bulk items', { count: items.length });

      const query = `
        INSERT INTO qr_bulk_items (
          batch_id, row_number, input_data, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const results: BulkQRItem[] = [];
      
      await client.query('BEGIN');

      for (const item of items) {
        const values = [
          item.batchId,
          item.rowNumber,
          JSON.stringify(item.inputData),
          item.status || 'pending'
        ];

        const result = await client.query(query, values);
        results.push(this.mapItemFromDb(result.rows[0]));
      }

      await client.query('COMMIT');
      
      this.logger.info('Bulk items created successfully', { count: results.length });
      return results;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create bulk items', { error, count: items.length });
      throw new DatabaseError('Failed to create bulk items');
    } finally {
      client.release();
    }
  }

  /**
   * Find bulk items by batch
   */
  async findBulkItemsByBatch(batchId: string): Promise<BulkQRItem[]> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Finding bulk items by batch', { batchId });

      const query = `
        SELECT * FROM qr_bulk_items 
        WHERE batch_id = $1 
        ORDER BY row_number ASC
      `;
      const result = await client.query(query, [batchId]);

      return result.rows.map(row => this.mapItemFromDb(row));

    } catch (error) {
      this.logger.error('Failed to find bulk items by batch', { error, batchId });
      throw new DatabaseError('Failed to find bulk items');
    } finally {
      client.release();
    }
  }

  /**
   * Update bulk item
   */
  async updateBulkItem(itemId: string, itemData: any): Promise<BulkQRItem> {
    const client = await this.database.connect();
    try {
      this.logger.debug('Updating bulk item', { itemId, itemData });

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (itemData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(itemData.status);
      }
      if (itemData.qrCodeId !== undefined) {
        updateFields.push(`qr_code_id = $${paramCount++}`);
        values.push(itemData.qrCodeId);
      }
      if (itemData.errorMessage !== undefined) {
        updateFields.push(`error_message = $${paramCount++}`);
        values.push(itemData.errorMessage);
      }
      if (itemData.errorDetails !== undefined) {
        updateFields.push(`error_details = $${paramCount++}`);
        values.push(JSON.stringify(itemData.errorDetails));
      }
      if (itemData.processedAt !== undefined) {
        updateFields.push(`processed_at = $${paramCount++}`);
        values.push(itemData.processedAt || 'CURRENT_TIMESTAMP');
      }

      values.push(itemId);

      const query = `
        UPDATE qr_bulk_items 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Bulk item');
      }

      return this.mapItemFromDb(result.rows[0]);

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to update bulk item', { error, itemId });
      throw new DatabaseError('Failed to update bulk item');
    } finally {
      client.release();
    }
  }

  /**
   * Update bulk items status in batch
   */
  async updateBulkItemsStatus(batchId: string, status: BulkItemStatus, itemIds?: string[]): Promise<number> {
    const client = await this.database.connect();
    try {
      let query = `
        UPDATE qr_bulk_items 
        SET status = $1, processed_at = CURRENT_TIMESTAMP
        WHERE batch_id = $2
      `;
      const values = [status, batchId];

      if (itemIds && itemIds.length > 0) {
        query += ` AND id = ANY($3)`;
        values.push(JSON.stringify(itemIds));
      }

      const result = await client.query(query, values);
      return result.rowCount ?? 0;

    } catch (error) {
      this.logger.error('Failed to update bulk items status', { error, batchId, status });
      throw new DatabaseError('Failed to update bulk items status');
    } finally {
      client.release();
    }
  }

  /**
   * Get bulk items statistics
   */
  async getBulkItemsStats(batchId: string): Promise<BulkItemStats> {
    const client = await this.database.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'success') as success,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'skipped') as skipped
        FROM qr_bulk_items 
        WHERE batch_id = $1
      `;
      
      const result = await client.query(query, [batchId]);
      const row = result.rows[0];

      return {
        total: parseInt(row.total),
        pending: parseInt(row.pending),
        processing: parseInt(row.processing),
        success: parseInt(row.success),
        failed: parseInt(row.failed),
        skipped: parseInt(row.skipped)
      };

    } catch (error) {
      this.logger.error('Failed to get bulk items stats', { error, batchId });
      throw new DatabaseError('Failed to get bulk items stats');
    } finally {
      client.release();
    }
  }

  // ===============================================
  // STATISTICS
  // ===============================================

  /**
   * Get bulk statistics for user
   */
  async getBulkStats(userId: string, days: number): Promise<BulkStats> {
    const client = await this.database.connect();
    try {
      const query = `SELECT * FROM get_batch_stats($1, $2)`;
      const result = await client.query(query, [userId, days]);
      
      if (result.rows.length === 0) {
        return {
          totalBatches: 0,
          completedBatches: 0,
          processingBatches: 0,
          failedBatches: 0,
          totalQRCodes: 0,
          avgBatchSize: 0,
          successRate: 0
        };
      }

      const row = result.rows[0];
      return {
        totalBatches: parseInt(row.total_batches),
        completedBatches: parseInt(row.completed_batches),
        processingBatches: parseInt(row.processing_batches),
        failedBatches: parseInt(row.failed_batches),
        totalQRCodes: parseInt(row.total_qr_codes),
        avgBatchSize: parseFloat(row.avg_batch_size),
        successRate: parseFloat(row.success_rate)
      };

    } catch (error) {
      this.logger.error('Failed to get bulk stats', { error, userId, days });
      throw new DatabaseError('Failed to get bulk stats');
    } finally {
      client.release();
    }
  }

  // ===============================================
  // PRIVATE HELPER METHODS
  // ===============================================

  private mapTemplateFromDb(row: any): BulkQRTemplate {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      fieldMappings: row.field_mappings,
      defaultValues: row.default_values,
      validationRules: row.validation_rules,
      qrSettings: row.qr_settings,
      isSystemTemplate: row.is_system_template,
      isActive: row.is_active,
      usageCount: row.usage_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  private mapBatchFromDb(row: any): BulkQRBatch {
    return {
      id: row.id,
      userId: row.user_id,
      batchName: row.batch_name,
      description: row.description,
      templateId: row.template_id,
      categoryId: row.category_id,
      totalCount: row.total_count,
      processedCount: row.processed_count,
      successCount: row.success_count,
      failedCount: row.failed_count,
      status: row.status,
      processingStartedAt: row.processing_started_at?.toISOString(),
      processingCompletedAt: row.processing_completed_at?.toISOString(),
      inputFileId: row.input_file_id,
      inputData: row.input_data,
      errorLog: row.error_log,
      progressPercentage: row.progress_percentage,
      estimatedCompletionTime: row.estimated_completion_time?.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  private mapItemFromDb(row: any): BulkQRItem {
    return {
      id: row.id,
      batchId: row.batch_id,
      qrCodeId: row.qr_code_id,
      rowNumber: row.row_number,
      inputData: row.input_data,
      status: row.status,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      processedAt: row.processed_at?.toISOString(),
      createdAt: row.created_at.toISOString()
    };
  }
}