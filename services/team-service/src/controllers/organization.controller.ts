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
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  PaginationOptions,
  ValidationError,
  ILogger 
} from '../interfaces';


export class OrganizationController {
  private teamService: ITeamService;
  private logger: ILogger;

  constructor(teamService: ITeamService, logger: ILogger) {
    this.teamService = teamService;
    this.logger = logger;
  }

  // POST /organizations
  async createOrganization(req: Request, res: Response): Promise<void> {
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

      const { name, description, logoUrl, settings }: CreateOrganizationRequest = req.body;

      // Validation
      if (!name || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization name is required'
          }
        });
        return;
      }

      if (name.length > 255) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organization name must be less than 255 characters'
          }
        });
        return;
      }

      // Generate slug from name
      const slug = this.generateSlugFromName(name);

      const organizationData: CreateOrganizationRequest = {
        name: name.trim(),
        slug,
        ...(description && { description: description.trim() }),
        ...(logoUrl && { logoUrl }),
        settings: settings || {}
      };

      const result = await this.teamService.createOrganization(userId, organizationData);

      if (result.success) {
        this.logger.info('Organization created via API', {
          organizationId: result.data?.id,
          userId,
          name: organizationData.name
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
            message: result.error?.message || 'Failed to create organization'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in createOrganization controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // GET /organizations/:id
  async getOrganization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.id;

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

      const result = await this.teamService.getOrganization(organizationId, userId);

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
            message: result.error?.message || 'Failed to get organization'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in getOrganization controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // PUT /organizations/:id
  async updateOrganization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.id;

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

      const { name, description, logoUrl, settings }: UpdateOrganizationRequest = req.body;

      // Validation
      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Organization name cannot be empty'
            }
          });
          return;
        }

        if (name.length > 255) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Organization name must be less than 255 characters'
            }
          });
          return;
        }
      }

      const updateData: UpdateOrganizationRequest = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (settings !== undefined) updateData.settings = settings;

      const result = await this.teamService.updateOrganization(organizationId, userId, updateData);

      if (result.success) {
        this.logger.info('Organization updated via API', {
          organizationId,
          userId,
          updates: updateData
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
            message: result.error?.message || 'Failed to update organization'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in updateOrganization controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // DELETE /organizations/:id
  async deleteOrganization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.id;

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

      const result = await this.teamService.deleteOrganization(organizationId, userId);

      if (result.success) {
        this.logger.info('Organization deleted via API', {
          organizationId,
          userId
        });

        res.status(204).send();
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: {
            code: result.error?.code || 'INTERNAL_ERROR',
            message: result.error?.message || 'Failed to delete organization'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in deleteOrganization controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  // GET /organizations
  async getUserOrganizations(req: Request, res: Response): Promise<void> {
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

      const result = await this.teamService.getUserOrganizations(userId, pagination);

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
            message: result.error?.message || 'Failed to get organizations'
          }
        });
      }

    } catch (error: any) {
      this.logger.error('Error in getUserOrganizations controller', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'organization';
  }
}