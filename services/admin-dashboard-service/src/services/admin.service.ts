import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './database.service';
import { config } from '../config/environment.config';
import { logger, logSecurityEvent, logAdminActivity } from '../utils/logger';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export type AdminRole = 'super_admin' | 'content_admin' | 'analytics_admin' | 'user_admin' | 'support_admin' | 'marketing_admin';

export interface AdminJWTPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface LoginResult {
  success: boolean;
  admin?: AdminUser;
  token?: string;
  expiresAt?: Date;
  message?: string;
  remainingAttempts?: number;
}

export class AdminService {
  private static permissions: Map<AdminRole, string[]> = new Map();

  /**
   * Initialize admin service
   */
  public static async initialize(): Promise<void> {
    try {
      await this.loadPermissions();
      logger.info('Admin service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize admin service:', error);
      throw error;
    }
  }

  /**
   * Load permissions from database
   */
  private static async loadPermissions(): Promise<void> {
    const query = `
      SELECT arp.role, ap.name as permission
      FROM admin_role_permissions arp
      JOIN admin_permissions ap ON arp.permission_id = ap.id
      ORDER BY arp.role, ap.name
    `;

    const result = await DatabaseService.query(query);
    
    // Group permissions by role
    const permissionMap = new Map<AdminRole, string[]>();
    
    for (const row of result.rows) {
      const { role, permission } = row;
      
      if (!permissionMap.has(role)) {
        permissionMap.set(role, []);
      }
      
      permissionMap.get(role)!.push(permission);
    }

    this.permissions = permissionMap;
    
    logger.info('Admin permissions loaded', {
      rolesCount: permissionMap.size,
      totalPermissions: result.rows.length
    });
  }

  /**
   * Authenticate admin user
   */
  public static async authenticateAdmin(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    try {
      // Get admin user
      const adminQuery = `
        SELECT id, email, full_name, role, password_hash, is_active,
               login_attempts, locked_until, last_login_at, created_at, updated_at
        FROM admin_users
        WHERE email = $1
      `;

      const adminResult = await DatabaseService.query(adminQuery, [email.toLowerCase()]);

      if (adminResult.rows.length === 0) {
        logSecurityEvent({
          type: 'login_failure',
          email,
          ip: ipAddress,
          userAgent,
          reason: 'User not found'
        });

        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      const adminData = adminResult.rows[0];

      // Check if account is active
      if (!adminData.is_active) {
        logSecurityEvent({
          type: 'login_failure',
          email,
          ip: ipAddress,
          userAgent,
          reason: 'Account disabled'
        });

        return {
          success: false,
          message: 'Account is disabled'
        };
      }

      // Check if account is locked
      if (adminData.locked_until && new Date() < new Date(adminData.locked_until)) {
        logSecurityEvent({
          type: 'login_failure',
          email,
          ip: ipAddress,
          userAgent,
          reason: 'Account locked'
        });

        const lockoutMinutes = Math.ceil((new Date(adminData.locked_until).getTime() - Date.now()) / (1000 * 60));
        
        return {
          success: false,
          message: `Account is locked. Please try again in ${lockoutMinutes} minutes.`
        };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, adminData.password_hash);

      if (!passwordMatch) {
        await this.handleFailedLogin(adminData.id, email, ipAddress, userAgent);
        
        const updatedAdmin = await this.getLoginAttempts(adminData.id);
        const remainingAttempts = Math.max(0, config.auth.maxLoginAttempts - updatedAdmin.failedLoginAttempts);

        return {
          success: false,
          message: 'Invalid email or password',
          remainingAttempts
        };
      }

      // Successful login - reset failed attempts and update last login
      await this.resetLoginAttempts(adminData.id);

      // Create JWT token
      const permissions = this.permissions.get(adminData.role) || [];
      const tokenPayload: AdminJWTPayload = {
        adminId: adminData.id,
        email: adminData.email,
        role: adminData.role,
        permissions
      };

      const token = jwt.sign(tokenPayload, config.auth.jwtSecret, {
        expiresIn: `${config.auth.jwtExpiryHours}h`
      });

      const expiresAt = new Date(Date.now() + (config.auth.jwtExpiryHours * 60 * 60 * 1000));

      // Create session record
      await this.createSession(adminData.id, token, expiresAt, ipAddress, userAgent);

      // Log successful login
      logSecurityEvent({
        type: 'login_success',
        adminId: adminData.id,
        email,
        ip: ipAddress,
        userAgent
      });

      const admin: AdminUser = {
        id: adminData.id,
        email: adminData.email,
        fullName: adminData.full_name,
        role: adminData.role,
        isActive: adminData.is_active,
        lastLoginAt: new Date(),
        createdAt: new Date(adminData.created_at),
        updatedAt: new Date(adminData.updated_at),
        failedLoginAttempts: 0,
        lockedUntil: undefined
      };

      return {
        success: true,
        admin,
        token,
        expiresAt
      };

    } catch (error) {
      logger.error('Admin authentication failed:', error);
      return {
        success: false,
        message: 'Authentication service error'
      };
    }
  }

  /**
   * Verify JWT token and get admin user
   */
  public static async verifyToken(token: string): Promise<AdminUser | null> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, config.auth.jwtSecret) as AdminJWTPayload;

