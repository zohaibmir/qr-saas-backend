/**
 * White Label Routes
 * 
 * Express router configuration for white label configuration management endpoints.
 * Includes authentication, file upload handling, and request validation.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { WhiteLabelController } from '../controllers/white-label.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createWhiteLabelSchema,
  updateWhiteLabelSchema,
  configIdSchema,
  assetIdSchema,
  uploadAssetSchema
} from '../middleware/validation-schemas';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/brand-assets/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and certain file types for brand assets
  const allowedTypes = /jpeg|jpg|png|gif|svg|ico|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg, ico, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

export function createWhiteLabelRoutes(controller: WhiteLabelController): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * POST /white-label
   * Create a new white label configuration
   */
  router.post(
    '/white-label',
    validateRequest(createWhiteLabelSchema),
    controller.createConfig.bind(controller)
  );

  /**
   * GET /white-label/:configId
   * Get a specific white label configuration
   */
  router.get(
    '/white-label/:configId',
    validateRequest(configIdSchema, 'params'),
    controller.getConfig.bind(controller)
  );

  /**
   * GET /white-label
   * Get all white label configurations for authenticated user
   */
  router.get('/white-label', controller.getUserConfigs.bind(controller));

  /**
   * PUT /white-label/:configId
   * Update a white label configuration
   */
  router.put(
    '/white-label/:configId',
    validateRequest(configIdSchema, 'params'),
    validateRequest(updateWhiteLabelSchema),
    controller.updateConfig.bind(controller)
  );

  /**
   * DELETE /white-label/:configId
   * Delete a white label configuration
   */
  router.delete(
    '/white-label/:configId',
    validateRequest(configIdSchema, 'params'),
    controller.deleteConfig.bind(controller)
  );

  /**
   * POST /white-label/:configId/assets
   * Upload a brand asset for white label configuration
   */
  router.post(
    '/white-label/:configId/assets',
    validateRequest(configIdSchema, 'params'),
    upload.single('asset'),
    validateRequest(uploadAssetSchema),
    controller.uploadAsset.bind(controller)
  );

  /**
   * GET /white-label/:configId/assets
   * Get brand assets for a white label configuration
   */
  router.get(
    '/white-label/:configId/assets',
    validateRequest(configIdSchema, 'params'),
    controller.getAssets.bind(controller)
  );

  /**
   * DELETE /white-label/assets/:assetId
   * Delete a brand asset
   */
  router.delete(
    '/white-label/assets/:assetId',
    validateRequest(assetIdSchema, 'params'),
    controller.deleteAsset.bind(controller)
  );

  /**
   * GET /white-label/:configId/preview
   * Preview a white label configuration (public endpoint)
   */
  router.get(
    '/white-label/:configId/preview',
    validateRequest(configIdSchema, 'params'),
    controller.previewConfig.bind(controller)
  );

  return router;
}