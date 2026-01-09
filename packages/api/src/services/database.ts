/**
 * Database Service
 * PostgreSQL connection pool using pg
 */

import { Pool, PoolClient } from 'pg';
import { config as appConfig } from '../config/defaults.js';

// Database pool singleton
let pool: Pool | null = null;

// Configuration using smart defaults
const config = {
  connectionString: appConfig.database.url,
  max: appConfig.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: appConfig.database.ssl ? { rejectUnauthorized: false } : false,
};

/**
 * Initialize database connection pool
 */
export async function initDB(): Promise<Pool> {
  if (pool) return pool;

  pool = new Pool(config);

  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  return pool;
}

/**
 * Get database pool
 */
export function getDB(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return pool;
}

/**
 * Shorthand for db query
 */
export const db = {
  query: <T = any>(text: string, params?: any[]) => getDB().query<T>(text, params),

  getClient: () => getDB().connect(),

  /**
   * Execute a transaction
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getDB().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

/**
 * Close database pool
 */
export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
