/**
 * Metrics & Health Routes
 * Work Stream 22 - TIER 4
 *
 * Exposes Prometheus metrics and health check endpoints
 */

import { Hono } from 'hono';
import { getMetrics } from '../services/metrics';
import { db } from '../services/database';
import { getCentrifugo } from '../services/centrifugo';
import { checkRealtimeOutboxHealth } from '../services/realtime-outbox';
import { checkSearchHealth } from '../services/search';
import { checkStorageHealth } from '../services/storage';
import { checkDataLifecyclePurgeHealth } from '../services/data-lifecycle';
import { checkRateLimitHealth } from '../services/rate-limit';
import { config } from '../config/defaults';
import logger from '../services/logger';

export const metricsRoutes = new Hono();

type CheckStatus = 'ok' | 'error' | 'skipped';

interface ReadinessCheck {
  status: CheckStatus;
  message?: string;
}

const REQUIRED_SCHEMA_TABLES = [
  'app',
  'app_user',
  'auth_session',
  'channel',
  'channel_member',
  'event_outbox',
  'message',
  'backup_drill',
  'backup_object_manifest',
  'backup_restore_gap',
  'revoked_token',
  'search_index_outbox',
  'workspace',
];

const BROKER_SCHEMA_TABLES = [
  'broker_app_scope',
  'broker_client',
  'broker_credential',
  'broker_jwt_replay',
  'broker_membership_state',
  'broker_mint_audit',
];

const BROKER_RUNTIME_PRIVILEGES: Record<string, string[]> = {
  app: ['SELECT'],
  app_user: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  auth_session: ['SELECT', 'INSERT', 'UPDATE'],
  broker_app_scope: ['SELECT'],
  broker_client: ['SELECT'],
  broker_credential: ['SELECT'],
  broker_jwt_replay: ['SELECT', 'INSERT', 'DELETE'],
  broker_membership_state: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  broker_mint_audit: ['SELECT', 'INSERT'],
  channel: ['SELECT', 'UPDATE'],
  channel_member: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  event_outbox: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
};

function normalizePolicyExpression(expression: string | null | undefined): string {
  return (expression ?? '')
    .toLowerCase()
    .replace(/[()\s]/g, '');
}

export interface ReadinessResult {
  ready: boolean;
  timestamp: string;
  checks: {
    database: ReadinessCheck;
    schema: ReadinessCheck;
    brokerSchema: ReadinessCheck;
	    migrations: ReadinessCheck;
    lifecycleRls: ReadinessCheck;
	    storage: ReadinessCheck;
    rateLimit: ReadinessCheck;
	    centrifugo: ReadinessCheck;
    realtimeOutbox: ReadinessCheck;
    lifecyclePurge: ReadinessCheck;
    search: ReadinessCheck;
    inngest: ReadinessCheck;
  };
}

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
metricsRoutes.get('/metrics', async (c) => {
  try {
    const metrics = await getMetrics();
    return c.text(metrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate metrics');
    return c.text('Error generating metrics', 500);
  }
});

/**
 * Health check endpoint (basic)
 * GET /health
 */
metricsRoutes.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
metricsRoutes.get('/health/detailed', async (c) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown' as 'ok' | 'error', message: '' },
      memory: { status: 'ok' as 'ok' | 'warning', usage: 0, limit: 0 },
    },
  };

	  // Check database connection
	  try {
	    await db.query('SELECT 1');
	    health.checks.database = { status: 'ok', message: 'Connected' };
	  } catch (error: any) {
	    logger.warn({ error }, 'Detailed health database check failed');
	    health.status = 'error';
	    health.checks.database = {
	      status: 'error',
	      message: 'Database connection failed',
	    };
	  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

  health.checks.memory = {
    status: heapUsedMB / heapTotalMB > 0.9 ? 'warning' : 'ok',
    usage: Math.round(heapUsedMB),
    limit: Math.round(heapTotalMB),
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  return c.json(health, statusCode);
});

/**
 * Readiness probe (for Kubernetes)
 * GET /ready
 */
metricsRoutes.get('/ready', async (c) => {
  const readiness = await checkReadiness();

  if (readiness.ready) {
    return c.json(readiness);
  }

  const failedChecks = Object.entries(readiness.checks)
    .filter(([, check]) => check.status === 'error')
    .map(([name]) => name);

  if (failedChecks.length > 0) {
    logger.error({ failedChecks, checks: readiness.checks }, 'Readiness check failed');
  }

  return c.json(
    {
      ...readiness,
      error: `Service not ready: ${failedChecks.join(', ')}`,
    },
    503
  );
});

