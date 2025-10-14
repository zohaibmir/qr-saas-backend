import { 
  IBulkQRService,
  IBulkQRRepository,
  IQRService,
  ICsvProcessor,
  ILogger,
  BulkQRTemplate,
  BulkQRBatch,
  BulkQRItem,
  BulkStats,
  BulkBatchProgress,
  BulkProcessingResult,
  ParsedBulkData,
  BulkValidationResult,
  CreateBulkTemplateRequest,
  CreateBulkBatchRequest,
  BulkBatchQueryOptions,
  ServiceResponse,
  CreateQRRequest,
  ValidationError,
  NotFoundError,
  BusinessLogicError,
  BulkBatchStatus,
  BulkItemStatus
} from '../interfaces';

/**
 * Bulk QR Service - Business Logic Layer
 * 
 * Handles all bulk QR generation operations with business rules
 * Follows clean architecture and SOLID principles
 */
export class BulkQRService implements IBulkQRService {
  constructor(
    private readonly bulkRepository: IBulkQRRepository,
    private readonly qrService: IQRService,
    private readonly csvProcessor: ICsvProcessor,
    private readonly logger: ILogger
  ) {}

  // ===============================================
  // BULK TEMPLATES OPERATIONS
  // ===============================================

  /**
   * Get all bulk templates (system + user templates)
   */
  async getBulkTemplates(userId?: string): Promise<ServiceResponse<BulkQRTemplate[]>> {
    try {
      this.logger.info('Fetching bulk templates', { userId });

      // Get system templates
      const systemTemplates = await this.bulkRepository.findSystemBulkTemplates();
      
      // Get user templates if userId provided
      let userTemplates: BulkQRTemplate[] = [];
      if (userId) {
        userTemplates = await this.bulkRepository.findBulkTemplatesByUser(userId);
      }

      // Combine and sort templates
      const allTemplates = [...systemTemplates, ...userTemplates];
      allTemplates.sort((a, b) => {
        // System templates first, then by usage count (most used first)
        if (a.isSystemTemplate && !b.isSystemTemplate) return -1;
        if (!a.isSystemTemplate && b.isSystemTemplate) return 1;
        return b.usageCount - a.usageCount;
      });

      return {
        success: true,
        data: allTemplates,
        metadata: {
          timestamp: new Date().toISOString(),
          total: allTemplates.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch bulk templates', { error, userId });
      return {
        success: false,
        error: {
          code: 'FETCH_TEMPLATES_FAILED',
          message: 'Failed to fetch bulk templates',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get bulk template by ID
   */
  async getBulkTemplateById(templateId: string): Promise<ServiceResponse<BulkQRTemplate>> {
    try {
      this.logger.info('Fetching bulk template by ID', { templateId });

      const template = await this.bulkRepository.findBulkTemplateById(templateId);
      if (!template) {
        throw new NotFoundError('Bulk template');
      }

      return {
        success: true,
        data: template,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch bulk template', { error, templateId });
      
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_FETCH_BULK_TEMPLATE',
          message: 'Failed to fetch bulk template',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Create a new bulk template
   */
  async createBulkTemplate(userId: string, templateData: CreateBulkTemplateRequest): Promise<ServiceResponse<BulkQRTemplate>> {
    try {
      this.logger.info('Creating bulk template', { userId, templateData });

      // Validate template data
      this.validateTemplateData(templateData);

      const template = await this.bulkRepository.createBulkTemplate({
        userId,
        ...templateData,
        isSystemTemplate: false
      });

      return {
        success: true,
        data: template,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to create bulk template', { error, userId, templateData });
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_CREATE_BULK_TEMPLATE',
          message: 'Failed to create bulk template',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Update bulk template
   */
  async updateBulkTemplate(templateId: string, templateData: Partial<CreateBulkTemplateRequest>): Promise<ServiceResponse<BulkQRTemplate>> {
    try {
      this.logger.info('Updating bulk template', { templateId, templateData });

      // Check if template exists and is not a system template
      const existingTemplate = await this.bulkRepository.findBulkTemplateById(templateId);
      if (!existingTemplate) {
        throw new NotFoundError('Bulk template');
      }

      if (existingTemplate.isSystemTemplate) {
        throw new BusinessLogicError('Cannot modify system templates');
      }

      // Validate template data if provided
      if (Object.keys(templateData).length > 0) {
        this.validatePartialTemplateData(templateData);
      }

      const template = await this.bulkRepository.updateBulkTemplate(templateId, templateData);

      return {
        success: true,
        data: template,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to update bulk template', { error, templateId });
      
      if (error instanceof NotFoundError || error instanceof BusinessLogicError || error instanceof ValidationError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_UPDATE_BULK_TEMPLATE',
          message: 'Failed to update bulk template',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Delete bulk template
   */
  async deleteBulkTemplate(templateId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.logger.info('Deleting bulk template', { templateId });

      const deleted = await this.bulkRepository.deleteBulkTemplate(templateId);
      
      return {
        success: true,
        data: deleted,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to delete bulk template', { error, templateId });
      return {
        success: false,
        error: {
          code: 'FAILED_TO_DELETE_BULK_TEMPLATE',
          message: 'Failed to delete bulk template',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // BULK BATCH OPERATIONS
  // ===============================================

  /**
   * Create a new bulk batch
   */
  async createBulkBatch(userId: string, batchData: CreateBulkBatchRequest): Promise<ServiceResponse<BulkQRBatch>> {
    try {
      this.logger.info('Creating bulk batch', { userId, batchName: batchData.batchName });

      // Validate batch data
      this.validateBatchData(batchData);

      // Process and validate input data
      let processedData = batchData.inputData;
      if (batchData.templateId) {
        const template = await this.bulkRepository.findBulkTemplateById(batchData.templateId);
        if (template) {
          // Apply field mappings and defaults
          processedData = this.csvProcessor.mapFields(processedData, template.fieldMappings);
          processedData = this.csvProcessor.applyDefaults(processedData, template.defaultValues);
          
          // Increment template usage
          await this.bulkRepository.incrementTemplateUsage(batchData.templateId);
        }
      }

      // Create the batch
      const batch = await this.bulkRepository.createBulkBatch({
        userId,
        batchName: batchData.batchName,
        description: batchData.description,
        templateId: batchData.templateId,
        categoryId: batchData.categoryId,
        totalCount: processedData.length,
        inputData: processedData,
        inputFileId: batchData.inputFileId,
        status: 'pending' as BulkBatchStatus
      });

      // Create individual batch items
      const items = processedData.map((data, index) => ({
        batchId: batch.id,
        rowNumber: index + 1,
        inputData: data,
        status: 'pending' as BulkItemStatus
      }));

      await this.bulkRepository.createBulkItems(items);

      // Start processing if requested
      if (batchData.processImmediately) {
        // Process in background (don't await)
        this.processBulkBatch(batch.id).catch(error => {
          this.logger.error('Background batch processing failed', { batchId: batch.id, error });
        });
      }

      return {
        success: true,
        data: batch,
        metadata: {
          timestamp: new Date().toISOString(),
          total: items.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to create bulk batch', { error, userId, batchData });
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_CREATE_BULK_BATCH',
          message: 'Failed to create bulk batch',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get bulk batch by ID
   */
  async getBulkBatch(batchId: string, userId: string): Promise<ServiceResponse<BulkQRBatch>> {
    try {
      this.logger.info('Fetching bulk batch', { batchId, userId });

      const batch = await this.bulkRepository.findBulkBatchById(batchId);
      if (!batch) {
        throw new NotFoundError('Bulk batch');
      }

      // Verify ownership
      if (batch.userId !== userId) {
        throw new BusinessLogicError('Access denied');
      }

      return {
        success: true,
        data: batch,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch bulk batch', { error, batchId, userId });
      
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_FETCH_BULK_BATCH',
          message: 'Failed to fetch bulk batch',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get user's bulk batches
   */
  async getUserBulkBatches(userId: string, options: BulkBatchQueryOptions = {}): Promise<ServiceResponse<BulkQRBatch[]>> {
    try {
      this.logger.info('Fetching user bulk batches', { userId, options });

      const batches = await this.bulkRepository.findBulkBatchesByUser(userId, options);

      return {
        success: true,
        data: batches,
        metadata: {
          timestamp: new Date().toISOString(),
          total: batches.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch user bulk batches', { error, userId, options });
      return {
        success: false,
        error: {
          code: 'FAILED_TO_FETCH_BULK_BATCHES',
          message: 'Failed to fetch bulk batches',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Process bulk batch (create QR codes)
   */
  async processBulkBatch(batchId: string): Promise<ServiceResponse<BulkProcessingResult>> {
    try {
      this.logger.info('Processing bulk batch', { batchId });

      const batch = await this.bulkRepository.findBulkBatchById(batchId);
      if (!batch) {
        throw new NotFoundError('Bulk batch');
      }

      if (batch.status !== 'pending') {
        throw new BusinessLogicError(`Cannot process batch with status: ${batch.status}`);
      }

      // Update batch status to processing
      await this.bulkRepository.updateBulkBatch(batchId, {
        status: 'processing' as BulkBatchStatus,
        processingStartedAt: new Date().toISOString()
      });

      // Get batch items
      const items = await this.bulkRepository.findBulkItemsByBatch(batchId);
      const errors = [];
      let successfullyCreated = 0;
      let failed = 0;

      // Process each item
      for (const item of items) {
        try {
          // Update item status to processing
          await this.bulkRepository.updateBulkItem(item.id, {
            status: 'processing' as BulkItemStatus
          });

          // Create QR code request from item data
          const qrRequest = this.buildQRRequest(item.inputData, batch);
          
          // Create QR code
          const qrResult = await this.qrService.createQR(batch.userId, qrRequest);
          
          if (qrResult.success && qrResult.data) {
            // Update item with success
            await this.bulkRepository.updateBulkItem(item.id, {
              status: 'success' as BulkItemStatus,
              qrCodeId: qrResult.data.id,
              processedAt: new Date().toISOString()
            });
            successfullyCreated++;
          } else {
            // Update item with failure
            await this.bulkRepository.updateBulkItem(item.id, {
              status: 'failed' as BulkItemStatus,
              errorMessage: typeof qrResult.error === 'object' ? qrResult.error.message : (qrResult.error || 'QR creation failed'),
              processedAt: new Date().toISOString()
            });
            failed++;
            errors.push({
              row: item.rowNumber,
              message: typeof qrResult.error === 'object' ? qrResult.error.message : (qrResult.error || 'QR creation failed'),
              value: item.inputData
            });
          }

        } catch (itemError) {
          this.logger.error('Failed to process bulk item', { itemId: item.id, error: itemError });
          
          // Update item with failure
          await this.bulkRepository.updateBulkItem(item.id, {
            status: 'failed' as BulkItemStatus,
            errorMessage: 'Processing error',
            errorDetails: { error: itemError instanceof Error ? itemError.message : 'Unknown error' },
            processedAt: new Date().toISOString()
          });
          failed++;
          errors.push({
            row: item.rowNumber,
            message: 'Processing error',
            value: item.inputData
          });
        }

        // Update batch progress periodically
        if ((successfullyCreated + failed) % 10 === 0) {
          await this.updateBatchProgress(batchId);
        }
      }

      // Final batch update
      const finalStatus: BulkBatchStatus = failed === 0 ? 'completed' : 'completed';
      await this.bulkRepository.updateBulkBatch(batchId, {
        status: finalStatus,
        processedCount: successfullyCreated + failed,
        successCount: successfullyCreated,
        failedCount: failed,
        progressPercentage: 100,
        processingCompletedAt: new Date().toISOString(),
        errorLog: errors.length > 0 ? errors : null
      });

      const result: BulkProcessingResult = {
        batchId,
        success: true,
        totalProcessed: successfullyCreated + failed,
        successfullyCreated,
        failed,
        errors
      };

      this.logger.info('Bulk batch processing completed', result);
      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to process bulk batch', { error, batchId });
      
      // Update batch status to failed
      try {
        await this.bulkRepository.updateBulkBatch(batchId, {
          status: 'failed' as BulkBatchStatus,
          errorLog: { error: error instanceof Error ? error.message : 'Unknown error' },
          processingCompletedAt: new Date().toISOString()
        });
      } catch (updateError) {
        this.logger.error('Failed to update batch status after error', { updateError, batchId });
      }

      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_PROCESS_BULK_BATCH',
          message: 'Failed to process bulk batch',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Cancel bulk batch processing
   */
  async cancelBulkBatch(batchId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.logger.info('Cancelling bulk batch', { batchId, userId });

      const batch = await this.bulkRepository.findBulkBatchById(batchId);
      if (!batch) {
        throw new NotFoundError('Bulk batch');
      }

      if (batch.userId !== userId) {
        throw new BusinessLogicError('Access denied');
      }

      if (batch.status !== 'pending' && batch.status !== 'processing') {
        throw new BusinessLogicError(`Cannot cancel batch with status: ${batch.status}`);
      }

      // Update batch and items status
      await this.bulkRepository.updateBulkBatch(batchId, {
        status: 'cancelled' as BulkBatchStatus,
        processingCompletedAt: new Date().toISOString()
      });

      await this.bulkRepository.updateBulkItemsStatus(batchId, 'skipped' as BulkItemStatus);

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to cancel bulk batch', { error, batchId, userId });
      
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_CANCEL_BULK_BATCH',
          message: 'Failed to cancel bulk batch',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Delete bulk batch
   */
  async deleteBulkBatch(batchId: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      this.logger.info('Deleting bulk batch', { batchId, userId });

      const batch = await this.bulkRepository.findBulkBatchById(batchId);
      if (!batch) {
        throw new NotFoundError('Bulk batch');
      }

      if (batch.userId !== userId) {
        throw new BusinessLogicError('Access denied');
      }

      if (batch.status === 'processing') {
        throw new BusinessLogicError('Cannot delete batch while processing');
      }

      const deleted = await this.bulkRepository.deleteBulkBatch(batchId);

      return {
        success: true,
        data: deleted,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to delete bulk batch', { error, batchId, userId });
      
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_DELETE_BULK_BATCH',
          message: 'Failed to delete bulk batch',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // BULK PROCESSING OPERATIONS
  // ===============================================

  /**
   * Process CSV data and return parsed result
   */
  async processCsvData(csvData: string, templateId?: string): Promise<ServiceResponse<ParsedBulkData>> {
    try {
      this.logger.info('Processing CSV data', { templateId, size: csvData.length });

      // Parse CSV data
      const parsedData = await this.csvProcessor.parse(csvData);
      
      // Get template if provided
      let template: BulkQRTemplate | undefined;
      if (templateId) {
        const foundTemplate = await this.bulkRepository.findBulkTemplateById(templateId);
        template = foundTemplate || undefined;
      }

      // Validate data
      const validation = await this.csvProcessor.validate(parsedData, template);

      const result: ParsedBulkData = {
        totalRows: parsedData.length,
        validRows: validation.validItems,
        invalidRows: validation.invalidItems,
        data: parsedData,
        errors: validation.errors
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to process CSV data', { error, templateId });
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_PROCESS_CSV_DATA',
          message: 'Failed to process CSV data',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Validate bulk data against template rules
   */
  async validateBulkData(data: any[], templateId?: string): Promise<ServiceResponse<BulkValidationResult>> {
    try {
      this.logger.info('Validating bulk data', { templateId, rows: data.length });

      let template: BulkQRTemplate | undefined;
      if (templateId) {
        const foundTemplate = await this.bulkRepository.findBulkTemplateById(templateId);
        template = foundTemplate || undefined;
      }

      const validation = await this.csvProcessor.validate(data, template);

      return {
        success: true,
        data: validation,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to validate bulk data', { error, templateId });
      return {
        success: false,
        error: {
          code: 'FAILED_TO_VALIDATE_BULK_DATA',
          message: 'Failed to validate bulk data',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get bulk batch processing progress
   */
  async getBulkBatchProgress(batchId: string): Promise<ServiceResponse<BulkBatchProgress>> {
    try {
      this.logger.debug('Getting bulk batch progress', { batchId });

      const batch = await this.bulkRepository.findBulkBatchById(batchId);
      if (!batch) {
        throw new NotFoundError('Bulk batch');
      }

      const progress: BulkBatchProgress = {
        batchId: batch.id,
        status: batch.status,
        totalCount: batch.totalCount,
        processedCount: batch.processedCount,
        successCount: batch.successCount,
        failedCount: batch.failedCount,
        progressPercentage: batch.progressPercentage,
        estimatedCompletionTime: batch.estimatedCompletionTime,
        errorLog: batch.errorLog
      };

      return {
        success: true,
        data: progress,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to get bulk batch progress', { error, batchId });
      
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_GET_BATCH_PROGRESS',
          message: 'Failed to get batch progress',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // STATISTICS
  // ===============================================

  /**
   * Get bulk generation statistics
   */
  async getBulkStats(userId: string, days: number = 30): Promise<ServiceResponse<BulkStats>> {
    try {
      this.logger.info('Getting bulk stats', { userId, days });

      const stats = await this.bulkRepository.getBulkStats(userId, days);

      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to get bulk stats', { error, userId, days });
      return {
        success: false,
        error: {
          code: 'FAILED_TO_GET_BULK_STATISTICS',
          message: 'Failed to get bulk statistics',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // PRIVATE HELPER METHODS
  // ===============================================

  /**
   * Validate template data
   */
  private validateTemplateData(templateData: CreateBulkTemplateRequest): void {
    if (!templateData.name || templateData.name.trim() === '') {
      throw new ValidationError('Template name is required');
    }

    if (!templateData.templateType) {
      throw new ValidationError('Template type is required');
    }

    if (!templateData.fieldMappings || Object.keys(templateData.fieldMappings).length === 0) {
      throw new ValidationError('Field mappings are required');
    }
  }

  /**
   * Validate partial template data for updates
   */
  private validatePartialTemplateData(templateData: Partial<CreateBulkTemplateRequest>): void {
    if (templateData.name !== undefined && templateData.name.trim() === '') {
      throw new ValidationError('Template name cannot be empty');
    }

    if (templateData.fieldMappings !== undefined && Object.keys(templateData.fieldMappings).length === 0) {
      throw new ValidationError('Field mappings cannot be empty');
    }
  }

  /**
   * Validate batch data
   */
  private validateBatchData(batchData: CreateBulkBatchRequest): void {
    if (!batchData.batchName || batchData.batchName.trim() === '') {
      throw new ValidationError('Batch name is required');
    }

    if (!batchData.inputData || batchData.inputData.length === 0) {
      throw new ValidationError('Input data is required');
    }

    if (batchData.inputData.length > 10000) {
      throw new ValidationError('Maximum 10,000 QR codes allowed per batch');
    }
  }

  /**
   * Build QR code request from item data
   */
  private buildQRRequest(itemData: any, batch: BulkQRBatch): CreateQRRequest {
    // Extract basic QR properties
    const request: CreateQRRequest = {
      title: itemData.name || `Bulk QR ${itemData._rowNumber}`,
      type: itemData.type || 'url',
      data: this.buildQRContent(itemData),
      description: itemData.description,
      customization: itemData.designConfig || {
        size: 200,
        color: {
          foreground: '#000000',
          background: '#ffffff'
        }
      }
    };

    // Add validity configuration
    if (itemData.expiresAt || itemData.maxScans) {
      request.validityConfig = {};
      
      if (itemData.expiresAt) {
        request.validityConfig.expiresAt = new Date(itemData.expiresAt);
      }

      if (itemData.maxScans) {
        request.validityConfig.maxScans = parseInt(itemData.maxScans);
      }
    }

    return request;
  }

  /**
   * Build QR content based on type and data
   */
  private buildQRContent(itemData: any): any {
    const type = itemData.type || 'url';

    switch (type) {
      case 'url':
        return {
          url: itemData.url || itemData.target_url || itemData.link
        };

      case 'vcard':
        return {
          firstName: itemData.firstName || itemData.first_name,
          lastName: itemData.lastName || itemData.last_name,
          email: itemData.email,
          phone: itemData.phone,
          company: itemData.company,
          title: itemData.title,
          url: itemData.website || itemData.url
        };

      case 'wifi':
        return {
          ssid: itemData.ssid || itemData.wifi_ssid,
          password: itemData.password || itemData.wifi_password,
          security: itemData.security || itemData.security_type || 'WPA'
        };

      case 'text':
        return {
          text: itemData.text || itemData.content || itemData.message
        };

      case 'email':
        return {
          email: itemData.email,
          subject: itemData.subject,
          body: itemData.body || itemData.message
        };

      case 'sms':
        return {
          phone: itemData.phone,
          message: itemData.message || itemData.text
        };

      default:
        return itemData.content || { data: itemData };
    }
  }

  /**
   * Update batch progress by recalculating from items
   */
  private async updateBatchProgress(batchId: string): Promise<void> {
    try {
      const stats = await this.bulkRepository.getBulkItemsStats(batchId);
      const progressPercentage = stats.total > 0 ? Math.round(((stats.success + stats.failed + stats.skipped) / stats.total) * 100) : 0;

      await this.bulkRepository.updateBulkBatch(batchId, {
        processedCount: stats.success + stats.failed + stats.skipped,
        successCount: stats.success,
        failedCount: stats.failed,
        progressPercentage
      });

    } catch (error) {
      this.logger.error('Failed to update batch progress', { error, batchId });
    }
  }
}