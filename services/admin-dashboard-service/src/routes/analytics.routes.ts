import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requirePermission } from '../middleware/admin-auth.middleware';

const router = express.Router();

/**
 * Analytics Overview
 * GET /api/analytics
 */
router.get('/', requirePermission('analytics.read'), asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement analytics overview via service aggregation
  res.status(200).json({
    message: 'Analytics overview - Coming soon',
    placeholder: true
  });
}));

export default router;