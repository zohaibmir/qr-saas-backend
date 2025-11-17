/**
 * File Controller - Clean Architecture
 * Following User Service Pattern with Static Methods
 * 
 * Handles HTTP concerns and delegates to use cases/services
 * Uses Authentication System v2.0 context from req.auth
 */

import { Request, Response, NextFunction } from 'express';

/**
 * File Controller - Handles HTTP requests for file operations
 * Uses static methods following user-service pattern
 */
export class FileController {
  /**
   * Upload a file
   */
  static async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, file } = req as any;
      
      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_MISSING',
            message: 'No file provided',
            statusCode: 400
          }
        });
        return;
      }

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      // Validate file size against subscription tier limits
      const storageLimit = FileController.getStorageLimit(auth.subscriptionTier);
      if (storageLimit !== -1 && file.size > storageLimit) {
        res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds ${auth.subscriptionTier} tier limit of ${Math.round(storageLimit / 1024 / 1024)}MB`,
            statusCode: 413,
            details: {
              fileSize: file.size,
              limit: storageLimit,
              subscriptionTier: auth.subscriptionTier
            }
          }
        });
        return;
      }

      // Check file type permissions based on subscription tier
      if (!FileController.isFileTypeAllowed(file.mimetype, auth.subscriptionTier)) {
        res.status(415).json({
          success: false,
          error: {
            code: 'FILE_TYPE_NOT_ALLOWED',
            message: `File type ${file.mimetype} not allowed for ${auth.subscriptionTier} tier`,
            statusCode: 415,
            details: {
              mimeType: file.mimetype,
              subscriptionTier: auth.subscriptionTier
            }
          }
        });
        return;
      }

      console.log('File upload initiated', {
        userId: auth.userId,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        subscriptionTier: auth.subscriptionTier
      });

      // TODO: Implement actual file storage and database record creation
      
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: `file_${Date.now()}`,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
          userId: auth.userId,
          subscriptionTier: auth.subscriptionTier
        }
      });

    } catch (error) {
      console.error('File upload failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId });
      next(error);
    }
  }

  /**
   * Get user's files
   */
  static async getUserFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth } = req as any;

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      console.log('Fetching user files', { userId: auth.userId });

      // TODO: Implement get user files logic
      
      res.status(200).json({
        success: true,
        data: {
          files: [],
          total: 0,
          pagination: {
            page: 1,
            limit: 20,
            totalPages: 0
          }
        }
      });

    } catch (error) {
      console.error('Failed to fetch user files', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId });
      next(error);
    }
  }

  /**
   * Download a file
   */
  static async downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth } = req as any;
      const { fileId } = req.params;

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      console.log('File download requested', { userId: auth.userId, fileId });

      // TODO: Implement file ownership validation
      // const file = await fileService.getFileById(fileId);
      // if (file.userId !== auth.userId) {
      //   return res.status(403).json({
      //     success: false,
      //     error: {
      //       code: 'ACCESS_DENIED',
      //       message: 'You can only access your own files',
      //       statusCode: 403
      //     }
      //   });
      // }
      
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found or access denied',
          statusCode: 404
        }
      });

    } catch (error) {
      console.error('File download failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId, fileId: req.params.fileId });
      next(error);
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth } = req as any;
      const { fileId } = req.params;

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      console.log('File deletion requested', { userId: auth.userId, fileId });

      // TODO: Implement file ownership validation
      // const file = await fileService.getFileById(fileId);
      // if (file.userId !== auth.userId) {
      //   return res.status(403).json({
      //     success: false,
      //     error: {
      //       code: 'ACCESS_DENIED',
      //       message: 'You can only delete your own files',
      //       statusCode: 403
      //     }
      //   });
      // }
      
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found or access denied',
          statusCode: 404
        }
      });

    } catch (error) {
      console.error('File deletion failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId, fileId: req.params.fileId });
      next(error);
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth } = req as any;
      const { fileId } = req.params;

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      console.log('File metadata requested', { userId: auth.userId, fileId });

      // TODO: Implement file metadata retrieval
      
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          statusCode: 404
        }
      });

    } catch (error) {
      console.error('Failed to get file metadata', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId, fileId: req.params.fileId });
      next(error);
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth } = req as any;

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      console.log('Storage stats requested', { userId: auth.userId });

      // TODO: Implement storage stats retrieval
      
      res.status(200).json({
        success: true,
        data: {
          totalFiles: 0,
          totalSize: 0,
          usedStorage: 0,
          storageLimit: FileController.getStorageLimit(auth.subscriptionTier),
          subscriptionTier: auth.subscriptionTier
        }
      });

    } catch (error) {
      console.error('Failed to get storage stats', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId });
      next(error);
    }
  }

  /**
   * Generate presigned URL
   */
  static async generatePresignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth } = req as any;
      const { fileId } = req.params;
      const { operation = 'download', expiresIn = 3600 } = req.body;

      if (!auth) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      console.log('Presigned URL requested', { userId: auth.userId, fileId, operation });

      // TODO: Implement presigned URL generation
      
      res.status(200).json({
        success: true,
        data: {
          url: `https://example.com/files/${fileId}?token=temporary`,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          operation
        }
      });

    } catch (error) {
      console.error('Failed to generate presigned URL', { error: error instanceof Error ? error.message : 'Unknown error', userId: (req as any).auth?.userId, fileId: req.params.fileId });
      next(error);
    }
  }

  /**
   * Get storage limit based on subscription tier
   */
  private static getStorageLimit(subscriptionTier: string): number {
    const limits: Record<string, number> = {
      'free': 10 * 1024 * 1024,        // 10MB
      'starter': 100 * 1024 * 1024,    // 100MB
      'pro': 1 * 1024 * 1024 * 1024,   // 1GB
      'business': 5 * 1024 * 1024 * 1024, // 5GB
      'enterprise': -1                 // Unlimited
    };
    
    return limits[subscriptionTier.toLowerCase()] || limits['free'];
  }

  /**
   * Check if file type is allowed for subscription tier
   */
  private static isFileTypeAllowed(mimeType: string, subscriptionTier: string): boolean {
    const basicTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/pdf'
    ];

    const advancedTypes = [
      ...basicTypes,
      'image/webp',
      'image/svg+xml',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const premiumTypes = [
      ...advancedTypes,
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'application/zip',
      'application/x-rar-compressed'
    ];

    switch (subscriptionTier.toLowerCase()) {
      case 'enterprise':
      case 'business':
        return true; // All file types allowed
      case 'pro':
        return premiumTypes.includes(mimeType);
      case 'starter':
        return advancedTypes.includes(mimeType);
      case 'free':
      default:
        return basicTypes.includes(mimeType);
    }
  }
}