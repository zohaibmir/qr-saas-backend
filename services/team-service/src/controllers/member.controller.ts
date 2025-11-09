import { Request, Response } from 'express';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}
import { 
  ITeamService, 
  InviteMemberRequest, 
  UpdateMemberRoleRequest,
  PaginationOptions,
  ILogger 
} from '../interfaces';


export class MemberController {
  private teamService: ITeamService;
  private logger: ILogger;

  constructor(teamService: ITeamService, logger: ILogger) {
    this.teamService = teamService;
    this.logger = logger;
  }

  // POST /organizations/:organizationId/members/invite
  async inviteMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization ID is required'
          }
        });
        return;
      }

      const { email, role }: InviteMemberRequest = req.body;

      // Validation
      if (!email || !email.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required'
          }
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format'
          }
        });
        return;
      }

      if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role must be one of: admin, editor, viewer'
          }
        });
        return;
      }

      const invitationData: InviteMemberRequest = {
        email: email.trim().toLowerCase(),
        role
      };

      const result = await this.teamService.inviteMember(organizationId, userId, invitationData);

      if (result.success) {
        this.logger.info('Member invited via API', {
          organizationId,
          invitedBy: userId,
          email: invitationData.email,
          role
        });

        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to invite member'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in inviteMember controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // GET /organizations/:organizationId/members
  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization ID is required'
          }
        });
        return;
      }

      // Parse pagination options
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 per page
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

      const pagination: PaginationOptions = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      const result = await this.teamService.getMembers(organizationId, userId, pagination);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          meta: result.meta
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to get members'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in getMembers controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // PUT /organizations/:organizationId/members/:memberId
  async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;
      const memberId = req.params.memberId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!organizationId || !memberId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization ID and Member ID are required'
          }
        });
        return;
      }

      const { role, permissions }: UpdateMemberRoleRequest = req.body;

      // Validation
      if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role must be one of: admin, editor, viewer'
          }
        });
        return;
      }

      const updateData: UpdateMemberRoleRequest = {
        role,
        ...(permissions && { permissions })
      };

      const result = await this.teamService.updateMemberRole(organizationId, userId, memberId, updateData);

      if (result.success) {
        this.logger.info('Member role updated via API', {
          organizationId,
          memberId,
          updatedBy: userId,
          newRole: role
        });

        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to update member role'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in updateMemberRole controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // DELETE /organizations/:organizationId/members/:memberId
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;
      const memberId = req.params.memberId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!organizationId || !memberId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization ID and Member ID are required'
          }
        });
        return;
      }

      const result = await this.teamService.removeMember(organizationId, userId, memberId);

      if (result.success) {
        this.logger.info('Member removed via API', {
          organizationId,
          memberId,
          removedBy: userId
        });

        res.status(204).send();
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to remove member'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in removeMember controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }
}