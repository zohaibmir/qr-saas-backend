import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Post validation schemas
const postSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content_delta: Joi.any(), // Quill Delta object
  excerpt: Joi.string().max(500).optional(),
  post_type: Joi.string().valid('blog', 'testimonial', 'page', 'help').default('blog'),
  status: Joi.string().valid('draft', 'published', 'scheduled').default('draft'),
  category_id: Joi.number().integer().optional(),
  featured_image_id: Joi.string().uuid().optional(),
  is_featured: Joi.boolean().default(false),
  allow_comments: Joi.boolean().default(true),
  seo_title: Joi.string().max(60).optional(),
  seo_description: Joi.string().max(160).optional(),
  seo_keywords: Joi.string().optional(),
  custom_fields: Joi.object().optional(),
  metadata: Joi.object().optional(),
  publish_date: Joi.date().optional(),
  scheduled_publish_date: Joi.date().optional(),
  expires_at: Joi.date().optional(),
});

const postUpdateSchema = Joi.object({
  id: Joi.string().uuid().required(),
  title: Joi.string().min(1).max(200).optional(),
  content_delta: Joi.any().optional(), // Quill Delta object
  excerpt: Joi.string().max(500).optional(),
  post_type: Joi.string().valid('blog', 'testimonial', 'page', 'help').optional(),
  status: Joi.string().valid('draft', 'published', 'scheduled').optional(),
  category_id: Joi.number().integer().optional(),
  featured_image_id: Joi.string().uuid().optional(),
  is_featured: Joi.boolean().optional(),
  allow_comments: Joi.boolean().optional(),
  seo_title: Joi.string().max(60).optional(),
  seo_description: Joi.string().max(160).optional(),
  seo_keywords: Joi.string().optional(),
  custom_fields: Joi.object().optional(),
  metadata: Joi.object().optional(),
  publish_date: Joi.date().optional(),
  scheduled_publish_date: Joi.date().optional(),
  expires_at: Joi.date().optional(),
});

// Category validation schemas
const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  parent_id: Joi.number().integer().optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: Joi.string().max(50).optional(),
});

const categoryUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  parent_id: Joi.number().integer().optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: Joi.string().max(50).optional(),
  is_active: Joi.boolean().optional(),
});

// Tag validation schemas
const tagSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const tagUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: Joi.boolean().optional(),
});

// Comment validation schemas
const commentSchema = Joi.object({
  author_name: Joi.string().min(1).max(100).required(),
  author_email: Joi.string().email().required(),
  author_website: Joi.string().uri().optional(),
  content: Joi.string().min(1).max(2000).required(),
  parent_comment_id: Joi.string().uuid().optional(),
});

const commentUpdateSchema = Joi.object({
  content: Joi.string().min(1).max(2000).optional(),
  status: Joi.string().valid('pending', 'approved', 'spam', 'deleted').optional(),
  moderator_notes: Joi.string().max(500).optional(),
});

// Media validation schemas
const mediaUpdateSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  alt_text: Joi.string().max(200).optional(),
  caption: Joi.string().max(500).optional(),
  folder_path: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

// SEO settings validation
const seoSettingsSchema = Joi.object({
  site_title: Joi.string().max(60).optional(),
  site_description: Joi.string().max(160).optional(),
  default_keywords: Joi.string().optional(),
  robots_txt: Joi.string().optional(),
  google_analytics_id: Joi.string().optional(),
  google_search_console_id: Joi.string().optional(),
  facebook_app_id: Joi.string().optional(),
  twitter_username: Joi.string().optional(),
  structured_data: Joi.object().optional(),
});

// Validation middleware functions
export const validatePost = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = postSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validatePostUpdate = (req: Request, res: Response, next: NextFunction) => {
  // Add ID from URL params for validation
  const dataWithId = { ...req.body, id: req.params.id };
  const { error, value } = postUpdateSchema.validate(dataWithId);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateCategory = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = categorySchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateCategoryUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = categoryUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateTag = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = tagSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateTagUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = tagUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateComment = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = commentSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateCommentUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = commentUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateMediaUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = mediaUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateSeoSettings = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = seoSettingsSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

// Query validation helpers
export const validateQueryParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, { allowUnknown: true });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    req.query = value;
    next();
  };
};

// Common query parameter schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const postQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('draft', 'published', 'scheduled').optional(),
  type: Joi.string().valid('blog', 'testimonial', 'page', 'help').optional(),
  category: Joi.number().integer().optional(),
  search: Joi.string().max(200).optional(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'publish_date', 'title', 'views_count').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
  include_category: Joi.boolean().default(false),
  include_tags: Joi.boolean().default(false),
  include_author: Joi.boolean().default(false),
});

export const mediaQuerySchema = paginationSchema.keys({
  type: Joi.string().valid('image', 'video', 'document', 'other').optional(),
  folder: Joi.string().optional(),
  uploaded_by: Joi.string().uuid().optional(),
});