export async function checkReadiness(): Promise<ReadinessResult> {
  const checks: ReadinessResult['checks'] = {
    database: { status: 'ok' },
	    schema: { status: 'ok' },
    brokerSchema: { status: 'skipped', message: 'Server mint not enabled' },
	    migrations: { status: 'skipped', message: 'Flyway history not required' },
    lifecycleRls: { status: 'skipped', message: 'Lifecycle RLS required in production' },
	    storage: { status: 'ok' },
    rateLimit: { status: 'ok' },
	    centrifugo: { status: 'ok' },
    realtimeOutbox: { status: 'ok' },
    lifecyclePurge: { status: 'ok' },
    search: { status: 'skipped', message: 'Meilisearch not configured' },
    inngest: { status: 'skipped', message: 'Inngest not configured' },
  };

	  try {
	    await db.query('SELECT 1');
	  } catch (error: any) {
	    logger.warn({ error }, 'Readiness database check failed');
	    checks.database = { status: 'error', message: 'Database unavailable' };
	  }

  try {
    const result = await db.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
	       WHERE table_schema = 'public'
	         AND table_name = ANY($1)`,
	      [REQUIRED_SCHEMA_TABLES]
	    );
	    const foundTables = new Set(result.rows.map(row => row.table_name));
	    const missingTables = REQUIRED_SCHEMA_TABLES
	      .filter(table => !foundTables.has(table));

    if (missingTables.length > 0) {
      checks.schema = {
        status: 'error',
        message: `Missing required tables: ${missingTables.join(', ')}`,
      };
	    }
	  } catch (error: any) {
	    logger.warn({ error }, 'Readiness schema check failed');
	    checks.schema = { status: 'error', message: 'Schema check failed' };
	  }

  if (config.auth.enableServerMint) {
    try {
      await assertBrokerSchemaReady();
      checks.brokerSchema = { status: 'ok' };
    } catch (error: any) {
      logger.warn({ error }, 'Readiness broker schema check failed');
      checks.brokerSchema = {
        status: 'error',
        message: error?.message || 'Broker schema check failed',
      };
    }
  }

  if (process.env.REQUIRE_FLYWAY_HISTORY === 'true') {
    try {
      const result = await db.query(
        `SELECT version, description
         FROM flyway_schema_history
         ORDER BY installed_rank DESC
         LIMIT 1`
      );
      if (result.rows.length === 0) {
        checks.migrations = { status: 'error', message: 'No Flyway migrations applied' };
      } else {
        checks.migrations = {
          status: 'ok',
          message: `Latest migration ${result.rows[0].version}: ${result.rows[0].description}`,
        };
      }
	    } catch (error: any) {
	      logger.warn({ error }, 'Readiness Flyway history check failed');
	      checks.migrations = {
	        status: 'error',
	        message: 'Flyway history unavailable',
	      };
	    }
	  }

  if (config.isProduction || process.env.REQUIRE_FLYWAY_HISTORY === 'true') {
    try {
      await assertLifecycleSchemaReady();
      checks.lifecycleRls = { status: 'ok' };
    } catch (error: any) {
      logger.warn({ error }, 'Readiness lifecycle RLS check failed');
      checks.lifecycleRls = {
        status: 'error',
        message: error?.message || 'Lifecycle RLS check failed',
      };
    }
  }

	  const storageHealth = await checkStorageHealth();
	  checks.storage = storageHealth;

  const rateLimitHealth = await checkRateLimitHealth();
  checks.rateLimit = rateLimitHealth;

	  try {
	    const healthy = await getCentrifugo().ping();
    if (!healthy) {
      checks.centrifugo = { status: 'error', message: 'Centrifugo API ping failed' };
	    }
	  } catch (error: any) {
	    logger.warn({ error }, 'Readiness Centrifugo check failed');
	    checks.centrifugo = { status: 'error', message: 'Centrifugo unavailable' };
	  }

  const outboxHealth = await checkRealtimeOutboxHealth();
	  if (outboxHealth.status === 'error') {
	    logger.warn({ message: outboxHealth.message }, 'Readiness realtime outbox check failed');
	    checks.realtimeOutbox = {
	      status: 'error',
	      message: 'Realtime outbox unavailable',
	    };
  } else {
    checks.realtimeOutbox = {
      status: 'ok',
      message: `pending=${outboxHealth.pending} failed=${outboxHealth.failed} oldest_pending_seconds=${outboxHealth.oldestPendingSeconds}`,
    };
  }

  const lifecyclePurgeHealth = await checkDataLifecyclePurgeHealth();
  if (lifecyclePurgeHealth.status === 'error') {
    logger.warn({ message: lifecyclePurgeHealth.message }, 'Readiness lifecycle purge check failed');
    checks.lifecyclePurge = {
      status: 'error',
      message: lifecyclePurgeHealth.message || 'Lifecycle purge queue unhealthy',
    };
  } else {
    checks.lifecyclePurge = {
      status: 'ok',
      message: `pending=${lifecyclePurgeHealth.pending} failed=${lifecyclePurgeHealth.failed} rejected=${lifecyclePurgeHealth.rejected} oldest_pending_seconds=${lifecyclePurgeHealth.oldestPendingSeconds}`,
    };
  }

  const searchHealth = await checkSearchHealth();
  checks.search = searchHealth;

  checks.inngest = checkInngestReadiness();

  const ready = Object.values(checks).every(check => check.status !== 'error');

  return {
    ready,
    timestamp: new Date().toISOString(),
    checks,
  };
}

export async function assertBrokerSchemaReady(): Promise<void> {
  const tables = await db.query<{ table_name: string }>(
    `SELECT c.relname AS table_name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname = ANY($1)`,
    [BROKER_SCHEMA_TABLES]
  );
  const foundTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = BROKER_SCHEMA_TABLES.filter(table => !foundTables.has(table));
  if (missingTables.length > 0) {
    throw new Error(`Missing broker tables: ${missingTables.join(', ')}`);
  }

  const migration = await db.query<{ version: string }>(
    `SELECT version
     FROM flyway_schema_history
     WHERE version = '14'
       AND success = true
     LIMIT 1`
  );
  if (migration.rows.length === 0) {
    throw new Error('Client-owned token broker migration V014 has not been applied');
  }

  const rls = await db.query<{
    relname: string;
    relrowsecurity: boolean;
    relforcerowsecurity: boolean;
  }>(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname = ANY($1)`,
    [BROKER_SCHEMA_TABLES]
  );
  const rowsByName = new Map(rls.rows.map((row) => [row.relname, row]));
  for (const table of BROKER_SCHEMA_TABLES) {
    const row = rowsByName.get(table);
    if (!row?.relrowsecurity || !row?.relforcerowsecurity) {
      throw new Error(`Broker table ${table} must have forced RLS enabled`);
    }
  }

  const policies = await db.query<{
    table_name: string;
    policy_name: string;
    command: string;
    using_expr: string | null;
    check_expr: string | null;
  }>(
    `SELECT
       c.relname AS table_name,
       p.polname AS policy_name,
       p.polcmd AS command,
       pg_get_expr(p.polqual, p.polrelid) AS using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
     FROM pg_policy p
     JOIN pg_class c ON c.oid = p.polrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = ANY($1)`,
    [BROKER_SCHEMA_TABLES]
  );
  const policiesByTable = new Map<string, typeof policies.rows>();
  for (const row of policies.rows) {
    const existing = policiesByTable.get(row.table_name) ?? [];
    existing.push(row);
    policiesByTable.set(row.table_name, existing);
  }

  const systemOnlyTables = BROKER_SCHEMA_TABLES.filter(
    table => table !== 'broker_membership_state'
  );
  for (const table of systemOnlyTables) {
    const tablePolicies = policiesByTable.get(table) ?? [];
    if (tablePolicies.length !== 1) {
      throw new Error(`Broker table ${table} must have exactly one system-only RLS policy`);
    }
    const [policy] = tablePolicies;
    const usingExpr = normalizePolicyExpression(policy.using_expr);
    const checkExpr = normalizePolicyExpression(policy.check_expr);
    const brokerSystemExpr = normalizePolicyExpression('chatsdk.is_broker_system_context()');
    if (
      policy.policy_name !== `${table}_system_only`
      || policy.command !== '*'
      || usingExpr !== brokerSystemExpr
      || checkExpr !== brokerSystemExpr
    ) {
      throw new Error(`Broker table ${table} has unsafe RLS policy`);
    }
  }

  const membershipPolicies = policiesByTable.get('broker_membership_state') ?? [];
  if (membershipPolicies.length !== 4) {
    throw new Error('Broker membership state must have separate select/insert/update/delete RLS policies');
  }
  const membershipByName = new Map(membershipPolicies.map((policy) => [policy.policy_name, policy]));
  const selectPolicy = membershipByName.get('broker_membership_state_select');
  if (
    !selectPolicy
    || selectPolicy.command !== 'r'
    || normalizePolicyExpression(selectPolicy.using_expr)
      !== normalizePolicyExpression('app_id = chatsdk.current_app_id() OR chatsdk.is_broker_system_context()')
  ) {
    throw new Error('Broker membership state has unsafe SELECT RLS policy');
  }
  for (const [name, command] of [
    ['broker_membership_state_insert', 'a'],
    ['broker_membership_state_update', 'w'],
    ['broker_membership_state_delete', 'd'],
  ] as const) {
    const policy = membershipByName.get(name);
    const usingExpr = policy?.using_expr ?? '';
    const checkExpr = policy?.check_expr ?? '';
    if (!policy || policy.command !== command) {
      throw new Error(`Broker membership state missing ${name} RLS policy`);
    }
    if (
      name !== 'broker_membership_state_insert'
      && normalizePolicyExpression(usingExpr)
        !== normalizePolicyExpression('chatsdk.is_broker_system_context()')
    ) {
      throw new Error(`Broker membership state has unsafe ${name} USING policy`);
    }
    if (
      name !== 'broker_membership_state_delete'
      && normalizePolicyExpression(checkExpr)
        !== normalizePolicyExpression('chatsdk.is_broker_system_context()')
    ) {
      throw new Error(`Broker membership state has unsafe ${name} CHECK policy`);
    }
  }

  const grantRows = await db.query<{
    table_name: string;
    privilege_type: string;
  }>(
    `SELECT table_name, privilege_type
     FROM information_schema.role_table_grants
     WHERE grantee = 'chatsdk_broker_system'
       AND table_schema = 'public'
       AND table_name = ANY($1)`,
    [Object.keys(BROKER_RUNTIME_PRIVILEGES)]
  );
  const grantSet = new Set(
    grantRows.rows.map((row) => `${row.table_name}:${row.privilege_type}`)
  );
  for (const [table, privileges] of Object.entries(BROKER_RUNTIME_PRIVILEGES)) {
    for (const privilege of privileges) {
      if (!grantSet.has(`${table}:${privilege}`)) {
        throw new Error(`Broker runtime role missing ${privilege} on ${table}`);
      }
    }
  }
}

