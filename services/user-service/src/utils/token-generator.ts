import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ITokenGenerator, User } from '../interfaces';

export class TokenGenerator implements ITokenGenerator {
  private readonly accessTokenSecret: string;
  private readonly accessTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-change-this-in-production';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  }

  generateAccessToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      subscription: user.subscription,
      isEmailVerified: user.isEmailVerified
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'qr-saas-user-service',
      subject: user.id
    } as jwt.SignOptions);
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  verifyAccessToken(token: string): { userId: string; isValid: boolean } {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;
      
      return {
        userId: decoded.userId,
        isValid: true
      };
    } catch (error) {
      return {
        userId: '',
        isValid: false
      };
    }
  }

  decodeAccessToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}