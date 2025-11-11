import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requirePermission } from '../middleware/admin-auth.middleware';

const router = express.Router();

/**
 * List Users
 * GET /api/users
 */
router.get('/', requirePermission('users.read'), asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement users listing via service aggregation
  res.status(200).json({
    message: 'Users listing - Coming soon',
    placeholder: true
  });
}));

/**
 * Get User Details
 * GET /api/users/:id
 */
router.get('/:id', requirePermission('users.read'), asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement user details via service aggregation
  res.status(200).json({
    message: 'User details - Coming soon',
    placeholder: true
  });
}));

export default router;