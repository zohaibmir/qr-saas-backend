import { 
  IAuthService, 
  ServiceResponse, 
  AuthUser, 
  AuthTokens, 
  LoginRequest, 
  CreateUserRequest, 
  User,
  IUserRepository,
  ITokenRepository,
  AppError 
} from '../interfaces';
import { Logger } from './logger.service';
import { PasswordHasher } from '../utils/password-hasher';
import { TokenGenerator } from '../utils/token-generator';

export class AuthService implements IAuthService {
  constructor(
    private userRepository: IUserRepository,
    private tokenRepository: ITokenRepository,
    private passwordHasher: PasswordHasher,
    private tokenGenerator: TokenGenerator,
    private logger: Logger
  ) {}

  async login(credentials: LoginRequest): Promise<ServiceResponse<AuthUser>> {
    try {
      this.logger.info('Authentication attempt', { email: credentials.email });

      // Find user by email with password hash
      const userWithPassword = await this.userRepository.findByEmailWithPassword(credentials.email);
      if (!userWithPassword) {
        this.logger.warn('Login failed - user not found', { email: credentials.email });
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            statusCode: 401
          }
        };
      }

      // Verify password
      const isValidPassword = await this.passwordHasher.compare(credentials.password, userWithPassword.password);
      if (!isValidPassword) {
        this.logger.warn('Login failed - invalid password', { email: credentials.email });
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            statusCode: 401
          }
        };
      }

      // Remove password from user object for response
      const { password: userPassword, ...user } = userWithPassword;

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // TODO: Store refresh token (disabled temporarily due to interface mismatch)
      // await this.tokenRepository.saveRefreshToken(
      //   user.id,
      //   tokens.refreshToken,
      //   new Date(tokens.accessTokenExpiresAt)
      // );

      this.logger.info('Login successful', { userId: user.id, email: user.email });

      // Return user without password
      return {
        success: true,
        data: {
          user: user as User,
          tokens
        }
      };

    } catch (error) {
      this.logger.error('Login error', { 
        email: credentials.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Authentication failed',
          statusCode: 500
        }
      };
    }
  }

  async register(userData: CreateUserRequest): Promise<ServiceResponse<AuthUser>> {
    try {
      this.logger.info('Registration attempt', { email: userData.email });

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        this.logger.warn('Registration failed - email already exists', { email: userData.email });
        return {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email address is already registered',
            statusCode: 409
          }
        };
      }

      // Hash password
      const hashedPassword = await this.passwordHasher.hash(userData.password);

      // Create user
      const newUser = await this.userRepository.create({
        ...userData,
        password: hashedPassword,
        emailVerified: false,
        isActive: true
      });

      // Generate tokens
      const tokens = await this.generateTokens(newUser);

      // Store refresh token - using the correct interface method
      await this.tokenRepository.create({
        userId: newUser.id,
        token: tokens.refreshToken,
        type: 'refresh',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      this.logger.info('Registration successful', { userId: newUser.id, email: newUser.email });

      // Return user without password
      const { password, ...userWithoutPassword } = newUser;

      return {
        success: true,
        data: {
          user: userWithoutPassword as User,
          tokens
        }
      };

    } catch (error) {
      this.logger.error('Registration error', { 
        email: userData.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed',
          statusCode: 500
        }
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<ServiceResponse<AuthTokens>> {
    try {
      this.logger.info('Token refresh attempt');

      // Find and validate refresh token
      const tokenRecord = await this.tokenRepository.findByToken(refreshToken);
      if (!tokenRecord || tokenRecord.type !== 'refresh') {
        this.logger.warn('Token refresh failed - invalid token');
        return {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid refresh token',
            statusCode: 401
          }
        };
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        this.logger.warn('Token refresh failed - token expired');
        await this.tokenRepository.delete(tokenRecord.id);
        return {
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token expired',
            statusCode: 401
          }
        };
      }

      // Get user
      const user = await this.userRepository.findById(tokenRecord.userId);
      if (!user || !user.isActive) {
        this.logger.warn('Token refresh failed - user not found or inactive');
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
            statusCode: 401
          }
        };
      }

      // Generate new tokens
      const newTokens = await this.generateTokens(user);

      // Delete old refresh token
      await this.tokenRepository.delete(tokenRecord.id);

      // Store new refresh token
      await this.tokenRepository.create({
        userId: user.id,
        token: newTokens.refreshToken,
        type: 'refresh',
        expiresAt: new Date(newTokens.refreshTokenExpiresAt)
      });

      this.logger.info('Token refresh successful', { userId: user.id });

      return {
        success: true,
        data: newTokens
      };

    } catch (error) {
      this.logger.error('Token refresh error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Token refresh failed',
          statusCode: 500
        }
      };
    }
  }

  async logout(userId: string, refreshToken: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Logout attempt', { userId });

      // Find and delete refresh token
      const tokenRecord = await this.tokenRepository.findByToken(refreshToken);
      if (tokenRecord && tokenRecord.userId === userId) {
        await this.tokenRepository.delete(tokenRecord.id);
      }

      this.logger.info('Logout successful', { userId });

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      this.logger.error('Logout error', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
          statusCode: 500
        }
      };
    }
  }

  async forgotPassword(email: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Password reset request', { email });

      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        this.logger.warn('Password reset - email not found', { email });
        return {
          success: true,
          data: undefined
        };
      }

      // Generate password reset token
      const resetToken = this.tokenGenerator.generateResetToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store reset token
      await this.tokenRepository.create({
        userId: user.id,
        token: resetToken,
        type: 'password_reset',
        expiresAt
      });

      // TODO: Send reset email (integrate with notification service)
      this.logger.info('Password reset token generated', { userId: user.id });

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      this.logger.error('Forgot password error', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message: 'Password reset request failed',
          statusCode: 500
        }
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Password reset attempt');

      const tokenRecord = await this.tokenRepository.findByToken(token);
      if (!tokenRecord || tokenRecord.type !== 'password_reset') {
        this.logger.warn('Password reset failed - invalid token');
        return {
          success: false,
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: 'Invalid or expired reset token',
            statusCode: 400
          }
        };
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        this.logger.warn('Password reset failed - token expired');
        await this.tokenRepository.delete(tokenRecord.id);
        return {
          success: false,
          error: {
            code: 'RESET_TOKEN_EXPIRED',
            message: 'Reset token has expired',
            statusCode: 400
          }
        };
      }

      // Hash new password
      const hashedPassword = await this.passwordHasher.hash(newPassword);

      // Update user password
      await this.userRepository.update(tokenRecord.userId, { password: hashedPassword });

      // Delete reset token
      await this.tokenRepository.delete(tokenRecord.id);

      this.logger.info('Password reset successful', { userId: tokenRecord.userId });

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      this.logger.error('Password reset error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message: 'Password reset failed',
          statusCode: 500
        }
      };
    }
  }

  async verifyEmailToken(token: string): Promise<ServiceResponse<User>> {
    try {
      this.logger.info('Email verification attempt');

      const tokenRecord = await this.tokenRepository.findByToken(token);
      if (!tokenRecord || tokenRecord.type !== 'email_verification') {
        this.logger.warn('Email verification failed - invalid token');
        return {
          success: false,
          error: {
            code: 'INVALID_VERIFICATION_TOKEN',
            message: 'Invalid verification token',
            statusCode: 400
          }
        };
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        this.logger.warn('Email verification failed - token expired');
        await this.tokenRepository.delete(tokenRecord.id);
        return {
          success: false,
          error: {
            code: 'VERIFICATION_TOKEN_EXPIRED',
            message: 'Verification token has expired',
            statusCode: 400
          }
        };
      }

      // Update user email verification status
      const updatedUser = await this.userRepository.update(tokenRecord.userId, { emailVerified: true });

      // Delete verification token
      await this.tokenRepository.delete(tokenRecord.id);

      this.logger.info('Email verification successful', { userId: updatedUser.id });

      return {
        success: true,
        data: updatedUser
      };

    } catch (error) {
      this.logger.error('Email verification error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_FAILED',
          message: 'Email verification failed',
          statusCode: 500
        }
      };
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const accessToken = this.tokenGenerator.generateAccessToken(user);
    const refreshToken = this.tokenGenerator.generateRefreshToken();
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }
}