      // Check if session is still active
      const sessionQuery = `
        SELECT id, admin_user_id, is_active, expires_at
        FROM admin_sessions
        WHERE session_token = $1 AND is_active = true
      `;

      const sessionResult = await DatabaseService.query(sessionQuery, [token]);

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0];

      if (new Date() > new Date(session.expires_at)) {
        // Session expired
        await this.deactivateSession(token);
        return null;
      }

      // Get current admin data
      return await this.getAdminById(decoded.adminId);

    } catch (error) {
      logger.debug('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Get admin user by ID
   */
  public static async getAdminById(adminId: string): Promise<AdminUser | null> {
    try {
      const query = `
        SELECT id, email, full_name, role, is_active,
               login_attempts, locked_until, last_login_at, created_at, updated_at
        FROM admin_users
        WHERE id = $1 AND is_active = true
      `;

      const result = await DatabaseService.query(query, [adminId]);

      if (result.rows.length === 0) {
        return null;
      }

      const adminData = result.rows[0];

      return {
        id: adminData.id,
        email: adminData.email,
        fullName: adminData.full_name,
        role: adminData.role,
        isActive: adminData.is_active,
        lastLoginAt: adminData.last_login_at ? new Date(adminData.last_login_at) : undefined,
        createdAt: new Date(adminData.created_at),
        updatedAt: new Date(adminData.updated_at),
        failedLoginAttempts: adminData.login_attempts,
        lockedUntil: adminData.locked_until ? new Date(adminData.locked_until) : undefined
      };

    } catch (error) {
      logger.error('Failed to get admin by ID:', error);
      return null;
    }
  }

  /**
   * Get admin permissions by role
   */
  public static getPermissions(role: AdminRole): string[] {
    return this.permissions.get(role) || [];
  }

  /**
   * Check if admin has specific permission
   */
  public static hasPermission(role: AdminRole, permission: string): boolean {
    const permissions = this.getPermissions(role);
    return permissions.includes(permission);
  }

  /**
   * Logout admin (deactivate session)
   */
  public static async logout(token: string, adminId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await this.deactivateSession(token);

      if (adminId) {
        logSecurityEvent({
          type: 'logout',
          adminId,
          ip: ipAddress,
          userAgent
        });
      }

    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Handle failed login attempt
   */
  private static async handleFailedLogin(
    adminId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const updateQuery = `
      UPDATE admin_users 
      SET login_attempts = login_attempts + 1,
          locked_until = CASE
            WHEN login_attempts + 1 >= $1 THEN NOW() + INTERVAL '${config.auth.lockoutDurationMinutes} minutes'
            ELSE locked_until
          END
      WHERE id = $2
      RETURNING login_attempts, locked_until
    `;

    const result = await DatabaseService.query(updateQuery, [config.auth.maxLoginAttempts, adminId]);
    const { login_attempts, locked_until } = result.rows[0];

    if (locked_until) {
      logSecurityEvent({
        type: 'account_lockout',
        adminId,
        email,
        ip: ipAddress,
        userAgent,
        attempts: login_attempts
      });
    } else {
      logSecurityEvent({
        type: 'login_failure',
        adminId,
        email,
        ip: ipAddress,
        userAgent,
        attempts: login_attempts
      });
    }
  }

  /**
   * Reset failed login attempts
   */
  private static async resetLoginAttempts(adminId: string): Promise<void> {
    await DatabaseService.query(
      `UPDATE admin_users 
       SET login_attempts = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`,
      [adminId]
    );
  }

  /**
   * Get current login attempts
   */
  private static async getLoginAttempts(adminId: string): Promise<{ failedLoginAttempts: number }> {
    const result = await DatabaseService.query(
      'SELECT login_attempts FROM admin_users WHERE id = $1',
      [adminId]
    );

    return {
      failedLoginAttempts: result.rows[0]?.login_attempts || 0
    };
  }

  /**
   * Create admin session
   */
  private static async createSession(
    adminId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Generate a refresh token
    const refreshToken = jwt.sign({ adminId, type: 'refresh' }, config.auth.jwtSecret, {
      expiresIn: '7d' // Refresh token expires in 7 days
    });

    await DatabaseService.query(
      `INSERT INTO admin_sessions (admin_user_id, session_token, refresh_token, expires_at, ip_address, user_agent, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [adminId, token, refreshToken, expiresAt, ipAddress, userAgent]
    );
  }

  /**
   * Deactivate admin session
   */
  private static async deactivateSession(token: string): Promise<void> {
    await DatabaseService.query(
      'UPDATE admin_sessions SET is_active = false WHERE session_token = $1',
      [token]
    );
  }

  /**
   * Hash password
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.auth.bcryptRounds);
  }

  /**
   * Log admin activity
   */
  public static async logActivity(
    adminId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    try {
      await DatabaseService.query(
        `INSERT INTO admin_activity_logs (admin_id, action, resource, resource_id, details, ip_address, user_agent, success, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [adminId, action, resource, resourceId, details ? JSON.stringify(details) : null, ipAddress, userAgent, success, error]
      );

      logAdminActivity({
        adminId,
        action,
        resource,
        resourceId,
        details,
        ip: ipAddress,
        userAgent,
        success,
        error
      });

    } catch (error) {
      logger.error('Failed to log admin activity:', error);
    }
  }
}