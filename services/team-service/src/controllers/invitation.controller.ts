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
  AcceptInvitationRequest,
  ILogger 
} from '../interfaces';


export class InvitationController {
  private teamService: ITeamService;
  private logger: ILogger;

  constructor(teamService: ITeamService, logger: ILogger) {
    this.teamService = teamService;
    this.logger = logger;
  }

  // POST /invitations/accept
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

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

      const { token }: AcceptInvitationRequest = req.body;

      // Validation
      if (!token || !token.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invitation token is required'
          }
        });
        return;
      }

      const result = await this.teamService.acceptInvitation(userId, token.trim());

      if (result.success) {
        this.logger.info('Invitation accepted via API', {
          userId,
          token: token.substring(0, 8) + '...' // Log partial token for security
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
            message: result.error?.message || 'Failed to accept invitation'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in acceptInvitation controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // GET /organizations/:organizationId/invitations
  async getPendingInvitations(req: Request, res: Response): Promise<void> {
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

      const result = await this.teamService.getPendingInvitations(organizationId, userId);

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to get pending invitations'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in getPendingInvitations controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // DELETE /organizations/:organizationId/invitations/:invitationId
  async cancelInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;
      const invitationId = req.params.invitationId;

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

      if (!organizationId || !invitationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization ID and Invitation ID are required'
          }
        });
        return;
      }

      const result = await this.teamService.cancelInvitation(organizationId, userId, invitationId);

      if (result.success) {
        this.logger.info('Invitation cancelled via API', {
          organizationId,
          invitationId,
          cancelledBy: userId
        });

        res.status(204).send();
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to cancel invitation'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in cancelInvitation controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // POST /organizations/:organizationId/invitations/:invitationId/resend
  async resendInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;
      const invitationId = req.params.invitationId;

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

      if (!organizationId || !invitationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization ID and Invitation ID are required'
          }
        });
        return;
      }

      const result = await this.teamService.resendInvitation(organizationId, userId, invitationId);

      if (result.success) {
        this.logger.info('Invitation resent via API', {
          organizationId,
          invitationId,
          resentBy: userId
        });

        res.json({
          success: true,
          message: 'Invitation resent successfully'
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to resend invitation'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in resendInvitation controller', { error: error.message });
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