export async function assertLifecycleSchemaReady(): Promise<void> {
  const migration = await db.query<{ version: string }>(
    `SELECT version
     FROM flyway_schema_history
     WHERE version IN ('13', '013')
       AND success = true
     LIMIT 1`
  );
  if (migration.rows.length === 0) {
    throw new Error('Production hardening migration V013 has not been applied');
  }

  const rls = await db.query<{
    relname: string;
    relrowsecurity: boolean;
    relforcerowsecurity: boolean;
  }>(
    `SELECT relname, relrowsecurity, relforcerowsecurity
     FROM pg_class
     WHERE relname = ANY($1)`,
    [[
      'data_purge_ledger',
      'data_export',
      'backup_drill',
      'backup_object_manifest',
      'backup_restore_gap',
      'search_index_outbox',
    ]]
  );
  const rowsByName = new Map(rls.rows.map((row) => [row.relname, row]));
  for (const table of [
    'data_purge_ledger',
    'data_export',
    'backup_drill',
    'backup_object_manifest',
    'backup_restore_gap',
    'search_index_outbox',
  ]) {
    const row = rowsByName.get(table);
    if (!row?.relrowsecurity || !row?.relforcerowsecurity) {
      throw new Error(`Lifecycle table ${table} must have forced RLS enabled`);
    }
  }
}

export function checkInngestReadiness(
  eventKey = config.inngest.eventKey,
  signingKey = config.inngest.signingKey,
  required = config.inngest.required
): ReadinessCheck {
  if (!eventKey && !signingKey) {
    if (required) {
      return {
        status: 'error',
        message: 'INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required',
      };
    }
    return { status: 'skipped', message: 'Inngest not configured' };
  }

  if (!eventKey || !signingKey) {
    return {
      status: 'error',
      message: 'Both INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required when Inngest is configured',
    };
  }

  return { status: 'ok' };
}

/**
 * Liveness probe (for Kubernetes)
 * GET /live
 */
metricsRoutes.get('/live', async (c) => {
  // Simple liveness check - just return 200
  return c.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});
