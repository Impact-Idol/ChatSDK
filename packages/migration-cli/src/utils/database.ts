/**
 * Database Utilities for Direct PostgreSQL Access
 */

import pg from 'pg';
const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized?: boolean };
}

export class Database {
  private pool: pg.Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config);
  }

  async connect(): Promise<void> {
    // Test connection
    const client = await this.pool.connect();
    client.release();
  }

  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
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

  async batchInsert(
    table: string,
    columns: string[],
    rows: any[][],
    onConflict?: string
  ): Promise<void> {
    if (rows.length === 0) return;

    const placeholders = rows
      .map((_, rowIndex) => {
        const start = rowIndex * columns.length;
        return `(${columns.map((_, colIndex) => `$${start + colIndex + 1}`).join(', ')})`;
      })
      .join(', ');

    const values = rows.flat();

    let query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;

    if (onConflict) {
      query += ` ${onConflict}`;
    }

    await this.query(query, values);
  }

  async close() {
    await this.pool.end();
  }
}
