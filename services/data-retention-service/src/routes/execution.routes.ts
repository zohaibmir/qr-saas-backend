import { Router } from 'express';
import { ExecutionController } from '../controllers/execution.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { standardRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();
const executionController = new ExecutionController();

// Apply authentication, validation, and rate limiting to all routes
router.use(authenticate);
router.use(validateRequest);
router.use(standardRateLimit);

/**
 * @swagger
 * tags:
 *   name: Executions
 *   description: Retention execution monitoring and management endpoints
 */

/**
 * GET /api/v1/executions
 * Get all retention executions with filtering and pagination
 */
router.get('/', 
  requirePermission('read:executions'),
  executionController.getAllExecutions.bind(executionController)
);

/**
 * GET /api/v1/executions/stats
 * Get execution statistics and metrics
 */
router.get('/stats', 
  requirePermission('read:executions'),
  executionController.getExecutionStats.bind(executionController)
);

/**
 * GET /api/v1/executions/:executionId
 * Get specific execution details
 */
router.get('/:executionId', 
  requirePermission('read:executions'),
  executionController.getExecution.bind(executionController)
);

/**
 * POST /api/v1/executions/:executionId/cancel
 * Cancel a running execution
 */
router.post('/:executionId/cancel', 
  requirePermission('manage:executions'),
  executionController.cancelExecution.bind(executionController)
);

export default router;