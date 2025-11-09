import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import {
  IInvitationRepository,
  OrganizationInvitation,
  TeamRole,
  NotFoundError,
  ConflictError,
  ILogger
} from '../interfaces';

export class InvitationRepository implements IInvitationRepository {
  private pool: Pool;
  private logger: ILogger;

  constructor(pool: Pool, logger: ILogger) {
    this.pool = pool;
    this.logger = logger;
  }

  async create(data: {
    organizationId: string;
    email: string;
    role: TeamRole;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<OrganizationInvitation> {
    // Generate a secure token
    const token = this.generateToken();
    
    const query = `
      INSERT INTO organization_invitations (
        organization_id, email, role, invited_by, token, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        organization_id as "organizationId",
        email,
        role,
        invited_by as "invitedBy",
        token,
        expires_at as "expiresAt",
        accepted_at as "acceptedAt",
        accepted_by as "acceptedBy",
        created_at as "createdAt"
    `;

    const values = [
      data.organizationId,
      data.email.toLowerCase(),
      data.role,
      data.invitedBy,
      token,
      data.expiresAt
    ];

    try {
      const result = await this.pool.query(query, values);
      const invitation = result.rows[0];
      
      this.logger.info('Organization invitation created successfully', {
        invitationId: invitation.id,
        organizationId: data.organizationId,
        email: data.email,
        role: data.role,
        invitedBy: data.invitedBy
      });
      
      return invitation;
    } catch (error: any) {
      this.logger.error('Failed to create organization invitation', {
        data,
        error: error.message
      });
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.constraint === 'organization_invitations_organization_id_email_key') {
          throw new ConflictError('An invitation has already been sent to this email for this organization');
        }
      }
      
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationInvitation | null> {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        email,
        role,
        invited_by as "invitedBy",
        token,
        expires_at as "expiresAt",
        accepted_at as "acceptedAt",
        accepted_by as "acceptedBy",
        created_at as "createdAt"
      FROM organization_invitations 
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error: any) {
      this.logger.error('Failed to find invitation by ID', {
        invitationId: id,
        error: error.message
      });
      throw error;
    }
  }

  async findByToken(token: string): Promise<OrganizationInvitation | null> {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        email,
        role,
        invited_by as "invitedBy",
        token,
        expires_at as "expiresAt",
        accepted_at as "acceptedAt",
        accepted_by as "acceptedBy",
        created_at as "createdAt"
      FROM organization_invitations 
      WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
    `;

    try {
      const result = await this.pool.query(query, [token]);
      return result.rows[0] || null;
    } catch (error: any) {
      this.logger.error('Failed to find invitation by token', {
        error: error.message
      });
      throw error;
    }
  }

  async findByOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        email,
        role,
        invited_by as "invitedBy",
        token,
        expires_at as "expiresAt",
        accepted_at as "acceptedAt",
        accepted_by as "acceptedBy",
        created_at as "createdAt"
      FROM organization_invitations 
      WHERE organization_id = $1 AND accepted_at IS NULL
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [organizationId]);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to find invitations by organization', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<OrganizationInvitation[]> {
    const query = `
      SELECT 
        oi.id,
        oi.organization_id as "organizationId",
        oi.email,
        oi.role,
        oi.invited_by as "invitedBy",
        oi.token,
        oi.expires_at as "expiresAt",
        oi.accepted_at as "acceptedAt",
        oi.accepted_by as "acceptedBy",
        oi.created_at as "createdAt",
        o.name as organization_name,
        o.slug as organization_slug
      FROM organization_invitations oi
      INNER JOIN organizations o ON oi.organization_id = o.id
      WHERE oi.email = $1 AND oi.accepted_at IS NULL AND oi.expires_at > NOW()
      ORDER BY oi.created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [email.toLowerCase()]);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to find invitations by email', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  async accept(id: string, userId: string): Promise<OrganizationInvitation> {
    const query = `
      UPDATE organization_invitations 
      SET 
        accepted_at = NOW(),
        accepted_by = $2
      WHERE id = $1 AND accepted_at IS NULL AND expires_at > NOW()
      RETURNING 
        id,
        organization_id as "organizationId",
        email,
        role,
        invited_by as "invitedBy",
        token,
        expires_at as "expiresAt",
        accepted_at as "acceptedAt",
        accepted_by as "acceptedBy",
        created_at as "createdAt"
    `;

    try {
      const result = await this.pool.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Invitation not found or already accepted/expired');
      }

      const invitation = result.rows[0];
      
      this.logger.info('Invitation accepted successfully', {
        invitationId: id,
        acceptedBy: userId,
        organizationId: invitation.organizationId
      });
      
      return invitation;
    } catch (error: any) {
      this.logger.error('Failed to accept invitation', {
        invitationId: id,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM organization_invitations WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Invitation not found');
      }

      this.logger.info('Invitation deleted successfully', {
        invitationId: id
      });
    } catch (error: any) {
      this.logger.error('Failed to delete invitation', {
        invitationId: id,
        error: error.message
      });
      throw error;
    }
  }

  async cleanupExpired(): Promise<number> {
    const query = `
      DELETE FROM organization_invitations 
      WHERE expires_at < NOW() AND accepted_at IS NULL
    `;

    try {
      const result = await this.pool.query(query);
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        this.logger.info('Expired invitations cleaned up', {
          deletedCount
        });
      }
      
      return deletedCount;
    } catch (error: any) {
      this.logger.error('Failed to cleanup expired invitations', {
        error: error.message
      });
      throw error;
    }
  }

  private generateToken(): string {
    // Generate a secure 32-byte token and encode as hex
    return randomBytes(32).toString('hex');
  }
}