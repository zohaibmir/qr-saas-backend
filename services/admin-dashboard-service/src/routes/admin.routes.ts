import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireSuperAdmin } from '../middleware/admin-auth.middleware';

const router = express.Router();

/**
 * List Admin Users
 * GET /api/admin/users
 */
router.get('/users', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement admin users management
  res.status(200).json({
    message: 'Admin users management - Coming soon',
    placeholder: true
  });
}));

/**
 * Admin Activity Logs
 * GET /api/admin/activity
 */
router.get('/activity', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement admin activity logs viewing
  res.status(200).json({
    message: 'Admin activity logs - Coming soon',
    placeholder: true
  });
}));

export default router;