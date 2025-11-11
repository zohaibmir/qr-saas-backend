import { Pool, PoolClient } from 'pg';
import { config } from '../config/environment.config';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static pool: Pool | null = null;
  private static isConnected: boolean = false;

  /**
   * Initialize database connection pool
   */
  public static async connect(): Promise<void> {
    try {
      if (this.pool) {
        return;
      }

      // Debug log the connection parameters
      logger.info('Attempting database connection with parameters:', {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        ssl: config.database.ssl
      });

      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        max: config.database.maxConnections,
        idleTimeoutMillis: config.database.idleTimeoutMillis,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      
      logger.info('Database connection pool created', {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        maxConnections: config.database.maxConnections
      });

      // Handle pool events
      this.pool.on('error', (err) => {
        logger.error('Database pool error:', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        logger.debug('New database client connected');
      });

      this.pool.on('remove', () => {
        logger.debug('Database client removed from pool');
      });

    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database connection pool
   */
  public static getPool(): Pool {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query with parameters
   */
  public static async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.pool) {
        throw new Error('Database not connected');
      }

      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;

      logger.debug('Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        paramCount: params?.length || 0,
        rowCount: result.rowCount,
        duration
      });

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Database query failed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        paramCount: params?.length || 0,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  public static async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  public static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is healthy
   */
  public static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.pool || !this.isConnected) {
        return {
          status: 'unhealthy',
          error: 'Database not connected'
        };
      }

      await this.pool.query('SELECT 1');
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Close database connection pool
   */
  public static async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        logger.info('Database connection pool closed');
      }
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  /**
   * Get connection pool stats
   */
  public static getStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!this.pool) {
      return {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
      };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}