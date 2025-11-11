import express, { Request, Response } from 'express';
import joi from 'joi';
import { AdminService } from '../services/admin.service';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { adminAuth } from '../middleware/admin-auth.middleware';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const loginSchema = joi.object({
  email: joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

/**
 * Admin Login
 * POST /auth/login
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details[0].message,
      field: error.details[0].path[0]
    });
  }

  const { email, password } = value;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    const result = await AdminService.authenticateAdmin(email, password, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: result.message,
        ...(result.remainingAttempts !== undefined && {
          remainingAttempts: result.remainingAttempts
        })
      });
    }

    // Return success response
    const permissions = AdminService.getPermissions(result.admin!.role);
    
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      admin: {
        id: result.admin!.id,
        email: result.admin!.email,
        fullName: result.admin!.fullName,
        role: result.admin!.role,
        permissions: permissions,
        lastLoginAt: result.admin!.lastLoginAt
      },
      token: result.token,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Authentication Error',
      message: 'Unable to process login request'
    });
  }
}));

/**
 * Get Current Admin User
 * GET /auth/me
 */
router.get('/me', adminAuth, asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required'
    });
  }

  res.status(200).json({
    admin: {
      id: req.admin.id,
      email: req.admin.email,
      fullName: req.admin.fullName,
      role: req.admin.role,
      lastLoginAt: req.admin.lastLoginAt,
      createdAt: req.admin.createdAt
    },
    permissions: req.adminPermissions
  });
}));

/**
 * Refresh JWT Token
 * POST /auth/refresh
 */
router.post('/refresh', adminAuth, asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required'
    });
  }

  try {
    // Create new token with current admin data
    const jwt = require('jsonwebtoken');
    const { config } = require('../config/environment.config');

    const tokenPayload = {
      adminId: req.admin.id,
      email: req.admin.email,
      role: req.admin.role,
      permissions: req.adminPermissions
    };

    const token = jwt.sign(tokenPayload, config.auth.jwtSecret, {
      expiresIn: `${config.auth.jwtExpiryHours}h`
    });

    const expiresAt = new Date(Date.now() + (config.auth.jwtExpiryHours * 60 * 60 * 1000));

    res.status(200).json({
      message: 'Token refreshed successfully',
      token,
      expiresAt
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token Refresh Error',
      message: 'Unable to refresh authentication token'
    });
  }
}));

/**
 * Admin Logout
 * POST /auth/logout
 */
router.post('/logout', adminAuth, asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required'
    });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7); // Remove 'Bearer ' prefix

    if (token) {
      await AdminService.logout(
        token,
        req.admin.id,
        req.ip,
        req.get('User-Agent')
      );
    }

    res.status(200).json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout Error',
      message: 'Unable to process logout request'
    });
  }
}));

/**
 * Check Admin Permissions
 * GET /auth/permissions
 */
router.get('/permissions', adminAuth, asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required'
    });
  }

  res.status(200).json({
    role: req.admin.role,
    permissions: req.adminPermissions,
    permissionCount: req.adminPermissions?.length || 0
  });
}));

export default router;