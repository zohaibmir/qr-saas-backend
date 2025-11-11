import {
  ContentPost,
  ContentCategory,
  ContentTag,
  ContentMedia,
  ContentComment,
  ContentSeoSettings,
  ContentView,
  ContentMenuItem,
  CreateContentPostRequest,
  UpdateContentPostRequest,
  CreateContentCategoryRequest,
  CreateContentTagRequest,
  ContentPostQuery,
  ContentAnalytics,
} from '../types/content.types';

export interface IContentRepository {
  // Post operations
  createPost(data: CreateContentPostRequest, authorId: string): Promise<ContentPost>;
  updatePost(id: string, data: UpdateContentPostRequest): Promise<ContentPost>;
  deletePost(id: string): Promise<boolean>;
  getPostById(id: string, includeRelations?: boolean): Promise<ContentPost | null>;
  getPostBySlug(slug: string, includeRelations?: boolean): Promise<ContentPost | null>;
  getPosts(query: ContentPostQuery): Promise<{
    posts: ContentPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getPublishedPosts(query: Omit<ContentPostQuery, 'status'>): Promise<{
    posts: ContentPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  
  // Category operations
  createCategory(data: { name: string; slug: string; description?: string; parent_id?: number }): Promise<ContentCategory>;
  updateCategory(id: number, data: Partial<ContentCategory>): Promise<ContentCategory>;
  deleteCategory(id: number): Promise<boolean>;
  getCategoryById(id: number): Promise<ContentCategory | null>;
  getCategoryBySlug(slug: string): Promise<ContentCategory | null>;
  getCategories(): Promise<ContentCategory[]>;
  getCategoryTree(): Promise<ContentCategory[]>;
  
  // Tag operations
  createTag(data: { name: string; slug: string; description?: string }): Promise<ContentTag>;
  updateTag(id: number, data: Partial<ContentTag>): Promise<ContentTag>;
  deleteTag(id: number): Promise<boolean>;
  getTagById(id: number): Promise<ContentTag | null>;
  getTagBySlug(slug: string): Promise<ContentTag | null>;
  getTags(): Promise<ContentTag[]>;
  getPopularTags(limit?: number): Promise<ContentTag[]>;
  
  // Post-Tag relationships
  addTagsToPost(postId: string, tagIds: number[]): Promise<void>;
  removeTagsFromPost(postId: string, tagIds: number[]): Promise<void>;
  getPostTags(postId: string): Promise<ContentTag[]>;
  
  // Media operations
  createMedia(data: Partial<ContentMedia>): Promise<ContentMedia>;
  updateMedia(id: string, data: Partial<ContentMedia>): Promise<ContentMedia>;
  deleteMedia(id: string): Promise<boolean>;
  getMediaById(id: string): Promise<ContentMedia | null>;
  getMediaList(filters?: {
    media_type?: string;
    uploaded_by?: string;
    folder_path?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    media: ContentMedia[];
    total: number;
  }>;
  
  // Comment operations
  createComment(data: Partial<ContentComment>): Promise<ContentComment>;
  updateComment(id: string, data: Partial<ContentComment>): Promise<ContentComment>;
  deleteComment(id: string): Promise<boolean>;
  getCommentById(id: string): Promise<ContentComment | null>;
  getPostComments(postId: string, includeReplies?: boolean): Promise<ContentComment[]>;
  approveComment(id: string): Promise<ContentComment>;
  rejectComment(id: string): Promise<ContentComment>;
  
  // Views and analytics
  recordView(data: Partial<ContentView>): Promise<ContentView>;
  getPostAnalytics(postId: string, dateRange?: { start: Date; end: Date }): Promise<ContentAnalytics>;
  getPopularPosts(limit?: number, timeframe?: 'day' | 'week' | 'month'): Promise<ContentPost[]>;
  
  // SEO operations
  getSeoSettings(): Promise<ContentSeoSettings | null>;
  updateSeoSettings(data: Partial<ContentSeoSettings>): Promise<ContentSeoSettings>;
  
  // Menu operations
  createMenuItem(data: Partial<ContentMenuItem>): Promise<ContentMenuItem>;
  updateMenuItem(id: number, data: Partial<ContentMenuItem>): Promise<ContentMenuItem>;
  deleteMenuItem(id: number): Promise<boolean>;
  getMenuItems(location: string): Promise<ContentMenuItem[]>;
}

export interface IContentService {
  // Post management
  createPost(data: CreateContentPostRequest, authorId: string): Promise<ContentPost>;
  updatePost(id: string, data: UpdateContentPostRequest, authorId: string): Promise<ContentPost>;
  deletePost(id: string, authorId: string): Promise<boolean>;
  getPost(identifier: string, includeRelations?: boolean): Promise<ContentPost | null>;
  getPosts(query: ContentPostQuery): Promise<{
    posts: ContentPost[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>;
  publishPost(id: string, authorId: string): Promise<ContentPost>;
  unpublishPost(id: string, authorId: string): Promise<ContentPost>;
  schedulePost(id: string, publishDate: Date, authorId: string): Promise<ContentPost>;
  
  // Category management
  createCategory(data: CreateContentCategoryRequest): Promise<ContentCategory>;
  updateCategory(id: number, data: Partial<ContentCategory>): Promise<ContentCategory>;
  deleteCategory(id: number): Promise<boolean>;
  getCategories(): Promise<ContentCategory[]>;
  getCategoryTree(): Promise<ContentCategory[]>;
  
  // Tag management
  createTag(data: CreateContentTagRequest): Promise<ContentTag>;
  updateTag(id: number, data: Partial<ContentTag>): Promise<ContentTag>;
  deleteTag(id: number): Promise<boolean>;
  getTags(): Promise<ContentTag[]>;
  getPopularTags(limit?: number): Promise<ContentTag[]>;
  
  // Media management
  uploadMedia(file: Express.Multer.File, uploadedBy: string, metadata?: any): Promise<ContentMedia>;
  updateMedia(id: string, data: Partial<ContentMedia>): Promise<ContentMedia>;
  deleteMedia(id: string): Promise<boolean>;
  getMediaList(filters?: any): Promise<{ media: ContentMedia[]; total: number }>;
  
  // Comment management
  createComment(postId: string, data: Partial<ContentComment>): Promise<ContentComment>;
  updateComment(id: string, data: Partial<ContentComment>): Promise<ContentComment>;
  deleteComment(id: string): Promise<boolean>;
  getPostComments(postId: string): Promise<ContentComment[]>;
  moderateComment(id: string, action: 'approve' | 'reject' | 'spam'): Promise<ContentComment>;
  
  // SEO and metadata
  generateSeoMetadata(post: ContentPost): Promise<any>;
  generateSitemap(): Promise<string>;
  generateRobotsTxt(): Promise<string>;
  updateSeoSettings(data: Partial<ContentSeoSettings>): Promise<ContentSeoSettings>;
  
  // Analytics
  trackView(postId: string, viewData: Partial<ContentView>): Promise<void>;
  getPostAnalytics(postId: string, dateRange?: { start: Date; end: Date }): Promise<ContentAnalytics>;
  getContentDashboard(): Promise<any>;
  
  // Search and filtering
  searchContent(query: string, filters?: any): Promise<ContentPost[]>;
  getRelatedPosts(postId: string, limit?: number): Promise<ContentPost[]>;
  
  // Bulk operations
  bulkUpdatePosts(postIds: string[], data: Partial<ContentPost>): Promise<ContentPost[]>;
  bulkDeletePosts(postIds: string[]): Promise<boolean>;
  
  // Public API methods
  getPublicPosts(type: 'blog' | 'testimonial' | 'page', query?: any): Promise<any>;
  getPublicPost(slug: string, type?: string): Promise<ContentPost | null>;
  getFeaturedPosts(type?: string, limit?: number): Promise<ContentPost[]>;
}

export interface IRichTextEditorService {
  // Delta operations
  convertDeltaToHtml(delta: any): string;
  convertHtmlToDelta(html: string): any;
  sanitizeDelta(delta: any): any;
  validateDelta(delta: any): boolean;
  
  // Content processing
  extractTextFromDelta(delta: any): string;
  generateExcerpt(delta: any, length?: number): string;
  countWords(delta: any): number;
  estimateReadingTime(delta: any): number;
  
  // Image handling
  processEmbeddedImages(delta: any): Promise<any>;
  replaceImageUrls(html: string, urlMapping: { [key: string]: string }): string;
  
  // Formatting
  stripFormatting(delta: any): string;
  preserveFormatting(delta: any, allowedFormats: string[]): any;
}

export interface ISeoService {
  // Meta generation
  generateMetaTags(post: ContentPost): any;
  generateOpenGraphTags(post: ContentPost): any;
  generateTwitterCardTags(post: ContentPost): any;
  generateSchemaMarkup(post: ContentPost): any;
  
  // SEO analysis
  analyzeSeoScore(post: ContentPost): {
    score: number;
    suggestions: string[];
    warnings: string[];
  };
  validateSeoRequirements(post: ContentPost): {
    isValid: boolean;
    errors: string[];
  };
  
  // Sitemap generation
  generateSitemap(): Promise<string>;
  generateSitemapIndex(): Promise<string>;
  
  // Robots.txt
  generateRobotsTxt(): Promise<string>;
  
  // Slugs
  generateSlug(title: string, existingSlugs?: string[]): Promise<string>;
  validateSlug(slug: string): boolean;
}

export interface IMediaService {
  // File processing
  processImage(file: Express.Multer.File): Promise<{
    processed: Buffer;
    metadata: any;
    thumbnails: Array<{ size: string; buffer: Buffer; width: number; height: number }>;
  }>;
  generateThumbnails(imageBuffer: Buffer): Promise<Array<{
    size: string;
    buffer: Buffer;
    width: number;
    height: number;
  }>>;
  
  // Storage
  saveFile(buffer: Buffer, filename: string, folder?: string): Promise<string>;
  deleteFile(filePath: string): Promise<boolean>;
  getFileUrl(filePath: string): string;
  
  // Validation
  validateFile(file: Express.Multer.File): {
    isValid: boolean;
    errors: string[];
  };
  sanitizeFilename(filename: string): string;
}

export interface INotificationService {
  // Comment notifications
  notifyNewComment(comment: ContentComment, post: ContentPost): Promise<void>;
  notifyCommentReply(comment: ContentComment, parentComment: ContentComment): Promise<void>;
  
  // Publishing notifications
  notifyPostPublished(post: ContentPost): Promise<void>;
  notifyScheduledPost(post: ContentPost): Promise<void>;
  
  // Moderation notifications
  notifyModerationRequired(comment: ContentComment): Promise<void>;
  
  // Admin notifications
  notifyNewSubmission(post: ContentPost): Promise<void>;
}

// Extended Content Post for enriched data
export interface EnrichedContentPost extends ContentPost {
  estimated_reading_time?: number;
  word_count?: number;
  social_share_urls?: {
    facebook: string;
    twitter: string;
    linkedin: string;
    email: string;
  };
  author_name?: string;
}

// Extended Update Request that allows partial updates
export interface FlexibleUpdateRequest {
  id?: string;
  title?: string;
  slug?: string;
  content_delta?: any;
  content_html?: string;
  excerpt?: string;
  post_type?: 'blog' | 'testimonial' | 'page' | 'help';
  status?: 'draft' | 'published' | 'scheduled';
  publish_date?: string;
  scheduled_publish_date?: string;
  category_id?: number;
  featured_image_id?: string;
  is_featured?: boolean;
  allow_comments?: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  custom_fields?: Record<string, any>;
  metadata?: Record<string, any>;
  expires_at?: string;
}

// Error handling
export class ContentError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'CONTENT_ERROR'
  ) {
    super(message);
    this.name = 'ContentError';
  }
}

export class ValidationError extends ContentError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ContentError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ContentError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}