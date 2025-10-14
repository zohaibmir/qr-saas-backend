import { Router, Request, Response } from 'express';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscription_tier: string;
  };
}
import {
  IBulkQRService,
  ServiceResponse,
  BulkQRTemplate,
  BulkQRBatch,
  BulkStats,
  BulkBatchProgress,
  BulkProcessingResult,
  ParsedBulkData,
  BulkValidationResult,
  CreateBulkTemplateRequest,
  CreateBulkBatchRequest,
  BulkBatchQueryOptions,
  ValidationError,
  NotFoundError,
  BusinessLogicError
} from '../interfaces';

/**
 * Bulk QR Routes - API Endpoints
 * 
 * Handles HTTP requests for bulk QR generation operations
 * Follows REST API conventions and clean architecture
 */
export class BulkQRRoutes {
  private router: Router;

  constructor(private readonly bulkQRService: IBulkQRService) {
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    // Bulk Templates Routes
    this.router.get('/templates', this.getBulkTemplates.bind(this));
    this.router.get('/templates/:templateId', this.getBulkTemplateById.bind(this));
    this.router.post('/templates', this.createBulkTemplate.bind(this));
    this.router.put('/templates/:templateId', this.updateBulkTemplate.bind(this));
    this.router.delete('/templates/:templateId', this.deleteBulkTemplate.bind(this));

    // Bulk Batch Routes
    this.router.post('/batches', this.createBulkBatch.bind(this));
    this.router.get('/batches', this.getUserBulkBatches.bind(this));
    this.router.get('/batches/:batchId', this.getBulkBatch.bind(this));
    this.router.post('/batches/:batchId/process', this.processBulkBatch.bind(this));
    this.router.post('/batches/:batchId/cancel', this.cancelBulkBatch.bind(this));
    this.router.delete('/batches/:batchId', this.deleteBulkBatch.bind(this));
    this.router.get('/batches/:batchId/progress', this.getBulkBatchProgress.bind(this));

    // Bulk Processing Routes
    this.router.post('/process-csv', this.processCsvData.bind(this));
    this.router.post('/validate', this.validateBulkData.bind(this));

    // Statistics Routes
    this.router.get('/stats', this.getBulkStats.bind(this));
  }

  // ===============================================
  // BULK TEMPLATES ENDPOINTS
  // ===============================================

  /**
   * GET /bulk/templates
   * Get all bulk templates (system + user)
   */
  private async getBulkTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // From auth middleware
      const result = await this.bulkQRService.getBulkTemplates(userId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /bulk/templates/:templateId
   * Get bulk template by ID
   */
  private async getBulkTemplateById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const result = await this.bulkQRService.getBulkTemplateById(templateId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /bulk/templates
   * Create new bulk template
   */
  private async createBulkTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const templateData: CreateBulkTemplateRequest = req.body;
      const result = await this.bulkQRService.createBulkTemplate(userId, templateData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /bulk/templates/:templateId
   * Update bulk template
   */
  private async updateBulkTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const templateData: Partial<CreateBulkTemplateRequest> = req.body;
      const result = await this.bulkQRService.updateBulkTemplate(templateId, templateData);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /bulk/templates/:templateId
   * Delete bulk template
   */
  private async deleteBulkTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const result = await this.bulkQRService.deleteBulkTemplate(templateId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // ===============================================
  // BULK BATCH ENDPOINTS
  // ===============================================

  /**
   * POST /bulk/batches
   * Create new bulk batch
   */
  private async createBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const batchData: CreateBulkBatchRequest = req.body;
      const result = await this.bulkQRService.createBulkBatch(userId, batchData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /bulk/batches
   * Get user's bulk batches
   */
  private async getUserBulkBatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const options: BulkBatchQueryOptions = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        status: req.query.status as any,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await this.bulkQRService.getUserBulkBatches(userId, options);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /bulk/batches/:batchId
   * Get bulk batch by ID
   */
  private async getBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { batchId } = req.params;
      const result = await this.bulkQRService.getBulkBatch(batchId, userId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /bulk/batches/:batchId/process
   * Process bulk batch
   */
  private async processBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const result = await this.bulkQRService.processBulkBatch(batchId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /bulk/batches/:batchId/cancel
   * Cancel bulk batch processing
   */
  private async cancelBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { batchId } = req.params;
      const result = await this.bulkQRService.cancelBulkBatch(batchId, userId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /bulk/batches/:batchId
   * Delete bulk batch
   */
  private async deleteBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { batchId } = req.params;
      const result = await this.bulkQRService.deleteBulkBatch(batchId, userId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /bulk/batches/:batchId/progress
   * Get bulk batch progress
   */
  private async getBulkBatchProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const result = await this.bulkQRService.getBulkBatchProgress(batchId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // ===============================================
  // BULK PROCESSING ENDPOINTS
  // ===============================================

  /**
   * POST /bulk/process-csv
   * Process CSV data and return parsed result
   */
  private async processCsvData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { csvData, templateId } = req.body;
      
      if (!csvData) {
        res.status(400).json({
          success: false,
          error: 'CSV data is required'
        });
        return;
      }

      const result = await this.bulkQRService.processCsvData(csvData, templateId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /bulk/validate
   * Validate bulk data
   */
  private async validateBulkData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { data, templateId } = req.body;
      
      if (!data || !Array.isArray(data)) {
        res.status(400).json({
          success: false,
          error: 'Valid data array is required'
        });
        return;
      }

      const result = await this.bulkQRService.validateBulkData(data, templateId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // ===============================================
  // STATISTICS ENDPOINTS
  // ===============================================

  /**
   * GET /bulk/stats
   * Get bulk generation statistics
   */
  private async getBulkStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const result = await this.bulkQRService.getBulkStats(userId, days);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}