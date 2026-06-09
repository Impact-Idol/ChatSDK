/**
 * Database Service
 * PostgreSQL connection pool using pg
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Pool, PoolClient } from 'pg';
import type { QueryResultRow } from 'pg';
import { config as appConfig } from '../config/defaults.js';

// Database pool singleton
let pool: Pool | null = null;
let brokerPool: Pool | null = null;
let brokerRuntimeRoleVerified = false;
let brokerRuntimeRoleVerification: Promise<void> | null = null;

export interface TenantDbContext {
  appId?: string;
  userId?: string;
  system?: boolean;
}

interface DbAsyncContext {
  client?: PoolClient;
  tenant: TenantDbContext;
  brokerClient?: boolean;
}

const dbContext = new AsyncLocalStorage<DbAsyncContext>();

// Configuration using smart defaults
const config = {
  connectionString: appConfig.database.url,
  max: appConfig.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: appConfig.database.ssl ? { rejectUnauthorized: false } : false,
};

const brokerConfig = {
  ...config,
  connectionString: appConfig.database.brokerUrl || appConfig.database.url,
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
    await assertRlsRuntimeRole(client);
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
  query: async <T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) => {
    const context = dbContext.getStore();
    if (context?.client) {
      return context.client.query<T>(text, params);
    }
    if (context?.tenant) {
      return withTenantClient(context.tenant, (client) => client.query<T>(text, params));
    }
    return getDB().query<T>(text, params);
  },

  getClient: () => getDB().connect(),

  getContext: () => dbContext.getStore()?.tenant,

  /**
   * Execute a transaction
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const context = dbContext.getStore();
    if (context?.client) {
      return fn(context.client);
    }

    const client = await getDB().connect();
    try {
      await client.query('BEGIN');
      if (context?.tenant) {
        await setTenantContext(client, context.tenant);
      }
      const result = await dbContext.run(
        {
          client,
          tenant: context?.tenant ?? { system: true },
        },
        () => fn(client)
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

	  async withTenantContext<T>(
	    tenant: TenantDbContext,
	    fn: () => Promise<T>
	  ): Promise<T> {
    if ((tenant as TenantDbContext & { brokerSystem?: boolean }).brokerSystem !== undefined) {
      throw new Error('Broker DB context cannot be set through tenant context');
    }
	    if (!tenant.system && !tenant.appId) {
	      throw new Error('Tenant DB context requires appId unless system context is enabled');
	    }

	    const existing = dbContext.getStore();
	    if (existing) {
      if (existing.brokerClient === true) {
        throw new Error('Cannot switch tenant DB context inside an active broker DB context');
      }
      if ((existing.tenant as TenantDbContext & { brokerSystem?: boolean }).brokerSystem !== undefined) {
        throw new Error('Invalid broker DB context marker in tenant context');
      }
	      const merged = { ...existing.tenant, ...tenant };
	      const existingSystem = existing.tenant.system === true;
	      const appChanged =
	        merged.appId !== existing.tenant.appId;
	      const userChanged =
	        merged.userId !== existing.tenant.userId;
	      const systemChanged =
	        tenant.system !== undefined &&
	        merged.system === true !== existingSystem;

	      if (appChanged || userChanged || systemChanged) {
	        throw new Error('Cannot switch tenant DB context inside an active request context');
	      }
      return dbContext.run({ ...existing, tenant: merged }, fn);
    }

    return dbContext.run({ tenant }, fn);
  },

  async withIsolatedTenantContext<T>(
    tenant: TenantDbContext,
    fn: () => Promise<T>
  ): Promise<T> {
    const existing = dbContext.getStore();
    if (existing?.brokerClient === true) {
      throw new Error('Cannot switch tenant DB context inside an active broker DB context');
    }

    return dbContext.exit(() => this.withTenantContext(tenant, fn));
  },

  async withSystemContext<T>(fn: () => Promise<T>): Promise<T> {
    return this.withIsolatedTenantContext({ system: true }, fn);
  },

  async withBrokerSystemContext<T>(fn: () => Promise<T>): Promise<T> {
    const existing = dbContext.getStore();
    if (existing?.client && existing.brokerClient === true) {
      return fn();
    }

	    const client = await getBrokerDB().connect();
	    try {
	      await ensureBrokerRuntimeRoleVerified(client);
	      await client.query('BEGIN');
	      await setTenantContext(client, { system: true });
      const result = await dbContext.run(
        {
          client,
          tenant: { system: true },
          brokerClient: true,
        },
        fn
      );
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

function getBrokerDB(): Pool {
  if (!brokerPool) {
    brokerPool = new Pool(brokerConfig);
  }
  return brokerPool;
}

async function assertBrokerRuntimeRole(client: PoolClient): Promise<void> {
  if (!appConfig.isProduction && process.env.REQUIRE_RLS_ROLE_CHECK !== 'true') {
    return;
  }

  const result = await client.query<{
    current_user: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
  }>(
    `SELECT current_user, r.rolsuper, r.rolbypassrls
     FROM pg_roles r
     WHERE r.rolname = current_user`
  );
  const role = result.rows[0];
  if (!role) {
    throw new Error('Unable to verify broker database runtime role');
  }
  if (role.current_user !== 'chatsdk_broker_system') {
    throw new Error('Broker database runtime role must be chatsdk_broker_system');
  }
  if (role.rolsuper || role.rolbypassrls) {
    throw new Error('Broker database runtime role must not be superuser or BYPASSRLS');
	  }
	}

async function ensureBrokerRuntimeRoleVerified(client: PoolClient): Promise<void> {
  if (brokerRuntimeRoleVerified) {
    return;
  }

  if (!brokerRuntimeRoleVerification) {
    brokerRuntimeRoleVerification = assertBrokerRuntimeRole(client)
      .then(() => {
        brokerRuntimeRoleVerified = true;
      })
      .catch((error) => {
        brokerRuntimeRoleVerification = null;
        throw error;
      });
  }

  await brokerRuntimeRoleVerification;
}

async function withTenantClient<T>(
  tenant: TenantDbContext,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDB().connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, tenant);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function setTenantContext(client: PoolClient, tenant: TenantDbContext): Promise<void> {
  await client.query(
    `SELECT
       set_config('app.current_app_id', $1, true),
       set_config('app.current_user_id', $2, true),
       set_config('app.system_context', $3, true)`,
    [
      tenant.appId ?? '',
      tenant.userId ?? '',
      tenant.system ? 'true' : 'false',
    ]
  );
}

async function assertRlsRuntimeRole(client: PoolClient): Promise<void> {
  if (!appConfig.isProduction && process.env.REQUIRE_RLS_ROLE_CHECK !== 'true') {
    return;
  }

  const result = await client.query<{
    rolsuper: boolean;
    rolbypassrls: boolean;
  }>(
    `SELECT rolsuper, rolbypassrls
     FROM pg_roles
     WHERE rolname = current_user`
  );

  const role = result.rows[0];
  if (!role) {
    throw new Error('Unable to verify database runtime role for RLS enforcement');
  }

  if (role.rolsuper || role.rolbypassrls) {
    throw new Error(
      'Database runtime role must not be superuser or BYPASSRLS when tenant RLS is enabled'
    );
  }
}

/**
 * Close database pool
 */
export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (brokerPool) {
    await brokerPool.end();
    brokerPool = null;
    brokerRuntimeRoleVerified = false;
    brokerRuntimeRoleVerification = null;
  }
}
