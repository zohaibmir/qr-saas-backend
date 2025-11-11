import { Router, Request, Response } from 'express';
import { ContentService } from '../services/content.service';

const router = Router();
const contentService = new ContentService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Basic auth middleware placeholder
const auth = (req: AuthenticatedRequest, res: Response, next: any) => {
  // TODO: Implement proper JWT authentication
  req.user = { id: 'user-123', email: 'user@example.com', role: 'admin' };
  next();
};

// GET /api/content/posts - List posts with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      status: req.query.status as any,
      post_type: req.query.type as any,
      category_id: req.query.category ? parseInt(req.query.category as string) : undefined,
      search: req.query.search as string,
      sort_by: (req.query.sort_by as string) === 'title' || 
               (req.query.sort_by as string) === 'publish_date' || 
               (req.query.sort_by as string) === 'created_at' || 
               (req.query.sort_by as string) === 'updated_at' || 
               (req.query.sort_by as string) === 'views_count' 
               ? req.query.sort_by as any : 'created_at',
      sort_order: req.query.sort_order as 'asc' | 'desc' || 'desc',
      include_category: req.query.include_category === 'true',
      include_tags: req.query.include_tags === 'true',
      include_author: req.query.include_author === 'true',
    };

    const result = await contentService.getPosts(query);
    
    res.json({
      success: true,
      data: result.posts,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/content/posts/:id - Get single post
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const includeRelations = req.query.include_relations === 'true';
    const post = await contentService.getPost(req.params.id, includeRelations);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/content/posts - Create new post
router.post('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user!.id;
    const post = await contentService.createPost(req.body, authorId);
    
    res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/content/posts/:id - Update post
router.put('/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user!.id;
    const updateData = { ...req.body, id: req.params.id };
    const post = await contentService.updatePost(req.params.id, updateData, authorId);
    
    res.json({
      success: true,
      data: post,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this post',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/content/posts/:id - Delete post
router.delete('/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user!.id;
    const success = await contentService.deletePost(req.params.id, authorId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this post',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/content/posts/:id/publish - Publish post
router.post('/:id/publish', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user!.id;
    const post = await contentService.publishPost(req.params.id, authorId);
    
    res.json({
      success: true,
      data: post,
      message: 'Post published successfully',
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to publish this post',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to publish post',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;