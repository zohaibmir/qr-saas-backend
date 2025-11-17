import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import multer from 'multer';

const router = Router();

// Authentication middleware for protected routes
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.auth?.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        statusCode: 401
      }
    });
  }
  next();
};

// Setup multer for file uploads with enhanced configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation - will be enhanced with subscription tier limits
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

/**
 * File Routes - Clean Architecture with Auth System v2.0
 * 
 * Authentication Flow:
 * API Gateway → JWT Validation → x-auth-* headers → ServiceAuthExtractor → req.auth
 * 
 * Routes are separated into:
 * - Public routes: No authentication required (health checks)
 * - Protected routes: Require authentication (file operations)
 */

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

// NOTE: Health routes are handled separately in health.routes.ts
// No public file access routes for security reasons

// ==========================================
// PROTECTED ROUTES (Authentication Required)
// ==========================================

// Apply ServiceAuthExtractor to all protected routes
router.use(ServiceAuthExtractor.createServiceMiddleware());

// File upload with subscription tier validation
router.post('/', requireAuth, upload.single('file'), FileController.uploadFile);

// Get user's files with pagination
router.get('/', requireAuth, FileController.getUserFiles);

// Download file with access control
router.get('/:fileId', requireAuth, FileController.downloadFile);

// Delete file with ownership validation
router.delete('/:fileId', requireAuth, FileController.deleteFile);

// Get file metadata
router.get('/:fileId/metadata', requireAuth, FileController.getFileMetadata);

// Get storage statistics
router.get('/storage/stats', requireAuth, FileController.getStorageStats);

// Generate presigned URL for file access
router.post('/:fileId/presigned-url', requireAuth, FileController.generatePresignedUrl);

export { router as fileRoutes };