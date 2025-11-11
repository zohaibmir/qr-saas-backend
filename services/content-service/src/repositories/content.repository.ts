import { Pool } from 'pg';
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
  ContentPostQuery,
  ContentAnalytics,
} from '../types/content.types';
import { IContentRepository } from '../interfaces/content.interface';
import pool from '../config/database.config';

export class ContentRepository implements IContentRepository {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  // Helper method to build WHERE clauses for post queries
  private buildPostWhereClause(query: ContentPostQuery): { whereClause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (query.post_type) {
      conditions.push(`post_type = $${++paramCount}`);
      values.push(query.post_type);
    }

    if (query.status) {
      conditions.push(`status = $${++paramCount}`);
      values.push(query.status);
    }

    if (query.category_id) {
      conditions.push(`category_id = $${++paramCount}`);
      values.push(query.category_id);
    }

    if (query.author_id) {
      conditions.push(`author_id = $${++paramCount}`);
      values.push(query.author_id);
    }

    if (query.search) {
      conditions.push(`(title ILIKE $${++paramCount} OR content_html ILIKE $${paramCount})`);
      values.push(`%${query.search}%`);
    }

    if (query.tag_id) {
      conditions.push(`id IN (SELECT post_id FROM content_post_tags WHERE tag_id = $${++paramCount})`);
      values.push(query.tag_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  // Post operations
  async createPost(data: CreateContentPostRequest, authorId: string): Promise<ContentPost> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate slug
      const slug = this.generateSlug(data.title);
      
      // Ensure slug is unique
      const uniqueSlug = await this.ensureUniqueSlug(slug, client);

      const postQuery = `
        INSERT INTO content_posts (
          title, slug, content_delta, content_html, excerpt, post_type, status,
          featured_image_url, featured_image_alt, category_id, author_id,
          publish_date, seo_title, seo_description, seo_keywords,
          customer_name, customer_title, customer_company, customer_rating,
          customer_avatar_url, testimonial_date, is_featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `;

      const postValues = [
        data.title,
        uniqueSlug,
        data.content_delta,
        data.content_html,
        data.excerpt,
        data.post_type,
        data.status || 'draft',
        data.featured_image_url,
        data.featured_image_alt,
        data.category_id,
        authorId,
        data.publish_date ? new Date(data.publish_date) : null,
        data.seo_title,
        data.seo_description,
        data.seo_keywords,
        data.customer_name,
        data.customer_title,
        data.customer_company,
        data.customer_rating,
        data.customer_avatar_url,
        data.testimonial_date ? new Date(data.testimonial_date) : null,
        data.is_featured || false,
      ];

      const postResult = await client.query(postQuery, postValues);
      const post = postResult.rows[0];

      // Add tags if provided
      if (data.tags && data.tags.length > 0) {
        await this.addTagsToPost(post.id, data.tags, client);
      }

      await client.query('COMMIT');
      const result = await this.getPostById(post.id, true);
      if (!result) {
        throw new Error('Failed to retrieve created post');
      }
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePost(id: string, data: UpdateContentPostRequest): Promise<ContentPost> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Build dynamic update query
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'tags' && value !== undefined) {
          updates.push(`${key} = $${++paramCount}`);
          values.push(value);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE content_posts 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, values);
      if (updateResult.rows.length === 0) {
        throw new Error('Post not found');
      }

      // Update tags if provided
      if (data.tags) {
        // Remove existing tags
        await client.query('DELETE FROM content_post_tags WHERE post_id = $1', [id]);
        
        // Add new tags
        if (data.tags.length > 0) {
          await this.addTagsToPost(id, data.tags, client);
        }
      }

      await client.query('COMMIT');
      const updatedPost = await this.getPostById(id, true);
      if (!updatedPost) {
        throw new Error('Failed to retrieve updated post');
      }
      return updatedPost;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePost(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM content_posts WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getPostById(id: string, includeRelations = false): Promise<ContentPost | null> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM content_posts WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const post = result.rows[0];

      if (includeRelations) {
        // Include category
        if (post.category_id) {
          const categoryResult = await client.query(
            'SELECT * FROM content_categories WHERE id = $1',
            [post.category_id]
          );
          post.category = categoryResult.rows[0] || null;
        }

        // Include author
        if (post.author_id) {
          const authorResult = await client.query(
            'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
            [post.author_id]
          );
          post.author = authorResult.rows[0] || null;
        }

        // Include tags
        const tagsResult = await client.query(`
          SELECT t.* FROM content_tags t
          INNER JOIN content_post_tags pt ON t.id = pt.tag_id
          WHERE pt.post_id = $1
          ORDER BY t.name
        `, [id]);
        post.tags = tagsResult.rows;
      }

      return post;
    } finally {
      client.release();
    }
  }

  async getPostBySlug(slug: string, includeRelations = false): Promise<ContentPost | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_posts WHERE slug = $1', [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      if (includeRelations) {
        return await this.getPostById(result.rows[0].id, true);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getPosts(query: ContentPostQuery): Promise<{
    posts: ContentPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const client = await this.pool.connect();
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const offset = (page - 1) * limit;

      const { whereClause, values } = this.buildPostWhereClause(query);

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM content_posts ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get posts
      const sortBy = query.sort_by || 'created_at';
      const sortOrder = query.sort_order || 'desc';
      
      let postsQuery = `
        SELECT p.* FROM content_posts p 
        ${whereClause}
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;

      const postsResult = await client.query(postsQuery, [...values, limit, offset]);
      let posts = postsResult.rows;

      // Include relations if requested
      if (query.include_tags || query.include_category || query.include_author) {
        for (let post of posts) {
          if (query.include_category && post.category_id) {
            const categoryResult = await client.query(
              'SELECT * FROM content_categories WHERE id = $1',
              [post.category_id]
            );
            post.category = categoryResult.rows[0] || null;
          }

          if (query.include_author && post.author_id) {
            const authorResult = await client.query(
              'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
              [post.author_id]
            );
            post.author = authorResult.rows[0] || null;
          }

          if (query.include_tags) {
            const tagsResult = await client.query(`
              SELECT t.* FROM content_tags t
              INNER JOIN content_post_tags pt ON t.id = pt.tag_id
              WHERE pt.post_id = $1
              ORDER BY t.name
            `, [post.id]);
            post.tags = tagsResult.rows;
          }
        }
      }

      return {
        posts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } finally {
      client.release();
    }
  }

  async getPublishedPosts(query: Omit<ContentPostQuery, 'status'>): Promise<{
    posts: ContentPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.getPosts({ ...query, status: 'published' });
  }

  // Category operations
  async createCategory(data: { name: string; slug: string; description?: string; parent_id?: number }): Promise<ContentCategory> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_categories (name, slug, description, parent_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await client.query(query, [data.name, data.slug, data.description, data.parent_id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateCategory(id: number, data: Partial<ContentCategory>): Promise<ContentCategory> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          updates.push(`${key} = $${++paramCount}`);
          values.push(value);
        }
      });

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE content_categories 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error('Category not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM content_categories WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getCategoryById(id: number): Promise<ContentCategory | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_categories WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getCategoryBySlug(slug: string): Promise<ContentCategory | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_categories WHERE slug = $1', [slug]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getCategories(): Promise<ContentCategory[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT c.*, 
               COUNT(p.id) as posts_count
        FROM content_categories c
        LEFT JOIN content_posts p ON c.id = p.category_id AND p.status = 'published'
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY c.sort_order, c.name
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getCategoryTree(): Promise<ContentCategory[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        WITH RECURSIVE category_tree AS (
          -- Base case: top-level categories
          SELECT *, 0 as level, ARRAY[sort_order] as sort_path
          FROM content_categories
          WHERE parent_id IS NULL AND is_active = true
          
          UNION ALL
          
          -- Recursive case: child categories
          SELECT c.*, ct.level + 1, ct.sort_path || c.sort_order
          FROM content_categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.is_active = true
        )
        SELECT * FROM category_tree
        ORDER BY sort_path
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Tag operations
  async createTag(data: { name: string; slug: string; description?: string }): Promise<ContentTag> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_tags (name, slug, description)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await client.query(query, [data.name, data.slug, data.description]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateTag(id: number, data: Partial<ContentTag>): Promise<ContentTag> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          updates.push(`${key} = $${++paramCount}`);
          values.push(value);
        }
      });

      values.push(id);

      const updateQuery = `
        UPDATE content_tags 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error('Tag not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM content_tags WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getTagById(id: number): Promise<ContentTag | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_tags WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getTagBySlug(slug: string): Promise<ContentTag | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_tags WHERE slug = $1', [slug]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getTags(): Promise<ContentTag[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT t.*, COUNT(pt.post_id) as posts_count
        FROM content_tags t
        LEFT JOIN content_post_tags pt ON t.id = pt.tag_id
        GROUP BY t.id
        ORDER BY t.usage_count DESC, t.name
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getPopularTags(limit = 20): Promise<ContentTag[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT t.*, COUNT(pt.post_id) as posts_count
        FROM content_tags t
        INNER JOIN content_post_tags pt ON t.id = pt.tag_id
        INNER JOIN content_posts p ON pt.post_id = p.id
        WHERE p.status = 'published'
        GROUP BY t.id
        ORDER BY posts_count DESC, t.usage_count DESC
        LIMIT $1
      `, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Post-Tag relationships
  async addTagsToPost(postId: string, tagIds: number[], client?: any): Promise<void> {
    const dbClient = client || await this.pool.connect();
    try {
      for (const tagId of tagIds) {
        await dbClient.query(
          'INSERT INTO content_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [postId, tagId]
        );
        
        // Update tag usage count
        await dbClient.query(
          'UPDATE content_tags SET usage_count = usage_count + 1 WHERE id = $1',
          [tagId]
        );
      }
    } finally {
      if (!client) {
        dbClient.release();
      }
    }
  }

  async removeTagsFromPost(postId: string, tagIds: number[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const tagId of tagIds) {
        await client.query(
          'DELETE FROM content_post_tags WHERE post_id = $1 AND tag_id = $2',
          [postId, tagId]
        );
        
        // Update tag usage count
        await client.query(
          'UPDATE content_tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = $1',
          [tagId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPostTags(postId: string): Promise<ContentTag[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT t.* FROM content_tags t
        INNER JOIN content_post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = $1
        ORDER BY t.name
      `, [postId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Media operations
  async createMedia(data: Partial<ContentMedia>): Promise<ContentMedia> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_media (
          filename, original_name, file_path, file_url, mime_type, file_size,
          file_extension, media_type, width, height, thumbnails, alt_text,
          caption, description, uploaded_by, folder_path, tags, seo_filename,
          exif_data, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;
      
      const values = [
        data.filename,
        data.original_name,
        data.file_path,
        data.file_url,
        data.mime_type,
        data.file_size,
        data.file_extension,
        data.media_type || 'image',
        data.width,
        data.height,
        data.thumbnails ? JSON.stringify(data.thumbnails) : null,
        data.alt_text,
        data.caption,
        data.description,
        data.uploaded_by,
        data.folder_path,
        data.tags,
        data.seo_filename,
        data.exif_data ? JSON.stringify(data.exif_data) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateMedia(id: string, data: Partial<ContentMedia>): Promise<ContentMedia> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          updates.push(`${key} = $${++paramCount}`);
          if (key === 'thumbnails' || key === 'exif_data' || key === 'metadata') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE content_media 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error('Media not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteMedia(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM content_media WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getMediaById(id: string): Promise<ContentMedia | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_media WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getMediaList(filters: {
    media_type?: string;
    uploaded_by?: string;
    folder_path?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ media: ContentMedia[]; total: number }> {
    const client = await this.pool.connect();
    try {
      const conditions: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramCount = 0;

      if (filters.media_type) {
        conditions.push(`media_type = $${++paramCount}`);
        values.push(filters.media_type);
      }

      if (filters.uploaded_by) {
        conditions.push(`uploaded_by = $${++paramCount}`);
        values.push(filters.uploaded_by);
      }

      if (filters.folder_path) {
        conditions.push(`folder_path = $${++paramCount}`);
        values.push(filters.folder_path);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM content_media ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get media
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const mediaQuery = `
        SELECT * FROM content_media ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;

      const mediaResult = await client.query(mediaQuery, [...values, limit, offset]);

      return {
        media: mediaResult.rows,
        total,
      };
    } finally {
      client.release();
    }
  }

  // Comment operations (basic implementation)
  async createComment(data: Partial<ContentComment>): Promise<ContentComment> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_comments (
          post_id, parent_comment_id, author_name, author_email, author_website,
          author_ip, user_agent, content, content_html, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        data.post_id,
        data.parent_comment_id,
        data.author_name,
        data.author_email,
        data.author_website,
        data.author_ip,
        data.user_agent,
        data.content,
        data.content_html,
        data.status || 'pending',
        data.metadata ? JSON.stringify(data.metadata) : null,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateComment(id: string, data: Partial<ContentComment>): Promise<ContentComment> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          updates.push(`${key} = $${++paramCount}`);
          if (key === 'metadata') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE content_comments 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error('Comment not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteComment(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM content_comments WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getCommentById(id: string): Promise<ContentComment | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_comments WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getPostComments(postId: string, includeReplies = true): Promise<ContentComment[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM content_comments 
        WHERE post_id = $1 AND status = 'approved'
      `;
      
      if (!includeReplies) {
        query += ' AND parent_comment_id IS NULL';
      }
      
      query += ' ORDER BY created_at ASC';

      const result = await client.query(query, [postId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async approveComment(id: string): Promise<ContentComment> {
    return this.updateComment(id, { status: 'approved', is_approved: true });
  }

  async rejectComment(id: string): Promise<ContentComment> {
    return this.updateComment(id, { status: 'deleted', is_approved: false });
  }

  // Views and analytics (basic implementation)
  async recordView(data: Partial<ContentView>): Promise<ContentView> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_views (
          post_id, visitor_ip, user_agent, referrer_url, session_id, user_id,
          country, region, city, device_type, browser, operating_system,
          time_on_page, scroll_depth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        data.post_id,
        data.visitor_ip,
        data.user_agent,
        data.referrer_url,
        data.session_id,
        data.user_id,
        data.country,
        data.region,
        data.city,
        data.device_type,
        data.browser,
        data.operating_system,
        data.time_on_page,
        data.scroll_depth,
      ];

      const result = await client.query(query, values);
      
      // Update post view count
      await client.query(
        'UPDATE content_posts SET views_count = views_count + 1 WHERE id = $1',
        [data.post_id]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getPostAnalytics(postId: string, dateRange?: { start: Date; end: Date }): Promise<ContentAnalytics> {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE post_id = $1';
      const values = [postId];

      if (dateRange) {
        whereClause += ' AND viewed_at BETWEEN $2 AND $3';
        values.push(dateRange.start.toISOString(), dateRange.end.toISOString());
      }

      // Get basic analytics
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT visitor_ip) as unique_views,
          AVG(time_on_page) as avg_time_on_page,
          AVG(scroll_depth) as avg_scroll_depth
        FROM content_views
        ${whereClause}
      `;

      const analyticsResult = await client.query(analyticsQuery, values);
      const analytics = analyticsResult.rows[0];

      // Get post engagement
      const postResult = await client.query(
        'SELECT views_count, likes_count, shares_count FROM content_posts WHERE id = $1',
        [postId]
      );
      const post = postResult.rows[0];

      // Get comments count
      const commentsResult = await client.query(
        'SELECT COUNT(*) as total_comments FROM content_comments WHERE post_id = $1 AND status = \'approved\'',
        [postId]
      );
      const comments = commentsResult.rows[0];

      return {
        post_id: postId,
        total_views: parseInt(analytics.total_views || 0),
        unique_views: parseInt(analytics.unique_views || 0),
        total_comments: parseInt(comments.total_comments || 0),
        total_likes: post?.likes_count || 0,
        total_shares: post?.shares_count || 0,
        avg_time_on_page: parseFloat(analytics.avg_time_on_page || 0),
        avg_scroll_depth: parseFloat(analytics.avg_scroll_depth || 0),
        bounce_rate: 0, // Calculate separately if needed
        views_by_date: [], // Implement separately if needed
        top_referrers: [], // Implement separately if needed
        device_breakdown: { desktop: 0, mobile: 0, tablet: 0 }, // Implement separately
        geographic_data: [], // Implement separately
      };
    } finally {
      client.release();
    }
  }

  async getPopularPosts(limit = 10, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<ContentPost[]> {
    const client = await this.pool.connect();
    try {
      let interval = '7 days';
      if (timeframe === 'day') interval = '1 day';
      if (timeframe === 'month') interval = '30 days';

      const query = `
        SELECT p.*, COUNT(v.id) as view_count
        FROM content_posts p
        LEFT JOIN content_views v ON p.id = v.post_id 
          AND v.viewed_at >= NOW() - INTERVAL '${interval}'
        WHERE p.status = 'published'
        GROUP BY p.id
        ORDER BY view_count DESC, p.views_count DESC
        LIMIT $1
      `;

      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // SEO operations
  async getSeoSettings(): Promise<ContentSeoSettings | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM content_seo_settings LIMIT 1');
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateSeoSettings(data: Partial<ContentSeoSettings>): Promise<ContentSeoSettings> {
    const client = await this.pool.connect();
    try {
      // Check if settings exist
      const existing = await this.getSeoSettings();
      
      if (existing) {
        // Update existing
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'id' && value !== undefined) {
            updates.push(`${key} = $${++paramCount}`);
            values.push(value);
          }
        });

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(existing.id);

        const updateQuery = `
          UPDATE content_seo_settings 
          SET ${updates.join(', ')}
          WHERE id = $${++paramCount}
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);
        return result.rows[0];
      } else {
        // Create new
        const query = `
          INSERT INTO content_seo_settings (
            site_title, site_description, site_keywords, default_meta_title_template,
            default_meta_description_template, default_meta_robots, default_og_type,
            default_og_image, default_twitter_card, google_analytics_id,
            google_tag_manager_id, facebook_pixel_id, sitemap_enabled,
            sitemap_include_images, sitemap_change_frequency, sitemap_priority,
            robots_txt_content, organization_name, organization_logo,
            organization_url, breadcrumbs_enabled, breadcrumbs_separator
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          RETURNING *
        `;
        
        const values = [
          data.site_title,
          data.site_description,
          data.site_keywords,
          data.default_meta_title_template,
          data.default_meta_description_template,
          data.default_meta_robots || 'index, follow',
          data.default_og_type || 'website',
          data.default_og_image,
          data.default_twitter_card || 'summary_large_image',
          data.google_analytics_id,
          data.google_tag_manager_id,
          data.facebook_pixel_id,
          data.sitemap_enabled ?? true,
          data.sitemap_include_images ?? true,
          data.sitemap_change_frequency || 'weekly',
          data.sitemap_priority || 0.8,
          data.robots_txt_content,
          data.organization_name,
          data.organization_logo,
          data.organization_url,
          data.breadcrumbs_enabled ?? true,
          data.breadcrumbs_separator || ' > ',
        ];

        const result = await client.query(query, values);
        return result.rows[0];
      }
    } finally {
      client.release();
    }
  }

  // Menu operations
  async createMenuItem(data: Partial<ContentMenuItem>): Promise<ContentMenuItem> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_menu_items (
          menu_location, title, url, target, css_classes, linked_post_id,
          parent_id, sort_order, is_active, visibility_rules, description,
          icon, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        data.menu_location,
        data.title,
        data.url,
        data.target || '_self',
        data.css_classes,
        data.linked_post_id,
        data.parent_id,
        data.sort_order || 0,
        data.is_active ?? true,
        data.visibility_rules ? JSON.stringify(data.visibility_rules) : null,
        data.description,
        data.icon,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateMenuItem(id: number, data: Partial<ContentMenuItem>): Promise<ContentMenuItem> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          updates.push(`${key} = $${++paramCount}`);
          if (key === 'visibility_rules' || key === 'metadata') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE content_menu_items 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error('Menu item not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('DELETE FROM content_menu_items WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getMenuItems(location: string): Promise<ContentMenuItem[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT m.*, p.title as linked_post_title, p.slug as linked_post_slug
        FROM content_menu_items m
        LEFT JOIN content_posts p ON m.linked_post_id = p.id
        WHERE m.menu_location = $1 AND m.is_active = true
        ORDER BY m.sort_order, m.title
      `, [location]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string, client: any): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const result = await client.query('SELECT id FROM content_posts WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }
}