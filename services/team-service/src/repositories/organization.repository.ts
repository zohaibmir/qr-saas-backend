import { Pool } from 'pg';
import { 
  IOrganizationRepository, 
  Organization, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  PaginationOptions,
  NotFoundError,
  ConflictError,
  ILogger
} from '../interfaces';

export class OrganizationRepository implements IOrganizationRepository {
  private pool: Pool;
  private logger: ILogger;

  constructor(pool: Pool, logger: ILogger) {
    this.pool = pool;
    this.logger = logger;
  }

  async create(data: CreateOrganizationRequest & { createdBy: string }): Promise<Organization> {
    const query = `
      INSERT INTO organizations (
        name, slug, description, logo_url, settings, created_by, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        name,
        slug,
        description,
        logo_url as "logoUrl",
        settings,
        subscription_plan_id as "subscriptionPlanId",
        created_by as "createdBy",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.name,
      data.slug,
      data.description || null,
      data.logoUrl || null,
      JSON.stringify(data.settings || {}),
      data.createdBy,
      true
    ];

    try {
      const result = await this.pool.query(query, values);
      const organization = result.rows[0];
      
      this.logger.info('Organization created successfully', {
        organizationId: organization.id,
        slug: organization.slug,
        createdBy: data.createdBy
      });
      
      return organization;
    } catch (error: any) {
      this.logger.error('Failed to create organization', {
        data,
        error: error.message
      });
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.constraint === 'organizations_slug_key') {
          throw new ConflictError(`Organization slug '${data.slug}' already exists`);
        }
      }
      
      throw error;
    }
  }

  async findById(id: string): Promise<Organization | null> {
    const query = `
      SELECT 
        id,
        name,
        slug,
        description,
        logo_url as "logoUrl",
        settings,
        subscription_plan_id as "subscriptionPlanId",
        created_by as "createdBy",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM organizations 
      WHERE id = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      this.logger.error('Failed to find organization by ID', {
        organizationId: id,
        error: error.message
      });
      throw error;
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const query = `
      SELECT 
        id,
        name,
        slug,
        description,
        logo_url as "logoUrl",
        settings,
        subscription_plan_id as "subscriptionPlanId",
        created_by as "createdBy",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM organizations 
      WHERE slug = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error: any) {
      this.logger.error('Failed to find organization by slug', {
        slug,
        error: error.message
      });
      throw error;
    }
  }

  async findByUserId(userId: string, pagination: PaginationOptions): Promise<{ organizations: Organization[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = pagination.sortBy || 'created_at';
    const orderDirection = pagination.sortOrder || 'desc';

    // Query for organizations where user is a member
    const query = `
      SELECT DISTINCT
        o.id,
        o.name,
        o.slug,
        o.description,
        o.logo_url as "logoUrl",
        o.settings,
        o.subscription_plan_id as "subscriptionPlanId",
        o.created_by as "createdBy",
        o.is_active as "isActive",
        o.created_at as "createdAt",
        o.updated_at as "updatedAt"
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1 
        AND o.is_active = true 
        AND om.status = 'active'
      ORDER BY o.${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1 
        AND o.is_active = true 
        AND om.status = 'active'
    `;

    try {
      const [organizationsResult, countResult] = await Promise.all([
        this.pool.query(query, [userId, pagination.limit, offset]),
        this.pool.query(countQuery, [userId])
      ]);

      return {
        organizations: organizationsResult.rows,
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error: any) {
      this.logger.error('Failed to find organizations by user ID', {
        userId,
        pagination,
        error: error.message
      });
      throw error;
    }
  }

  async update(id: string, updates: UpdateOrganizationRequest): Promise<Organization> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCounter++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCounter++}`);
      values.push(updates.description);
    }

    if (updates.logoUrl !== undefined) {
      updateFields.push(`logo_url = $${paramCounter++}`);
      values.push(updates.logoUrl);
    }

    if (updates.settings !== undefined) {
      updateFields.push(`settings = $${paramCounter++}`);
      values.push(JSON.stringify(updates.settings));
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE organizations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter} AND is_active = true
      RETURNING 
        id,
        name,
        slug,
        description,
        logo_url as "logoUrl",
        settings,
        subscription_plan_id as "subscriptionPlanId",
        created_by as "createdBy",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Organization not found');
      }

      const organization = result.rows[0];
      
      this.logger.info('Organization updated successfully', {
        organizationId: id,
        updates
      });
      
      return organization;
    } catch (error: any) {
      this.logger.error('Failed to update organization', {
        organizationId: id,
        updates,
        error: error.message
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const query = `
      UPDATE organizations 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Organization not found');
      }

      this.logger.info('Organization soft deleted successfully', {
        organizationId: id
      });
    } catch (error: any) {
      this.logger.error('Failed to delete organization', {
        organizationId: id,
        error: error.message
      });
      throw error;
    }
  }

  async getStats(organizationId: string): Promise<{
    memberCount: number;
    qrCodeCount: number;
    sharedQrCodeCount: number;
  }> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND status = 'active') as member_count,
        (SELECT COUNT(*) FROM qr_codes qr 
         INNER JOIN organization_members om ON qr.user_id = om.user_id 
         WHERE om.organization_id = $1 AND om.status = 'active') as qr_code_count,
        (SELECT COUNT(*) FROM qr_codes qr 
         INNER JOIN organization_members om ON qr.user_id = om.user_id 
         WHERE om.organization_id = $1 AND om.status = 'active' AND qr.is_shared_with_team = true) as shared_qr_code_count
    `;

    try {
      const result = await this.pool.query(query, [organizationId]);
      const stats = result.rows[0];
      
      return {
        memberCount: parseInt(stats.member_count, 10),
        qrCodeCount: parseInt(stats.qr_code_count, 10),
        sharedQrCodeCount: parseInt(stats.shared_qr_code_count, 10)
      };
    } catch (error: any) {
      this.logger.error('Failed to get organization stats', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }
}