import { Router } from 'express';
import type { Request, Response } from 'express';
import { getIPConfig, updateIPConfig } from '../middleware/ip-restriction.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/admin/ip-config:
 *   get:
 *     summary: Get current IP restriction configuration
 *     tags: [Admin - IP Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current IP configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     allowedIPs:
 *                       type: array
 *                       items:
 *                         type: string
 *                     allowPrivateNetworks:
 *                       type: boolean
 *                     allowLocalhost:
 *                       type: boolean
 */
router.get('/ip-config', (req: Request, res: Response) => {
  try {
    const config = getIPConfig();
    
    logger.info('IP configuration requested', {
      adminId: (req as any).admin?.id,
      clientIP: (req as any).clientIP,
    });
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error getting IP configuration', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get IP configuration',
    });
  }
});

/**
 * @swagger
 * /api/admin/ip-config:
 *   put:
 *     summary: Update IP restriction configuration
 *     tags: [Admin - IP Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable IP restrictions
 *               allowedIPs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of allowed IP addresses or CIDR blocks
 *               allowPrivateNetworks:
 *                 type: boolean
 *                 description: Allow private network IP addresses
 *               allowLocalhost:
 *                 type: boolean
 *                 description: Allow localhost connections
 *     responses:
 *       200:
 *         description: IP configuration updated successfully
 *       400:
 *         description: Invalid configuration provided
 *       403:
 *         description: Insufficient permissions
 */
router.put('/ip-config', (req: Request, res: Response) => {
  try {
    const { enabled, allowedIPs, allowPrivateNetworks, allowLocalhost } = req.body;
    const adminId = (req as any).admin?.id;
    const clientIP = (req as any).clientIP;
    
    // Validate input
    if (typeof enabled !== 'undefined' && typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid enabled value, must be boolean',
      });
    }
    
    if (allowedIPs && !Array.isArray(allowedIPs)) {
      return res.status(400).json({
        success: false,
        message: 'allowedIPs must be an array',
      });
    }
    
    if (allowedIPs && !allowedIPs.every((ip: any) => typeof ip === 'string')) {
      return res.status(400).json({
        success: false,
        message: 'All allowedIPs must be strings',
      });
    }
    
    // Security check: Ensure admin doesn't lock themselves out
    if (enabled && allowedIPs && !allowPrivateNetworks && !allowLocalhost) {
      const currentIP = clientIP;
      if (!allowedIPs.includes(currentIP)) {
        return res.status(400).json({
          success: false,
          message: `Warning: This configuration would lock you out. Your current IP (${currentIP}) is not in the allowed list.`,
          code: 'LOCKOUT_PREVENTION',
        });
      }
    }
    
    // Update configuration
    const updates: any = {};
    if (typeof enabled !== 'undefined') updates.enabled = enabled;
    if (allowedIPs) updates.allowedIPs = allowedIPs;
    if (typeof allowPrivateNetworks !== 'undefined') updates.allowPrivateNetworks = allowPrivateNetworks;
    if (typeof allowLocalhost !== 'undefined') updates.allowLocalhost = allowLocalhost;
    
    const newConfig = updateIPConfig(updates);
    
    logger.info('IP configuration updated', {
      adminId,
      clientIP,
      updates,
      newConfig,
    });
    
    res.json({
      success: true,
      message: 'IP configuration updated successfully',
      data: newConfig,
    });
  } catch (error) {
    logger.error('Error updating IP configuration', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update IP configuration',
    });
  }
});

/**
 * @swagger
 * /api/admin/ip-config/test:
 *   post:
 *     summary: Test if a specific IP address would be allowed
 *     tags: [Admin - IP Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ip:
 *                 type: string
 *                 description: IP address to test
 *                 example: "192.168.1.100"
 *     responses:
 *       200:
 *         description: Test result
 */
router.post('/ip-config/test', (req: Request, res: Response) => {
  try {
    const { ip } = req.body;
    
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'IP address is required and must be a string',
      });
    }
    
    // Simple IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format',
      });
    }
    
    const config = getIPConfig();
    
    // Mock the IP restriction check logic
    let allowed = false;
    let reason = '';
    
    if (!config.enabled) {
      allowed = true;
      reason = 'IP restrictions are disabled';
    } else {
      // Check localhost
      const isLocalIP = ip === '127.0.0.1' || ip === 'localhost';
      if (config.allowLocalhost && isLocalIP) {
        allowed = true;
        reason = 'Localhost access is allowed';
      }
      
      // Check private networks
      if (!allowed) {
        const isPrivate = /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
        if (config.allowPrivateNetworks && isPrivate) {
          allowed = true;
          reason = 'Private network access is allowed';
        }
      }
      
      // Check explicit allowed IPs
      if (!allowed) {
        if (config.allowedIPs.includes(ip)) {
          allowed = true;
          reason = 'IP is in the allowed list';
        }
      }
      
      if (!allowed) {
        reason = 'IP is not in the allowed list and does not match any allowed categories';
      }
    }
    
    logger.info('IP test performed', {
      adminId: (req as any).admin?.id,
      clientIP: (req as any).clientIP,
      testIP: ip,
      allowed,
      reason,
    });
    
    res.json({
      success: true,
      data: {
        ip,
        allowed,
        reason,
        currentConfig: config,
      },
    });
  } catch (error) {
    logger.error('Error testing IP address', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test IP address',
    });
  }
});

export default router;