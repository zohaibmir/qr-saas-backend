import { Pool, PoolConfig } from 'pg';
import { ILogger } from '../interfaces';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private logger: ILogger | undefined;

  private constructor(config: DatabaseConfig, logger?: ILogger) {
    this.logger = logger;
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections || 20,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    };

    this.pool = new Pool(poolConfig);
    
    // Handle pool errors
    this.pool.on('error', (err) => {
      this.logger?.error('PostgreSQL pool error:', err);
    });

    // Log connection events
    this.pool.on('connect', () => {
      this.logger?.debug('New database connection established');
    });

    this.pool.on('remove', () => {
      this.logger?.debug('Database connection removed from pool');
    });
  }

  public static getInstance(config?: DatabaseConfig, logger?: ILogger): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration is required for first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(config, logger);
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      this.logger?.debug('Database query executed', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger?.error('Database query failed', {
        query: text,
        duration: `${duration}ms`,
        error: error
      });
      throw error;
    }
  }

  public async getClient() {
    return await this.pool.connect();
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger?.info('Database connection test successful');
      return true;
    } catch (error) {
      this.logger?.error('Database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    this.logger?.info('Database connection pool closed');
  }

  // Health check method
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
  }> {
    try {
      const isConnected = await this.testConnection();
      
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        totalConnections: 0,
        idleConnections: 0,
        waitingCount: 0,
      };
    }
  }
}

// Factory function for creating database configuration
export const createDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'qr_saas_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  };
};

// Export singleton factory
export const getDatabaseConnection = (logger?: ILogger): DatabaseConnection => {
  return DatabaseConnection.getInstance(createDatabaseConfig(), logger);
};