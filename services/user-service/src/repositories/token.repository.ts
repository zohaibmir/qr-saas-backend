import { Pool, PoolClient } from 'pg';
import { 
  ITokenRepository,
  DatabaseError,
  ILogger 
} from '../interfaces';

export class TokenRepository implements ITokenRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO user_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, 'refresh_token', $3)
        ON CONFLICT (user_id, type) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
      `;
      
      await client.query(query, [userId, token, expiresAt]);
      this.logger.debug('Refresh token saved', { userId });
    } catch (error) {
      this.logger.error('Failed to save refresh token', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new DatabaseError('Failed to save refresh token', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }

  async validateRefreshToken(token: string): Promise<{ userId: string; isValid: boolean }> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT user_id FROM user_tokens 
        WHERE token = $1 AND type = 'refresh_token' AND expires_at > NOW()
      `;
      
      const result = await client.query(query, [token]);
      
      if (!result.rows[0]) {
        return { userId: '', isValid: false };
      }

      return { userId: result.rows[0].user_id, isValid: true };
    } catch (error) {
      this.logger.error('Failed to validate refresh token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new DatabaseError('Failed to validate refresh token', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        DELETE FROM user_tokens 
        WHERE token = $1 AND type = 'refresh_token'
      `;
      
      await client.query(query, [token]);
      this.logger.debug('Refresh token revoked');
    } catch (error) {
      this.logger.error('Failed to revoke refresh token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new DatabaseError('Failed to revoke refresh token', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        DELETE FROM user_tokens 
        WHERE user_id = $1 AND type = 'refresh_token'
      `;
      
      await client.query(query, [userId]);
      this.logger.debug('All user tokens revoked', { userId });
    } catch (error) {
      this.logger.error('Failed to revoke all user tokens', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new DatabaseError('Failed to revoke user tokens', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }

  async saveEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO user_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, 'email_verification', $3)
        ON CONFLICT (user_id, type) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
      `;
      
      await client.query(query, [userId, token, expiresAt]);
      this.logger.debug('Email verification token saved', { userId });
    } catch (error) {
      this.logger.error('Failed to save email verification token', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new DatabaseError('Failed to save email verification token', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }

  async savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO user_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, 'password_reset', $3)
        ON CONFLICT (user_id, type) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
      `;
      
      await client.query(query, [userId, token, expiresAt]);
      this.logger.debug('Password reset token saved', { userId });
    } catch (error) {
      this.logger.error('Failed to save password reset token', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new DatabaseError('Failed to save password reset token', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      client.release();
    }
  }
}