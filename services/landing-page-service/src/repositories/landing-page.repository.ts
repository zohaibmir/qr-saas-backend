import { Pool, PoolClient } from 'pg';
import { 
  ILandingPageRepository,
  LandingPage,
  LandingPageTemplate,
  QueryOptions,
  DatabaseError,
  NotFoundError,
  ILogger 
} from '../interfaces';

export class LandingPageRepository implements ILandingPageRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  // Template Methods
  async findAllTemplates(): Promise<LandingPageTemplate[]> {
    try {
      this.logger.info('Fetching all landing page templates');
      
      const query = `
        SELECT * FROM landing_page_templates
        WHERE is_active = true
        ORDER BY usage_count DESC, created_at DESC
      `;
      
      const result = await this.db.query(query);
      const templates = result.rows.map(this.mapRowToTemplate);
      
      this.logger.info('Successfully fetched templates', { count: templates.length });
      return templates;
      
    } catch (error) {
      this.logger.error('Failed to fetch templates', error);
      throw new DatabaseError('Failed to fetch landing page templates', error);
    }
  }

  async findTemplateById(templateId: string): Promise<LandingPageTemplate | null> {
    try {
      this.logger.info('Fetching template by ID', { templateId });
      
      const query = `
        SELECT * FROM landing_page_templates
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.db.query(query, [templateId]);
      
      if (result.rows.length === 0) {
        this.logger.warn('Template not found', { templateId });
        return null;
      }
      
      const template = this.mapRowToTemplate(result.rows[0]);
      this.logger.info('Successfully fetched template', { templateId, name: template.name });
      return template;
      
    } catch (error) {
      this.logger.error('Failed to fetch template by ID', { templateId, error });
      throw new DatabaseError('Failed to fetch template', error);
    }
  }

  async findTemplatesByType(templateType: string): Promise<LandingPageTemplate[]> {
    try {
      this.logger.info('Fetching templates by type', { templateType });
      
      const query = `
        SELECT * FROM landing_page_templates
        WHERE template_type = $1 AND is_active = true
        ORDER BY usage_count DESC, created_at DESC
      `;
      
      const result = await this.db.query(query, [templateType]);
      const templates = result.rows.map(this.mapRowToTemplate);
      
      this.logger.info('Successfully fetched templates by type', { 
        templateType, 
        count: templates.length 
      });
      return templates;
      
    } catch (error) {
      this.logger.error('Failed to fetch templates by type', { templateType, error });
      throw new DatabaseError('Failed to fetch templates by type', error);
    }
  }

  // Landing Page Methods
  async create(pageData: any): Promise<LandingPage> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Creating landing page', { 
        userId: pageData.userId,
        title: pageData.title,
        slug: pageData.slug
      });

      const query = `
        INSERT INTO landing_pages (
          id, user_id, qr_code_id, template_id, slug, title, description,
          content, styles, seo_config, custom_domain, is_published,
          is_mobile_optimized, password_protected, password_hash,
          expires_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      const values = [
        pageData.id || require('crypto').randomUUID(),
        pageData.userId,
        pageData.qrCodeId || null,
        pageData.templateId || null,
        pageData.slug,
        pageData.title,
        pageData.description || null,
        JSON.stringify(pageData.content || {}),
        JSON.stringify(pageData.styles || {}),
        JSON.stringify(pageData.seoConfig || {}),
        pageData.customDomain || null,
        pageData.isPublished || false,
        pageData.isMobileOptimized !== false,
        pageData.passwordProtected || false,
        pageData.passwordHash || null,
        pageData.expiresAt || null,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const landingPage = this.mapRowToLandingPage(result.rows[0]);
      
      this.logger.info('Successfully created landing page', { 
        landingPageId: landingPage.id,
        userId: landingPage.userId,
        slug: landingPage.slug
      });

      return landingPage;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create landing page', { 
        userId: pageData.userId,
        error 
      });
      throw new DatabaseError('Failed to create landing page', error);
    } finally {
      client.release();
    }
  }

  async findById(pageId: string): Promise<LandingPage | null> {
    try {
      this.logger.info('Fetching landing page by ID', { pageId });
      
      const query = `
        SELECT * FROM landing_pages
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [pageId]);
      
      if (result.rows.length === 0) {
        this.logger.warn('Landing page not found', { pageId });
        return null;
      }
      
      const landingPage = this.mapRowToLandingPage(result.rows[0]);
      this.logger.info('Successfully fetched landing page', { 
        pageId, 
        slug: landingPage.slug,
        title: landingPage.title
      });
      return landingPage;
      
    } catch (error) {
      this.logger.error('Failed to fetch landing page by ID', { pageId, error });
      throw new DatabaseError('Failed to fetch landing page', error);
    }
  }

  async findBySlug(slug: string): Promise<LandingPage | null> {
    try {
      this.logger.info('Fetching landing page by slug', { slug });
      
      const query = `
        SELECT * FROM landing_pages
        WHERE slug = $1 AND is_published = true
        AND (expires_at IS NULL OR expires_at > NOW())
      `;
      
      const result = await this.db.query(query, [slug]);
      
      if (result.rows.length === 0) {
        this.logger.warn('Published landing page not found by slug', { slug });
        return null;
      }
      
      const landingPage = this.mapRowToLandingPage(result.rows[0]);
      this.logger.info('Successfully fetched landing page by slug', { 
        slug, 
        pageId: landingPage.id,
        title: landingPage.title
      });
      return landingPage;
      
    } catch (error) {
      this.logger.error('Failed to fetch landing page by slug', { slug, error });
      throw new DatabaseError('Failed to fetch landing page by slug', error);
    }
  }

  async findByUserId(userId: string, options?: QueryOptions): Promise<LandingPage[]> {
    try {
      this.logger.info('Fetching landing pages by user ID', { userId, options });
      
      const limit = Math.min(options?.limit || 20, 100);
      const offset = options?.offset || 0;
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      
      const query = `
        SELECT * FROM landing_pages
        WHERE user_id = $1
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [userId, limit, offset]);
      const landingPages = result.rows.map(this.mapRowToLandingPage);
      
      this.logger.info('Successfully fetched user landing pages', { 
        userId, 
        count: landingPages.length,
        limit,
        offset
      });
      return landingPages;
      
    } catch (error) {
      this.logger.error('Failed to fetch user landing pages', { userId, error });
      throw new DatabaseError('Failed to fetch user landing pages', error);
    }
  }

  async findByQRCodeId(qrCodeId: string): Promise<LandingPage[]> {
    try {
      this.logger.info('Fetching landing pages by QR code ID', { qrCodeId });
      
      const query = `
        SELECT * FROM landing_pages
        WHERE qr_code_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      const landingPages = result.rows.map(this.mapRowToLandingPage);
      
      this.logger.info('Successfully fetched QR code landing pages', { 
        qrCodeId, 
        count: landingPages.length
      });
      return landingPages;
      
    } catch (error) {
      this.logger.error('Failed to fetch QR code landing pages', { qrCodeId, error });
      throw new DatabaseError('Failed to fetch QR code landing pages', error);
    }
  }

  async update(pageId: string, pageData: any): Promise<LandingPage> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Updating landing page', { pageId, updates: Object.keys(pageData) });

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (pageData.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(pageData.title);
      }
      if (pageData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(pageData.description);
      }
      if (pageData.content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        values.push(JSON.stringify(pageData.content));
      }
      if (pageData.styles !== undefined) {
        updateFields.push(`styles = $${paramIndex++}`);
        values.push(JSON.stringify(pageData.styles));
      }
      if (pageData.seoConfig !== undefined) {
        updateFields.push(`seo_config = $${paramIndex++}`);
        values.push(JSON.stringify(pageData.seoConfig));
      }
      if (pageData.isPublished !== undefined) {
        updateFields.push(`is_published = $${paramIndex++}`);
        values.push(pageData.isPublished);
        if (pageData.isPublished && !pageData.publishedAt) {
          updateFields.push(`published_at = $${paramIndex++}`);
          values.push(new Date());
        }
      }
      if (pageData.passwordProtected !== undefined) {
        updateFields.push(`password_protected = $${paramIndex++}`);
        values.push(pageData.passwordProtected);
      }
      if (pageData.passwordHash !== undefined) {
        updateFields.push(`password_hash = $${paramIndex++}`);
        values.push(pageData.passwordHash);
      }
      if (pageData.expiresAt !== undefined) {
        updateFields.push(`expires_at = $${paramIndex++}`);
        values.push(pageData.expiresAt);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(pageId);

      const query = `
        UPDATE landing_pages 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Landing page not found');
      }

      await client.query('COMMIT');
      
      const updatedPage = this.mapRowToLandingPage(result.rows[0]);
      
      this.logger.info('Successfully updated landing page', { 
        pageId,
        title: updatedPage.title,
        isPublished: updatedPage.isPublished
      });

      return updatedPage;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to update landing page', { pageId, error });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update landing page', error);
    } finally {
      client.release();
    }
  }

  async delete(pageId: string): Promise<boolean> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Deleting landing page', { pageId });

      // Delete related analytics first
      await client.query('DELETE FROM landing_page_analytics WHERE landing_page_id = $1', [pageId]);
      
      // Delete related form submissions
      await client.query(`
        DELETE FROM landing_page_form_submissions 
        WHERE form_id IN (
          SELECT id FROM landing_page_forms WHERE landing_page_id = $1
        )
      `, [pageId]);
      
      // Delete related forms
      await client.query('DELETE FROM landing_page_forms WHERE landing_page_id = $1', [pageId]);
      
      // Delete A/B tests
      await client.query(`
        DELETE FROM landing_page_ab_tests 
        WHERE variant_a_page_id = $1 OR variant_b_page_id = $1
      `, [pageId]);
      
      // Delete social sharing configs
      await client.query('DELETE FROM landing_page_social_sharing WHERE landing_page_id = $1', [pageId]);
      
      // Finally delete the landing page
      const result = await client.query('DELETE FROM landing_pages WHERE id = $1', [pageId]);
      
      await client.query('COMMIT');
      
      const deleted = (result.rowCount || 0) > 0;
      
      this.logger.info('Landing page deletion completed', { pageId, deleted });
      return deleted;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to delete landing page', { pageId, error });
      throw new DatabaseError('Failed to delete landing page', error);
    } finally {
      client.release();
    }
  }

  async incrementViewCount(pageId: string): Promise<void> {
    try {
      this.logger.debug('Incrementing view count', { pageId });
      
      const query = `
        UPDATE landing_pages 
        SET view_count = view_count + 1, last_viewed_at = NOW()
        WHERE id = $1
      `;
      
      await this.db.query(query, [pageId]);
      
      this.logger.debug('Successfully incremented view count', { pageId });
      
    } catch (error) {
      this.logger.error('Failed to increment view count', { pageId, error });
      throw new DatabaseError('Failed to increment view count', error);
    }
  }

  async incrementConversionCount(pageId: string): Promise<void> {
    try {
      this.logger.debug('Incrementing conversion count', { pageId });
      
      const query = `
        UPDATE landing_pages 
        SET conversion_count = conversion_count + 1
        WHERE id = $1
      `;
      
      await this.db.query(query, [pageId]);
      
      this.logger.debug('Successfully incremented conversion count', { pageId });
      
    } catch (error) {
      this.logger.error('Failed to increment conversion count', { pageId, error });
      throw new DatabaseError('Failed to increment conversion count', error);
    }
  }

  // Private mapping methods
  private mapRowToTemplate(row: any): LandingPageTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      layoutConfig: JSON.parse(row.layout_config || '{}'),
      defaultStyles: JSON.parse(row.default_styles || '{}'),
      componentConfig: JSON.parse(row.component_config || '{}'),
      isPremium: row.is_premium,
      isActive: row.is_active,
      previewImageUrl: row.preview_image_url,
      usageCount: row.usage_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToLandingPage(row: any): LandingPage {
    return {
      id: row.id,
      userId: row.user_id,
      qrCodeId: row.qr_code_id,
      templateId: row.template_id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      content: JSON.parse(row.content || '{}'),
      styles: JSON.parse(row.styles || '{}'),
      seoConfig: JSON.parse(row.seo_config || '{}'),
      customDomain: row.custom_domain,
      isPublished: row.is_published,
      isMobileOptimized: row.is_mobile_optimized,
      passwordProtected: row.password_protected,
      viewCount: row.view_count,
      conversionCount: row.conversion_count,
      lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}