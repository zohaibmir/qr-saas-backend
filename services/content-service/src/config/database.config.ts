import { Pool } from 'pg';

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qr_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(dbConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Content Service - Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Content Service - Database connection error:', err);
});

export default pool;