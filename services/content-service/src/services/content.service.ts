import {
  ContentPost,
  ContentCategory,
  ContentTag,
  ContentMedia,
  ContentComment,
  ContentSeoSettings,
  ContentView,
  CreateContentPostRequest,
  UpdateContentPostRequest,
  CreateContentCategoryRequest,
  CreateContentTagRequest,
  ContentPostQuery,
  ContentAnalytics,
} from '../types/content.types';
import { 
  IContentService, 
  IRichTextEditorService,
  ISeoService,
  IMediaService,
  EnrichedContentPost,
  FlexibleUpdateRequest
} from '../interfaces/content.interface';
import { ContentRepository } from '../repositories/content.repository';
import { RichTextEditorService } from './rich-text-editor.service';
import { SeoService } from './seo.service';
import { MediaService } from './media.service';
import slugify from 'slugify';

export class ContentService implements IContentService {
  private contentRepo: ContentRepository;
  private editorService: IRichTextEditorService;
  private seoService: ISeoService;
  private mediaService: IMediaService;

  constructor() {
    this.contentRepo = new ContentRepository();
    this.editorService = new RichTextEditorService();
    this.seoService = new SeoService();
    this.mediaService = new MediaService();
  }

  // Post management
  async createPost(data: CreateContentPostRequest, authorId: string): Promise<ContentPost> {
    try {
      // Process content if provided
      let processedData = { ...data };
      
      if (data.content_delta) {
        // Validate and sanitize delta
        if (!this.editorService.validateDelta(data.content_delta)) {
          throw new Error('Invalid content format');
        }
        
        processedData.content_delta = this.editorService.sanitizeDelta(data.content_delta);
        
        // Convert to HTML for display
        processedData.content_html = this.editorService.convertDeltaToHtml(processedData.content_delta);
        
        // Generate excerpt if not provided
        if (!data.excerpt && processedData.content_delta) {
          processedData.excerpt = this.editorService.generateExcerpt(processedData.content_delta);
        }
      }

      // Generate SEO metadata if not provided
      if (!data.seo_title) {
        processedData.seo_title = data.title;
      }

      if (!data.seo_description && processedData.excerpt) {
        processedData.seo_description = processedData.excerpt.substring(0, 160);
      }

      // Generate slug from title
      const slug = await this.generateUniqueSlug(data.title);
      
      const post = await this.contentRepo.createPost(processedData, authorId);
      
      // Process embedded images if any
      if (post.content_delta) {
        post.content_delta = await this.editorService.processEmbeddedImages(post.content_delta);
      }

      return post;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(id: string, data: UpdateContentPostRequest, authorId: string): Promise<ContentPost> {
    try {
      // Get existing post to verify ownership
      const existingPost = await this.contentRepo.getPostById(id);
      if (!existingPost) {
        throw new Error('Post not found');
      }

      if (existingPost.author_id !== authorId) {
        throw new Error('Unauthorized to update this post');
      }

      // Process content if provided
      let processedData = { ...data };
      
      if (data.content_delta) {
        // Validate and sanitize delta
        if (!this.editorService.validateDelta(data.content_delta)) {
          throw new Error('Invalid content format');
        }
        
        processedData.content_delta = this.editorService.sanitizeDelta(data.content_delta);
        
        // Convert to HTML for display
        processedData.content_html = this.editorService.convertDeltaToHtml(processedData.content_delta);
        
        // Update excerpt if content changed
        if (!data.excerpt) {
          processedData.excerpt = this.editorService.generateExcerpt(processedData.content_delta);
        }
      }

      // Update slug if title changed
      if (data.title && data.title !== existingPost.title) {
        const newSlug = await this.generateUniqueSlug(data.title, existingPost.slug);
        (processedData as any).slug = newSlug;
      }

      const updatedPost = await this.contentRepo.updatePost(id, processedData);

      // Process embedded images if any
      if (updatedPost.content_delta) {
        updatedPost.content_delta = await this.editorService.processEmbeddedImages(updatedPost.content_delta);
      }

      return updatedPost;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(id: string, authorId: string): Promise<boolean> {
    try {
      // Get existing post to verify ownership
      const existingPost = await this.contentRepo.getPostById(id);
      if (!existingPost) {
        throw new Error('Post not found');
      }

      if (existingPost.author_id !== authorId) {
        throw new Error('Unauthorized to delete this post');
      }

      return await this.contentRepo.deletePost(id);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async getPost(identifier: string, includeRelations = true): Promise<ContentPost | null> {
    try {
      // Check if identifier is UUID or slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      if (isUuid) {
        return await this.contentRepo.getPostById(identifier, includeRelations);
      } else {
        return await this.contentRepo.getPostBySlug(identifier, includeRelations);
      }
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  }

  async getPosts(query: ContentPostQuery): Promise<{
    posts: ContentPost[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const result = await this.contentRepo.getPosts(query);
      
      // Add computed fields to posts
      const enrichedPosts = result.posts.map(post => this.enrichPostData(post));

      return {
        posts: enrichedPosts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  }

  async publishPost(id: string, authorId: string): Promise<ContentPost> {
    try {
      const post = await this.contentRepo.getPostById(id);
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.author_id !== authorId) {
        throw new Error('Unauthorized to publish this post');
      }

      return await this.contentRepo.updatePost(id, {
        id,
        status: 'published',
        publish_date: new Date().toISOString(),
      } as UpdateContentPostRequest);
    } catch (error) {
      console.error('Error publishing post:', error);
      throw error;
    }
  }

  async unpublishPost(id: string, authorId: string): Promise<ContentPost> {
    try {
      const post = await this.contentRepo.getPostById(id);
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.author_id !== authorId) {
        throw new Error('Unauthorized to unpublish this post');
      }

      return await this.contentRepo.updatePost(id, {
        id,
        status: 'draft',
        publish_date: undefined,
      } as UpdateContentPostRequest);
    } catch (error) {
      console.error('Error unpublishing post:', error);
      throw error;
    }
  }

  async schedulePost(id: string, publishDate: Date, authorId: string): Promise<ContentPost> {
    try {
      const post = await this.contentRepo.getPostById(id);
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.author_id !== authorId) {
        throw new Error('Unauthorized to schedule this post');
      }

      if (publishDate <= new Date()) {
        throw new Error('Scheduled publish date must be in the future');
      }

      return await this.contentRepo.updatePost(id, {
        id,
        status: 'scheduled',
        scheduled_publish_date: publishDate.toISOString(),
      } as UpdateContentPostRequest);
    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  }

  // Category management
  async createCategory(data: CreateContentCategoryRequest): Promise<ContentCategory> {
    try {
      const slug = slugify(data.name, { lower: true, strict: true });
      
      // Check if slug already exists
      const existing = await this.contentRepo.getCategoryBySlug(slug);
      if (existing) {
        throw new Error('Category with this name already exists');
      }

      return await this.contentRepo.createCategory({
        ...data,
        slug,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: number, data: Partial<ContentCategory>): Promise<ContentCategory> {
    try {
      // Generate new slug if name is being updated
      if (data.name) {
        const newSlug = slugify(data.name, { lower: true, strict: true });
        
        // Check if new slug conflicts with existing categories (except current one)
        const existing = await this.contentRepo.getCategoryBySlug(newSlug);
        if (existing && existing.id !== id) {
          throw new Error('Category with this name already exists');
        }
        
        data.slug = newSlug;
      }

      return await this.contentRepo.updateCategory(id, data);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      // Check if category has posts
      const posts = await this.contentRepo.getPosts({ category_id: id, limit: 1 });
      if (posts.total > 0) {
        throw new Error('Cannot delete category that contains posts');
      }

      return await this.contentRepo.deleteCategory(id);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  async getCategories(): Promise<ContentCategory[]> {
    try {
      return await this.contentRepo.getCategories();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  async getCategoryTree(): Promise<ContentCategory[]> {
    try {
      return await this.contentRepo.getCategoryTree();
    } catch (error) {
      console.error('Error getting category tree:', error);
      throw error;
    }
  }

  // Tag management
  async createTag(data: CreateContentTagRequest): Promise<ContentTag> {
    try {
      const slug = slugify(data.name, { lower: true, strict: true });
      
      // Check if slug already exists
      const existing = await this.contentRepo.getTagBySlug(slug);
      if (existing) {
        throw new Error('Tag with this name already exists');
      }

      return await this.contentRepo.createTag({
        ...data,
        slug,
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  }

  async updateTag(id: number, data: Partial<ContentTag>): Promise<ContentTag> {
    try {
      // Generate new slug if name is being updated
      if (data.name) {
        const newSlug = slugify(data.name, { lower: true, strict: true });
        
        // Check if new slug conflicts with existing tags (except current one)
        const existing = await this.contentRepo.getTagBySlug(newSlug);
        if (existing && existing.id !== id) {
          throw new Error('Tag with this name already exists');
        }
        
        data.slug = newSlug;
      }

      return await this.contentRepo.updateTag(id, data);
    } catch (error) {
      console.error('Error updating tag:', error);
      throw error;
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    try {
      return await this.contentRepo.deleteTag(id);
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }

  async getTags(): Promise<ContentTag[]> {
    try {
      return await this.contentRepo.getTags();
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  }

  async getPopularTags(limit = 20): Promise<ContentTag[]> {
    try {
      return await this.contentRepo.getPopularTags(limit);
    } catch (error) {
      console.error('Error getting popular tags:', error);
      throw error;
    }
  }

  // Media management
  async uploadMedia(file: Express.Multer.File, uploadedBy: string, metadata?: any): Promise<ContentMedia> {
    try {
      // Validate file
      const validation = this.mediaService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`Invalid file: ${validation.errors.join(', ')}`);
      }

      // Process file based on type
      const mediaData: Partial<ContentMedia> = {
        filename: this.mediaService.sanitizeFilename(file.filename),
        original_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        uploaded_by: uploadedBy,
        metadata: metadata || {},
      };

      if (file.mimetype.startsWith('image/')) {
        // Process image
        const imageData = await this.mediaService.processImage(file);
        mediaData.width = imageData.metadata.width;
        mediaData.height = imageData.metadata.height;
        // Process thumbnails and save them, generating URLs
        const savedThumbnails = await Promise.all(
          imageData.thumbnails.map(async (thumb) => {
            const thumbFilename = `thumb_${thumb.size}_${mediaData.filename}`;
            const thumbPath = await this.mediaService.saveFile(thumb.buffer, thumbFilename);
            return {
              size: thumb.size,
              url: this.mediaService.getFileUrl(thumbPath),
              width: thumb.width,
              height: thumb.height,
            };
          })
        );
        mediaData.thumbnails = savedThumbnails;
        mediaData.media_type = 'image';
      }

      // Save file and get URL
      const filePath = await this.mediaService.saveFile(file.buffer, mediaData.filename!);
      mediaData.file_path = filePath;
      mediaData.file_url = this.mediaService.getFileUrl(filePath);

      return await this.contentRepo.createMedia(mediaData);
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  async updateMedia(id: string, data: Partial<ContentMedia>): Promise<ContentMedia> {
    try {
      return await this.contentRepo.updateMedia(id, data);
    } catch (error) {
      console.error('Error updating media:', error);
      throw error;
    }
  }

  async deleteMedia(id: string): Promise<boolean> {
    try {
      // Get media to get file path
      const media = await this.contentRepo.getMediaById(id);
      if (!media) {
        throw new Error('Media not found');
      }

      // Delete file from storage
      await this.mediaService.deleteFile(media.file_path);

      // Delete from database
      return await this.contentRepo.deleteMedia(id);
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  async getMediaList(filters?: any): Promise<{ media: ContentMedia[]; total: number }> {
    try {
      return await this.contentRepo.getMediaList(filters);
    } catch (error) {
      console.error('Error getting media list:', error);
      throw error;
    }
  }

  // Comment management
  async createComment(postId: string, data: Partial<ContentComment>): Promise<ContentComment> {
    try {
      // Verify post exists
      const post = await this.contentRepo.getPostById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.allow_comments) {
        throw new Error('Comments are disabled for this post');
      }

      const commentData = {
        ...data,
        post_id: postId,
        status: 'pending' as const, // Default to pending for moderation
      };

      return await this.contentRepo.createComment(commentData);
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async updateComment(id: string, data: Partial<ContentComment>): Promise<ContentComment> {
    try {
      return await this.contentRepo.updateComment(id, data);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(id: string): Promise<boolean> {
    try {
      return await this.contentRepo.deleteComment(id);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async getPostComments(postId: string): Promise<ContentComment[]> {
    try {
      return await this.contentRepo.getPostComments(postId, true);
    } catch (error) {
      console.error('Error getting post comments:', error);
      throw error;
    }
  }

  async moderateComment(id: string, action: 'approve' | 'reject' | 'spam'): Promise<ContentComment> {
    try {
      switch (action) {
        case 'approve':
          return await this.contentRepo.approveComment(id);
        case 'reject':
          return await this.contentRepo.rejectComment(id);
        case 'spam':
          return await this.contentRepo.updateComment(id, { status: 'spam' });
        default:
          throw new Error('Invalid moderation action');
      }
    } catch (error) {
      console.error('Error moderating comment:', error);
      throw error;
    }
  }

  // SEO and metadata
  async generateSeoMetadata(post: ContentPost): Promise<any> {
    try {
      return this.seoService.generateMetaTags(post);
    } catch (error) {
      console.error('Error generating SEO metadata:', error);
      throw error;
    }
  }

  async generateSitemap(): Promise<string> {
    try {
      return await this.seoService.generateSitemap();
    } catch (error) {
      console.error('Error generating sitemap:', error);
      throw error;
    }
  }

  async generateRobotsTxt(): Promise<string> {
    try {
      return await this.seoService.generateRobotsTxt();
    } catch (error) {
      console.error('Error generating robots.txt:', error);
      throw error;
    }
  }

  async updateSeoSettings(data: Partial<ContentSeoSettings>): Promise<ContentSeoSettings> {
    try {
      return await this.contentRepo.updateSeoSettings(data);
    } catch (error) {
      console.error('Error updating SEO settings:', error);
      throw error;
    }
  }

  // Analytics
  async trackView(postId: string, viewData: Partial<ContentView>): Promise<void> {
    try {
      await this.contentRepo.recordView({
        ...viewData,
        post_id: postId,
      });
    } catch (error) {
      console.error('Error tracking view:', error);
      // Don't throw error for analytics failures
    }
  }

  async getPostAnalytics(postId: string, dateRange?: { start: Date; end: Date }): Promise<ContentAnalytics> {
    try {
      return await this.contentRepo.getPostAnalytics(postId, dateRange);
    } catch (error) {
      console.error('Error getting post analytics:', error);
      throw error;
    }
  }

  async getContentDashboard(): Promise<any> {
    try {
      // Get various dashboard metrics
      const [
        totalPosts,
        publishedPosts,
        draftPosts,
        totalViews,
        popularPosts,
        recentComments
      ] = await Promise.all([
        this.contentRepo.getPosts({ limit: 1 }),
        this.contentRepo.getPublishedPosts({ limit: 1 }),
        this.contentRepo.getPosts({ status: 'draft', limit: 1 }),
        this.contentRepo.getPosts({ limit: 1 }), // Placeholder for total views
        this.contentRepo.getPopularPosts(5),
        this.contentRepo.getPosts({ limit: 5, sort_by: 'created_at', sort_order: 'desc' })
      ]);

      return {
        overview: {
          totalPosts: totalPosts.total,
          publishedPosts: publishedPosts.total,
          draftPosts: draftPosts.total,
          totalViews: 0, // Calculate from views table
        },
        popularPosts: popularPosts,
        recentActivity: recentComments.posts,
      };
    } catch (error) {
      console.error('Error getting content dashboard:', error);
      throw error;
    }
  }

  // Search and filtering
  async searchContent(query: string, filters?: any): Promise<ContentPost[]> {
    try {
      const searchQuery: ContentPostQuery = {
        search: query,
        status: 'published',
        ...filters,
      };

      const result = await this.contentRepo.getPosts(searchQuery);
      return result.posts.map(post => this.enrichPostData(post));
    } catch (error) {
      console.error('Error searching content:', error);
      throw error;
    }
  }

  async getRelatedPosts(postId: string, limit = 5): Promise<ContentPost[]> {
    try {
      const post = await this.contentRepo.getPostById(postId, true);
      if (!post) {
        return [];
      }

      // Find related posts based on category and tags
      const relatedQuery: ContentPostQuery = {
        status: 'published',
        category_id: post.category_id,
        limit,
      };

      const result = await this.contentRepo.getPosts(relatedQuery);
      
      // Filter out the current post
      const relatedPosts = result.posts
        .filter(p => p.id !== postId)
        .slice(0, limit);

      return relatedPosts.map(post => this.enrichPostData(post));
    } catch (error) {
      console.error('Error getting related posts:', error);
      return [];
    }
  }

  // Bulk operations
  async bulkUpdatePosts(postIds: string[], data: Partial<ContentPost>): Promise<ContentPost[]> {
    try {
      const updatedPosts: ContentPost[] = [];
      
      for (const id of postIds) {
        const updatedPost = await this.contentRepo.updatePost(id, { ...data, id } as UpdateContentPostRequest);
        updatedPosts.push(updatedPost);
      }

      return updatedPosts;
    } catch (error) {
      console.error('Error bulk updating posts:', error);
      throw error;
    }
  }

  async bulkDeletePosts(postIds: string[]): Promise<boolean> {
    try {
      for (const id of postIds) {
        await this.contentRepo.deletePost(id);
      }
      return true;
    } catch (error) {
      console.error('Error bulk deleting posts:', error);
      throw error;
    }
  }

  // Public API methods
  async getPublicPosts(type: 'blog' | 'testimonial' | 'page', query?: any): Promise<any> {
    try {
      const publicQuery: ContentPostQuery = {
        post_type: type,
        status: 'published',
        include_category: true,
        include_tags: true,
        ...query,
      };

      const result = await this.contentRepo.getPublishedPosts(publicQuery);
      
      return {
        posts: result.posts.map(post => this.enrichPostData(post)),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting public posts:', error);
      throw error;
    }
  }

  async getPublicPost(slug: string, type?: string): Promise<ContentPost | null> {
    try {
      const post = await this.contentRepo.getPostBySlug(slug, true);
      
      if (!post || post.status !== 'published') {
        return null;
      }

      if (type && post.post_type !== type) {
        return null;
      }

      return this.enrichPostData(post);
    } catch (error) {
      console.error('Error getting public post:', error);
      throw error;
    }
  }

  async getFeaturedPosts(type?: string, limit = 10): Promise<ContentPost[]> {
    try {
      const query: ContentPostQuery = {
        status: 'published',
        limit,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      if (type) {
        query.post_type = type as any;
      }

      const result = await this.contentRepo.getPosts(query);
      
      // Filter for featured posts if it's testimonials
      let posts = result.posts;
      if (type === 'testimonial') {
        posts = posts.filter(post => post.is_featured);
      }

      return posts.map(post => this.enrichPostData(post));
    } catch (error) {
      console.error('Error getting featured posts:', error);
      throw error;
    }
  }

  // Helper methods
  private enrichPostData(post: ContentPost): EnrichedContentPost {
    try {
      const enrichedPost: EnrichedContentPost = { ...post };

      // Add computed fields
      if (post.content_delta) {
        enrichedPost.estimated_reading_time = this.editorService.estimateReadingTime(post.content_delta);
        enrichedPost.word_count = this.editorService.countWords(post.content_delta);
      }

      // Add social share URLs
      enrichedPost.social_share_urls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.slug)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(post.slug)}&text=${encodeURIComponent(post.title)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(post.slug)}`,
        email: `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(post.slug)}`,
      };

      return enrichedPost;
    } catch (error) {
      console.error('Error enriching post data:', error);
      return post as EnrichedContentPost;
    }
  }

  private async generateUniqueSlug(title: string, currentSlug?: string): Promise<string> {
    try {
      let baseSlug = slugify(title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        // Check if this slug already exists (excluding current post if updating)
        const existing = await this.contentRepo.getPostBySlug(slug);
        
        if (!existing || (currentSlug && existing.slug === currentSlug)) {
          break;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      return slug;
    } catch (error) {
      console.error('Error generating unique slug:', error);
      return slugify(title, { lower: true, strict: true });
    }
  }
}