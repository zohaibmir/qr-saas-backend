import { Response, NextFunction } from 'express';
import Joi from 'joi';
import { AuthenticatedRequest } from '../interfaces';
import { RetentionExecutionRepository } from '../repositories/execution.repository';
import { PolicyService } from '../services/policy.service';
import { logger } from '../utils/logger';

/**
 * @swagger
 * components:
 *   schemas:
 *     RetentionExecution:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "exec_20241201_120000_abc123"
 *         policy_id:
 *           type: string
 *           example: "policy_user_data_retention"
 *         started_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T12:00:00Z"
 *         completed_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T12:30:00Z"
 *         status:
 *           type: string
 *           enum: [running, completed, failed, cancelled]
 *           example: "completed"
 *         records_processed:
 *           type: integer
 *           example: 1500
 *         records_archived:
 *           type: integer
 *           example: 1200
 *         records_deleted:
 *           type: integer
 *           example: 300
 *         error_message:
 *           type: string
 *           example: null
 *         execution_metadata:
 *           type: object
 *           example: {"batch_size": 1000, "archive_format": "json"}
 */

export class ExecutionController {
  private executionRepository: RetentionExecutionRepository;
  private policyService: PolicyService;

  constructor() {
    this.executionRepository = new RetentionExecutionRepository();
    this.policyService = new PolicyService();
  }

  /**
   * @swagger
   * /api/v1/executions:
   *   get:
   *     summary: Get all retention executions
   *     description: Retrieve a paginated list of all retention executions with optional filtering
   *     tags:
   *       - Executions
   *     security:
   *       - bearerAuth: []
   *       - apiKeyAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of executions per page
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [running, completed, failed, cancelled]
   *         description: Filter by execution status
   *       - in: query
   *         name: policy_id
   *         schema:
   *           type: string
   *         description: Filter by policy ID
   *       - in: query
   *         name: sort_by
   *         schema:
   *           type: string
   *           enum: [started_at, completed_at, records_processed]
   *           default: started_at
   *         description: Field to sort by
   *       - in: query
   *         name: sort_order
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: DESC
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Successful response with executions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/RetentionExecution'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationInfo'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  async getAllExecutions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        status: Joi.string().valid('running', 'completed', 'failed', 'cancelled').optional(),
        policy_id: Joi.string().optional(),
        sort_by: Joi.string().valid('started_at', 'completed_at', 'records_processed').default('started_at'),
        sort_order: Joi.string().valid('ASC', 'DESC').default('DESC')
      }).validate(req.query);

      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          requestId: req.requestId
        });
        return;
      }

      const { page, limit, status, policy_id, sort_by, sort_order } = value;
      const offset = (page - 1) * limit;

      const result = await this.executionRepository.findAll({
        status,
        policyId: policy_id,
        limit,
        sortBy: sort_by,
        sortOrder: sort_order,
        page
      });

      const total = await this.executionRepository.count({ status, policyId: policy_id });

      res.json({
        data: result.data,
        pagination: result.pagination,
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Error getting executions:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/executions/{executionId}:
   *   get:
   *     summary: Get execution by ID
   *     description: Retrieve detailed information about a specific retention execution
   *     tags:
   *       - Executions
   *     security:
   *       - bearerAuth: []
   *       - apiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: executionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique execution identifier
   *     responses:
   *       200:
   *         description: Successful response with execution details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/RetentionExecution'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  async getExecution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { executionId } = req.params;

      if (!executionId || !executionId.startsWith('exec_')) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid execution ID format',
          requestId: req.requestId
        });
        return;
      }

      const execution = await this.executionRepository.findById(executionId);

      if (!execution) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Execution not found',
          requestId: req.requestId
        });
        return;
      }

      res.json({
        data: execution,
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Error getting execution:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/executions/{executionId}/cancel:
   *   post:
   *     summary: Cancel a running execution
   *     description: Cancel a retention execution that is currently running
   *     tags:
   *       - Executions
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: executionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique execution identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 example: "User requested cancellation"
   *                 description: Reason for cancellation
   *             required:
   *               - reason
   *     responses:
   *       200:
   *         description: Execution cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/RetentionExecution'
   *                 message:
   *                   type: string
   *                   example: "Execution cancelled successfully"
   *       400:
   *         description: Execution cannot be cancelled
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  async cancelExecution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { executionId } = req.params;

      const { error, value } = Joi.object({
        reason: Joi.string().min(1).max(500).required()
      }).validate(req.body);

      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          requestId: req.requestId
        });
        return;
      }

      const { reason } = value;

      const execution = await this.executionRepository.findById(executionId);

      if (!execution) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Execution not found',
          requestId: req.requestId
        });
        return;
      }

      if (execution.status !== 'running') {
        res.status(400).json({
          error: 'Invalid Operation',
          message: `Cannot cancel execution with status: ${execution.status}`,
          requestId: req.requestId
        });
        return;
      }

      const cancelledExecution = await this.executionRepository.updateStatus(
        executionId,
        'cancelled',
        `Cancelled by user: ${reason}`
      );

      req.logger.info('Execution cancelled', {
        executionId,
        policyId: execution.policy_id,
        reason,
        userId: req.user?.id,
        requestId: req.requestId
      });

      res.json({
        data: cancelledExecution,
        message: 'Execution cancelled successfully',
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Error cancelling execution:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/executions/stats:
   *   get:
   *     summary: Get execution statistics
   *     description: Retrieve aggregated statistics about retention executions
   *     tags:
   *       - Executions
   *     security:
   *       - bearerAuth: []
   *       - apiKeyAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 365
   *           default: 30
   *         description: Number of days to include in statistics
   *       - in: query
   *         name: policy_id
   *         schema:
   *           type: string
   *         description: Filter statistics by policy ID
   *     responses:
   *       200:
   *         description: Successful response with execution statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     total_executions:
   *                       type: integer
   *                       example: 45
   *                     successful_executions:
   *                       type: integer
   *                       example: 42
   *                     failed_executions:
   *                       type: integer
   *                       example: 2
   *                     running_executions:
   *                       type: integer
   *                       example: 1
   *                     total_records_processed:
   *                       type: integer
   *                       example: 150000
   *                     total_records_archived:
   *                       type: integer
   *                       example: 120000
   *                     total_records_deleted:
   *                       type: integer
   *                       example: 30000
   *                     avg_execution_time_minutes:
   *                       type: number
   *                       example: 25.5
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  async getExecutionStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = Joi.object({
        days: Joi.number().integer().min(1).max(365).default(30),
        policy_id: Joi.string().optional()
      }).validate(req.query);

      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          requestId: req.requestId
        });
        return;
      }

      const { days, policy_id } = value;

      const stats = await this.executionRepository.getStatistics(days, policy_id);

      res.json({
        data: stats,
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Error getting execution statistics:', error);
      next(error);
    }
  }
}

export default ExecutionController;