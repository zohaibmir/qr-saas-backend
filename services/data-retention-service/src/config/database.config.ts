import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  pool: Pool;
  testConnection: () => Promise<void>;
  closeConnections: () => Promise<void>;
}

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'qr_saas',
  user: process.env.DB_USER || 'qr_user',
  password: process.env.DB_PASSWORD || 'qr_password_2024',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

// Pool error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

export const config: DatabaseConfig = {
  pool,
  
  async testConnection(): Promise<void> {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database connection test successful');
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw new Error('Failed to connect to database');
    }
  },
  
  async closeConnections(): Promise<void> {
    try {
      await pool.end();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }
};

export default config;