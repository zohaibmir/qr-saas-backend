import { Request, Response } from 'express';
import { policyService } from '../services/policy.service';
import { CreatePolicyRequest, ExecutePolicyRequest, PaginationOptions } from '../interfaces';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Validation schemas
const createPolicySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().allow('').max(1000),
  table_name: Joi.string().trim().min(1).max(100).required(),
  retention_period_days: Joi.number().integer().min(1).max(3650).required(),
  date_column: Joi.string().trim().min(1).max(100).required(),
  conditions: Joi.object().allow(null),
  archive_before_delete: Joi.boolean().default(true),
  archive_location: Joi.string().allow('').max(500),
  execution_cron: Joi.string().allow('').max(100)
});

const updatePolicySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  description: Joi.string().allow('').max(1000),
  table_name: Joi.string().trim().min(1).max(100),
  retention_period_days: Joi.number().integer().min(1).max(3650),
  date_column: Joi.string().trim().min(1).max(100),
  conditions: Joi.object().allow(null),
  archive_before_delete: Joi.boolean(),
  archive_location: Joi.string().allow('').max(500),
  enabled: Joi.boolean(),
  execution_cron: Joi.string().allow('').max(100)
});

const executePolicySchema = Joi.object({
  dry_run: Joi.boolean().default(false),
  force: Joi.boolean().default(false)
});

export class PolicyController {

  /**
   * @swagger
   * /api/v1/policies:
   *   post:
   *     summary: Create a new retention policy
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePolicyRequest'
   *     responses:
   *       201:
   *         description: Policy created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DataRetentionPolicy'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async createPolicy(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = createPolicySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          requestId: req.requestId
        });
        return;
      }

      const policyData: CreatePolicyRequest = value;
      const policy = await policyService.createPolicy(policyData);

      req.logger.info('Policy created via API', {
        policyId: policy.id,
        name: policy.name
      });

      res.status(201).json(policy);

    } catch (error) {
      req.logger.error('Failed to create policy via API:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create policy',
        requestId: req.requestId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/policies:
   *   get:
   *     summary: Get all retention policies
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *       - in: query
   *         name: sort_by
   *         schema:
   *           type: string
   *           enum: [id, name, table_name, created_at, updated_at, last_executed]
   *           default: created_at
   *       - in: query
   *         name: sort_order
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: DESC
   *     responses:
   *       200:
   *         description: List of policies with pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/DataRetentionPolicy'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async getAllPolicies(req: Request, res: Response): Promise<void> {
    try {
      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: (req.query.sort_order as string || 'DESC') as 'ASC' | 'DESC'
      };

      const result = await policyService.getAllPolicies(options);

      res.json(result);

    } catch (error) {
      req.logger.error('Failed to get policies via API:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve policies',
        requestId: req.requestId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/policies/{id}:
   *   get:
   *     summary: Get a retention policy by ID
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     responses:
   *       200:
   *         description: Policy details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DataRetentionPolicy'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async getPolicyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const policy = await policyService.getPolicyById(id);

      if (!policy) {
        res.status(404).json({
          error: 'Not Found',
          message: `Policy with id ${id} not found`,
          requestId: req.requestId
        });
        return;
      }

      res.json(policy);

    } catch (error) {
      req.logger.error('Failed to get policy by id via API:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve policy',
        requestId: req.requestId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/policies/{id}:
   *   put:
   *     summary: Update a retention policy
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               retention_period_days:
   *                 type: integer
   *                 minimum: 1
   *               enabled:
   *                 type: boolean
   *               execution_cron:
   *                 type: string
   *     responses:
   *       200:
   *         description: Policy updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DataRetentionPolicy'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async updatePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate request body
      const { error, value } = updatePolicySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          requestId: req.requestId
        });
        return;
      }

      const policy = await policyService.updatePolicy(id, value);

      req.logger.info('Policy updated via API', {
        policyId: id,
        updatedFields: Object.keys(value)
      });

      res.json(policy);

    } catch (error) {
      req.logger.error('Failed to update policy via API:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          requestId: req.requestId
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Failed to update policy',
          requestId: req.requestId
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/policies/{id}:
   *   delete:
   *     summary: Delete a retention policy
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     responses:
   *       204:
   *         description: Policy deleted successfully
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async deletePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await policyService.deletePolicy(id);

      req.logger.info('Policy deleted via API', { policyId: id });

      res.status(204).send();

    } catch (error) {
      req.logger.error('Failed to delete policy via API:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          requestId: req.requestId
        });
      } else if (error instanceof Error && error.message.includes('running executions')) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          requestId: req.requestId
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Failed to delete policy',
          requestId: req.requestId
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/policies/{id}/execute:
   *   post:
   *     summary: Execute a retention policy
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ExecutePolicyRequest'
   *     responses:
   *       202:
   *         description: Policy execution started
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RetentionExecution'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async executePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate request body
      const { error, value } = executePolicySchema.validate(req.body || {});
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          requestId: req.requestId
        });
        return;
      }

      const { dry_run = false } = value as ExecutePolicyRequest;
      const execution = await policyService.executePolicy(id, dry_run);

      req.logger.info('Policy execution triggered via API', {
        policyId: id,
        executionId: execution.id,
        dryRun: dry_run
      });

      res.status(202).json(execution);

    } catch (error) {
      req.logger.error('Failed to execute policy via API:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          requestId: req.requestId
        });
      } else if (error instanceof Error && (
        error.message.includes('disabled') || 
        error.message.includes('running execution')
      )) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          requestId: req.requestId
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Failed to execute policy',
          requestId: req.requestId
        });
      }
    }
  }

  /**
   * @swagger
   * /api/v1/policies/{id}/executions:
   *   get:
   *     summary: Get execution history for a policy
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *     responses:
   *       200:
   *         description: Execution history
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
   *                   $ref: '#/components/schemas/Pagination'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async getPolicyExecutions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100)
      };

      const result = await policyService.getExecutionHistory(id, options);

      res.json(result);

    } catch (error) {
      req.logger.error('Failed to get policy executions via API:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve execution history',
        requestId: req.requestId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/policies/{id}/stats:
   *   get:
   *     summary: Get execution statistics for a policy
   *     tags: [Policies]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     responses:
   *       200:
   *         description: Execution statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total:
   *                   type: integer
   *                 running:
   *                   type: integer
   *                 completed:
   *                   type: integer
   *                 failed:
   *                   type: integer
   *                 cancelled:
   *                   type: integer
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  async getPolicyStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await policyService.getExecutionStats(id);

      res.json(stats);

    } catch (error) {
      req.logger.error('Failed to get policy stats via API:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve policy statistics',
        requestId: req.requestId
      });
    }
  }
}

export const policyController = new PolicyController();
export default policyController;