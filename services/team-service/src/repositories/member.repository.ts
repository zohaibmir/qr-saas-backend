import { Pool } from 'pg';
import {
  IMemberRepository,
  OrganizationMember,
  MemberWithUserInfo,
  TeamRole,
  PaginationOptions,
  NotFoundError,
  ConflictError,
  ILogger
} from '../interfaces';

export class MemberRepository implements IMemberRepository {
  private pool: Pool;
  private logger: ILogger;

  constructor(pool: Pool, logger: ILogger) {
    this.pool = pool;
    this.logger = logger;
  }

  async create(data: {
    organizationId: string;
    userId: string;
    role: TeamRole;
    invitedBy?: string;
    status?: 'pending' | 'active';
  }): Promise<OrganizationMember> {
    const query = `
      INSERT INTO organization_members (
        organization_id, user_id, role, permissions, invited_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        organization_id as "organizationId",
        user_id as "userId",
        role,
        permissions,
        invited_by as "invitedBy",
        invited_at as "invitedAt",
        accepted_at as "acceptedAt",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const defaultPermissions = this.getDefaultPermissions(data.role);
    const values = [
      data.organizationId,
      data.userId,
      data.role,
      JSON.stringify(defaultPermissions),
      data.invitedBy || null,
      data.status || 'active'
    ];

    try {
      const result = await this.pool.query(query, values);
      const member = result.rows[0];
      
      this.logger.info('Organization member created successfully', {
        memberId: member.id,
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role
      });
      
      return member;
    } catch (error: any) {
      this.logger.error('Failed to create organization member', {
        data,
        error: error.message
      });
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.constraint === 'organization_members_organization_id_user_id_key') {
          throw new ConflictError('User is already a member of this organization');
        }
      }
      
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationMember | null> {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        user_id as "userId",
        role,
        permissions,
        invited_by as "invitedBy",
        invited_at as "invitedAt",
        accepted_at as "acceptedAt",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM organization_members 
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      this.logger.error('Failed to find member by ID', {
        memberId: id,
        error: error.message
      });
      throw error;
    }
  }

  async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMember | null> {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        user_id as "userId",
        role,
        permissions,
        invited_by as "invitedBy",
        invited_at as "invitedAt",
        accepted_at as "acceptedAt",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM organization_members 
      WHERE user_id = $1 AND organization_id = $2
    `;

    try {
      const result = await this.pool.query(query, [userId, organizationId]);
      return result.rows[0] || null;
    } catch (error: any) {
      this.logger.error('Failed to find member by user and organization', {
        userId,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  async findByOrganization(organizationId: string, pagination: PaginationOptions): Promise<{ members: MemberWithUserInfo[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = pagination.sortBy || 'created_at';
    const orderDirection = pagination.sortOrder || 'desc';

    const query = `
      SELECT 
        om.id,
        om.organization_id as "organizationId",
        om.user_id as "userId",
        om.role,
        om.permissions,
        om.invited_by as "invitedBy",
        om.invited_at as "invitedAt",
        om.accepted_at as "acceptedAt",
        om.status,
        om.created_at as "createdAt",
        om.updated_at as "updatedAt",
        jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'fullName', u.full_name,
          'avatarUrl', u.avatar_url
        ) as user
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1
      ORDER BY om.${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM organization_members
      WHERE organization_id = $1
    `;

    try {
      const [membersResult, countResult] = await Promise.all([
        this.pool.query(query, [organizationId, pagination.limit, offset]),
        this.pool.query(countQuery, [organizationId])
      ]);

      return {
        members: membersResult.rows,
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error: any) {
      this.logger.error('Failed to find members by organization', {
        organizationId,
        pagination,
        error: error.message
      });
      throw error;
    }
  }

  async updateRole(id: string, role: TeamRole, permissions?: Record<string, any>): Promise<OrganizationMember> {
    const finalPermissions = permissions || this.getDefaultPermissions(role);
    
    const query = `
      UPDATE organization_members 
      SET 
        role = $2,
        permissions = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        organization_id as "organizationId",
        user_id as "userId",
        role,
        permissions,
        invited_by as "invitedBy",
        invited_at as "invitedAt",
        accepted_at as "acceptedAt",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await this.pool.query(query, [id, role, JSON.stringify(finalPermissions)]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Member not found');
      }

      const member = result.rows[0];
      
      this.logger.info('Member role updated successfully', {
        memberId: id,
        role,
        permissions: finalPermissions
      });
      
      return member;
    } catch (error: any) {
      this.logger.error('Failed to update member role', {
        memberId: id,
        role,
        permissions,
        error: error.message
      });
      throw error;
    }
  }

  async updateStatus(id: string, status: 'active' | 'suspended'): Promise<OrganizationMember> {
    const query = `
      UPDATE organization_members 
      SET 
        status = $2,
        ${status === 'active' ? 'accepted_at = NOW(),' : ''}
        updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        organization_id as "organizationId",
        user_id as "userId",
        role,
        permissions,
        invited_by as "invitedBy",
        invited_at as "invitedAt",
        accepted_at as "acceptedAt",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await this.pool.query(query, [id, status]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Member not found');
      }

      const member = result.rows[0];
      
      this.logger.info('Member status updated successfully', {
        memberId: id,
        status
      });
      
      return member;
    } catch (error: any) {
      this.logger.error('Failed to update member status', {
        memberId: id,
        status,
        error: error.message
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM organization_members WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Member not found');
      }

      this.logger.info('Member deleted successfully', {
        memberId: id
      });
    } catch (error: any) {
      this.logger.error('Failed to delete member', {
        memberId: id,
        error: error.message
      });
      throw error;
    }
  }

  private getDefaultPermissions(role: TeamRole): Record<string, any> {
    const permissions = {
      organization: {
        read: false,
        update: false,
        delete: false,
        invite_members: false,
        manage_roles: false,
        manage_billing: false,
      },
      qr_codes: {
        create: false,
        read: false,
        update: false,
        delete: false,
        bulk_operations: false,
        share_with_team: false,
      },
      analytics: {
        view_all: false,
        view_own: false,
        export: false,
      },
    };

    switch (role) {
      case 'owner':
        // Owner has full permissions
        permissions.organization = {
          read: true,
          update: true,
          delete: true,
          invite_members: true,
          manage_roles: true,
          manage_billing: true,
        };
        permissions.qr_codes = {
          create: true,
          read: true,
          update: true,
          delete: true,
          bulk_operations: true,
          share_with_team: true,
        };
        permissions.analytics = {
          view_all: true,
          view_own: true,
          export: true,
        };
        break;

      case 'admin':
        permissions.organization = {
          read: true,
          update: true,
          delete: false,
          invite_members: true,
          manage_roles: true,
          manage_billing: false,
        };
        permissions.qr_codes = {
          create: true,
          read: true,
          update: true,
          delete: true,
          bulk_operations: true,
          share_with_team: true,
        };
        permissions.analytics = {
          view_all: true,
          view_own: true,
          export: true,
        };
        break;

      case 'editor':
        permissions.organization = {
          read: true,
          update: false,
          delete: false,
          invite_members: false,
          manage_roles: false,
          manage_billing: false,
        };
        permissions.qr_codes = {
          create: true,
          read: true,
          update: true,
          delete: false,
          bulk_operations: false,
          share_with_team: true,
        };
        permissions.analytics = {
          view_all: false,
          view_own: true,
          export: false,
        };
        break;

      case 'viewer':
        permissions.organization = {
          read: true,
          update: false,
          delete: false,
          invite_members: false,
          manage_roles: false,
          manage_billing: false,
        };
        permissions.qr_codes = {
          create: false,
          read: true,
          update: false,
          delete: false,
          bulk_operations: false,
          share_with_team: false,
        };
        permissions.analytics = {
          view_all: false,
          view_own: false,
          export: false,
        };
        break;
    }

    return permissions;
  }
}