import { Router } from 'express';
import { policyController } from '../controllers/policy.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { standardRateLimit, strictRateLimit, executionRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting
router.use(standardRateLimit);

// Policy CRUD routes
router.post('/', 
  validateRequest,
  policyController.createPolicy.bind(policyController)
);

router.get('/', 
  validateRequest,
  policyController.getAllPolicies.bind(policyController)
);

router.get('/:id', 
  validateRequest,
  policyController.getPolicyById.bind(policyController)
);

router.put('/:id', 
  validateRequest,
  policyController.updatePolicy.bind(policyController)
);

router.delete('/:id', 
  validateRequest,
  policyController.deletePolicy.bind(policyController)
);

// Policy execution routes
router.post('/:id/execute', 
  validateRequest,
  policyController.executePolicy.bind(policyController)
);

router.get('/:id/executions', 
  validateRequest,
  policyController.getPolicyExecutions.bind(policyController)
);

router.get('/:id/stats', 
  validateRequest,
  policyController.getPolicyStats.bind(policyController)
);

export default router;