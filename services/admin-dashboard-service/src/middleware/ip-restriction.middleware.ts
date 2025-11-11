import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface IPRestrictionConfig {
  enabled: boolean;
  allowedIPs: string[];
  allowPrivateNetworks: boolean;
  allowLocalhost: boolean;
}

// Default configuration - can be overridden via environment variables
const defaultConfig: IPRestrictionConfig = {
  enabled: process.env.IP_RESTRICTION_ENABLED === 'true',
  allowedIPs: (process.env.ALLOWED_IPS || '').split(',').filter(ip => ip.trim()),
  allowPrivateNetworks: process.env.ALLOW_PRIVATE_NETWORKS !== 'false',
  allowLocalhost: process.env.ALLOW_LOCALHOST !== 'false',
};

/**
 * Check if an IP address is in a private network range
 */
const isPrivateIP = (ip: string): boolean => {
  // Remove IPv6 prefix if present (::ffff:)
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  // Private IPv4 ranges:
  // 10.0.0.0 - 10.255.255.255
  // 172.16.0.0 - 172.31.255.255
  // 192.168.0.0 - 192.168.255.255
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
  ];

  return privateRanges.some(range => range.test(cleanIP));
};

/**
 * Check if an IP address is localhost
 */
const isLocalhost = (ip: string): boolean => {
  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  return cleanIP === '127.0.0.1' || 
         cleanIP === 'localhost' || 
         ip === '::1' ||
         cleanIP === '0.0.0.0';
};

/**
 * Get the real client IP address from the request
 */
const getRealIP = (req: Request): string => {
  // Check various headers that might contain the real IP
  const xForwardedFor = req.get('X-Forwarded-For');
  const xRealIP = req.get('X-Real-IP');
  const xClientIP = req.get('X-Client-IP');
  
  let clientIP = req.socket.remoteAddress || req.ip || '';
  
  // If behind a proxy, try to get the real IP
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    clientIP = xForwardedFor.split(',')[0].trim();
  } else if (xRealIP) {
    clientIP = xRealIP;
  } else if (xClientIP) {
    clientIP = xClientIP;
  }
  
  // Clean up IPv6 mapped IPv4 addresses
  return clientIP.replace(/^::ffff:/, '');
};

/**
 * Check if an IP address is allowed
 */
const isIPAllowed = (ip: string, config: IPRestrictionConfig): boolean => {
  // If IP restrictions are disabled, allow all
  if (!config.enabled) {
    return true;
  }

  // Allow localhost if configured
  if (config.allowLocalhost && isLocalhost(ip)) {
    return true;
  }

  // Allow private networks if configured
  if (config.allowPrivateNetworks && isPrivateIP(ip)) {
    return true;
  }

  // Check against explicitly allowed IPs
  if (config.allowedIPs.includes(ip)) {
    return true;
  }

  // Check against allowed IP ranges (CIDR notation support)
  for (const allowedIP of config.allowedIPs) {
    if (allowedIP.includes('/')) {
      // CIDR notation - would need additional library for proper CIDR matching
      // For now, we'll do basic subnet matching
      const [network, prefix] = allowedIP.split('/');
      const prefixLength = parseInt(prefix, 10);
      
      if (prefixLength >= 24) {
        // /24 and smaller subnets - match first 3 octets
        const networkPrefix = network.split('.').slice(0, 3).join('.');
        const ipPrefix = ip.split('.').slice(0, 3).join('.');
        if (networkPrefix === ipPrefix) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Middleware to restrict access by IP address
 */
export const ipRestriction = (config: Partial<IPRestrictionConfig> = {}) => {
  const fullConfig: IPRestrictionConfig = { ...defaultConfig, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getRealIP(req);
    const isAllowed = isIPAllowed(clientIP, fullConfig);
    
    // Log the access attempt
    logger.info('Admin access attempt', {
      ip: clientIP,
      allowed: isAllowed,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      headers: {
        'x-forwarded-for': req.get('X-Forwarded-For'),
        'x-real-ip': req.get('X-Real-IP'),
        'x-client-ip': req.get('X-Client-IP'),
      },
    });
    
    if (!isAllowed) {
      logger.warn('Access denied for IP address', {
        ip: clientIP,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });
      
      return res.status(403).json({
        error: 'Access Denied',
        message: 'Your IP address is not authorized to access this service.',
        code: 'IP_RESTRICTED',
      });
    }
    
    // Add IP info to request for other middlewares
    (req as any).clientIP = clientIP;
    
    next();
  };
};

/**
 * Get current IP restriction configuration
 */
export const getIPConfig = (): IPRestrictionConfig => defaultConfig;

/**
 * Update IP restriction configuration at runtime
 */
export const updateIPConfig = (updates: Partial<IPRestrictionConfig>): IPRestrictionConfig => {
  Object.assign(defaultConfig, updates);
  logger.info('IP restriction configuration updated', defaultConfig);
  return defaultConfig;
};

export default ipRestriction;