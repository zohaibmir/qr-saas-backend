import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requirePermission, logActivity } from '../middleware/admin-auth.middleware';
import { ServiceAggregatorService } from '../services/service-aggregator.service';
import { AdminService } from '../services/admin.service';

const router = express.Router();

/**
 * List Content Posts
 * GET /api/content/posts
 */
router.get('/posts', 
  requirePermission('content.posts.read'),
  logActivity('list', 'content_posts'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, category, status } = req.query;
      
      const result = await ServiceAggregatorService.getContentPosts({
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        status: status as string
      });
      
      // Log admin activity
      if (req.admin) {
        await AdminService.logActivity(
          req.admin.id,
          'list',
          'content_posts',
          undefined,
          { filters: { page, limit, category, status } },
          req.ip,
          req.get('User-Agent'),
          result.success
        );
      }
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Content posts retrieved successfully'
        });
      } else {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error,
          message: 'Failed to retrieve content posts'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Content posts service error'
      });
    }
  })
);

/**
 * Create Content Post
 * POST /api/content/posts
 */
router.post('/posts',
  requirePermission('content.posts.create'),
  logActivity('create', 'content_posts'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await ServiceAggregatorService.createContentPost(req.body);
      
      // Log admin activity
      if (req.admin) {
        await AdminService.logActivity(
          req.admin.id,
          'create',
          'content_posts',
          result.data?.id,
          { title: req.body.title, category: req.body.category },
          req.ip,
          req.get('User-Agent'),
          result.success
        );
      }
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Content post created successfully'
        });
      } else {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error,
          message: 'Failed to create content post'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Content post creation service error'
      });
    }
  })
);

/**
 * Update Content Post
 * PUT /api/content/posts/:id
 */
router.put('/posts/:id',
  requirePermission('content.posts.update'),
  logActivity('update', 'content_posts'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await ServiceAggregatorService.updateContentPost(id, req.body);
      
      // Log admin activity
      if (req.admin) {
        await AdminService.logActivity(
          req.admin.id,
          'update',
          'content_posts',
          id,
          { title: req.body.title, changes: Object.keys(req.body) },
          req.ip,
          req.get('User-Agent'),
          result.success
        );
      }
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Content post updated successfully'
        });
      } else {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error,
          message: 'Failed to update content post'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Content post update service error'
      });
    }
  })
);

/**
 * Delete Content Post
 * DELETE /api/content/posts/:id
 */
router.delete('/posts/:id',
  requirePermission('content.posts.delete'),
  logActivity('delete', 'content_posts'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await ServiceAggregatorService.deleteContentPost(id);
      
      // Log admin activity
      if (req.admin) {
        await AdminService.logActivity(
          req.admin.id,
          'delete',
          'content_posts',
          id,
          undefined,
          req.ip,
          req.get('User-Agent'),
          result.success
        );
      }
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Content post deleted successfully'
        });
      } else {
        res.status(result.statusCode || 400).json({
          success: false,
          error: result.error,
          message: 'Failed to delete content post'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Content post deletion service error'
      });
    }
  })
);

/**
 * Get Content Categories
 * GET /api/content/categories
 */
router.get('/categories',
  requirePermission('content.categories.read'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await ServiceAggregatorService.getContentCategories();
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Content categories retrieved successfully'
        });
      } else {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error,
          message: 'Failed to retrieve content categories'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Content categories service error'
      });
    }
  })
);

/**
 * Get Media Library
 * GET /api/content/media
 */
router.get('/media',
  requirePermission('content.media.read'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, type } = req.query;
      
      const result = await ServiceAggregatorService.getMediaLibrary({
        page: Number(page),
        limit: Number(limit),
        type: type as string
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Media library retrieved successfully'
        });
      } else {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error,
          message: 'Failed to retrieve media library'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Media library service error'
      });
    }
  })
);

export default router;