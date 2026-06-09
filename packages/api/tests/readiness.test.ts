import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const mockPing = vi.fn();
const mockCheckSearchHealth = vi.fn();
const mockCheckStorageHealth = vi.fn();
const mockCheckRateLimitHealth = vi.fn();

const requiredTables = [
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

const brokerTables = [
  'broker_app_scope',
  'broker_client',
  'broker_credential',
  'broker_jwt_replay',
  'broker_membership_state',
  'broker_mint_audit',
];

const brokerRuntimePrivileges: Record<string, string[]> = {
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

const forcedRlsTables = [
  'data_purge_ledger',
  'data_export',
  'backup_drill',
  'backup_object_manifest',
  'backup_restore_gap',
  'search_index_outbox',
];

function brokerPolicyRows(extraRows: any[] = []) {
  return [
    ...brokerTables.flatMap((table_name) => {
      if (table_name === 'broker_membership_state') {
        return [
          {
            table_name,
            policy_name: 'broker_membership_state_select',
            command: 'r',
            using_expr: '(app_id = chatsdk.current_app_id()) OR chatsdk.is_broker_system_context()',
            check_expr: null,
          },
          {
            table_name,
            policy_name: 'broker_membership_state_insert',
            command: 'a',
            using_expr: null,
            check_expr: 'chatsdk.is_broker_system_context()',
          },
          {
            table_name,
            policy_name: 'broker_membership_state_update',
            command: 'w',
            using_expr: 'chatsdk.is_broker_system_context()',
            check_expr: 'chatsdk.is_broker_system_context()',
          },
          {
            table_name,
            policy_name: 'broker_membership_state_delete',
            command: 'd',
            using_expr: 'chatsdk.is_broker_system_context()',
            check_expr: null,
          },
        ];
      }
      return [{
        table_name,
        policy_name: `${table_name}_system_only`,
        command: '*',
        using_expr: 'chatsdk.is_broker_system_context()',
        check_expr: 'chatsdk.is_broker_system_context()',
      }];
    }),
    ...extraRows,
  ];
}

function brokerGrantRows() {
  return Object.entries(brokerRuntimePrivileges).flatMap(([table_name, privileges]) =>
    privileges.map((privilege_type) => ({ table_name, privilege_type }))
  );
}

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

vi.mock('../src/services/centrifugo', () => ({
  getCentrifugo: vi.fn(() => ({
    ping: () => mockPing(),
  })),
}));

vi.mock('../src/services/search', () => ({
  checkSearchHealth: () => mockCheckSearchHealth(),
}));

vi.mock('../src/services/storage', () => ({
  checkStorageHealth: () => mockCheckStorageHealth(),
}));

vi.mock('../src/services/rate-limit', () => ({
  checkRateLimitHealth: () => mockCheckRateLimitHealth(),
}));

vi.mock('../src/services/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { config } from '../src/config/defaults';
import { checkInngestReadiness, checkReadiness } from '../src/routes/metrics';

function setupHealthyMocks() {
  mockQuery.mockImplementation((sql: string, params?: any[]) => {
    if (sql.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }] };
    }
    if (sql.includes('information_schema.tables')) {
      const requestedTables = Array.isArray(params?.[0]) ? params[0] : requiredTables;
      return {
        rows: requestedTables.map((table_name: string) => ({ table_name })),
      };
    }
    if (sql.includes('information_schema.role_table_grants')) {
      return { rows: brokerGrantRows() };
    }
    if (sql.includes("WHERE version = '13'")) {
      return { rows: [{ version: '13' }] };
    }
    if (sql.includes("WHERE version = '14'")) {
      return { rows: [{ version: '14' }] };
    }
    if (sql.includes('flyway_schema_history')) {
      return { rows: [{ version: '1', description: 'baseline' }] };
    }
    if (sql.includes('FROM pg_policy')) {
      return {
        rows: brokerPolicyRows(),
      };
    }
    if (sql.includes('FROM pg_class')) {
      const requestedTables = Array.isArray(params?.[0]) ? params[0] : forcedRlsTables;
      if (sql.includes('AS table_name')) {
        return {
          rows: requestedTables.map((table_name: string) => ({ table_name })),
        };
      }
      return {
        rows: requestedTables.map((relname: string) => ({
          relname,
          relrowsecurity: true,
          relforcerowsecurity: true,
        })),
      };
    }
    if (sql.includes('FROM data_purge_ledger')) {
      return {
        rows: [{
          pending: '0',
          failed: '0',
          rejected: '0',
          oldest_pending_seconds: null,
        }],
      };
    }
    return { rows: [] };
  });
  mockPing.mockResolvedValue(true);
}

describe('readiness checks', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPing.mockReset();
    mockCheckSearchHealth.mockReset();
    mockCheckStorageHealth.mockReset();
    mockCheckRateLimitHealth.mockReset();
    delete process.env.REQUIRE_FLYWAY_HISTORY;
    setupHealthyMocks();
    mockCheckStorageHealth.mockResolvedValue({ status: 'ok' });
    mockCheckRateLimitHealth.mockResolvedValue({ status: 'ok' });
    mockCheckSearchHealth.mockResolvedValue({
      status: 'skipped',
      message: 'Meilisearch not configured',
    });
    config.auth.enableServerMint = false;
  });

  it('is ready when DB, schema, and Centrifugo are healthy', async () => {
    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.checks.database.status).toBe('ok');
    expect(readiness.checks.schema.status).toBe('ok');
    expect(readiness.checks.brokerSchema.status).toBe('skipped');
    expect(readiness.checks.migrations.status).toBe('skipped');
    expect(readiness.checks.storage.status).toBe('ok');
    expect(readiness.checks.rateLimit.status).toBe('ok');
    expect(readiness.checks.centrifugo.status).toBe('ok');
    expect(readiness.checks.lifecyclePurge.status).toBe('ok');
    expect(readiness.checks.search.status).toBe('skipped');
    expect(readiness.checks.inngest.status).toBe('skipped');
  });

  it('checks broker schema when server mint is enabled', async () => {
    config.auth.enableServerMint = true;

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.checks.brokerSchema).toEqual({ status: 'ok' });
  });

  it('fails readiness when server mint is enabled but broker tables are missing', async () => {
    config.auth.enableServerMint = true;
    mockQuery.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : requiredTables;
        if (requestedTables.includes('broker_client')) {
          return {
            rows: brokerTables
              .filter((table_name) => table_name !== 'broker_credential')
              .map((table_name) => ({ table_name })),
          };
        }
        return {
          rows: requestedTables.map((table_name: string) => ({ table_name })),
        };
      }
      if (sql.includes('information_schema.role_table_grants')) {
        return { rows: brokerGrantRows() };
      }
      if (sql.includes("WHERE version = '13'")) {
        return { rows: [{ version: '13' }] };
      }
      if (sql.includes("WHERE version = '14'")) {
        return { rows: [{ version: '14' }] };
      }
      if (sql.includes('flyway_schema_history')) {
        return { rows: [{ version: '14', description: 'client owned token broker' }] };
      }
      if (sql.includes('FROM pg_policy')) {
        return {
          rows: brokerPolicyRows(),
        };
      }
      if (sql.includes('FROM pg_class')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : forcedRlsTables;
        if (sql.includes('AS table_name')) {
          if (requestedTables.includes('broker_client')) {
            return {
              rows: brokerTables
                .filter((table_name) => table_name !== 'broker_credential')
                .map((table_name) => ({ table_name })),
            };
          }
          return {
            rows: requestedTables.map((table_name: string) => ({ table_name })),
          };
        }
        return {
          rows: requestedTables.map((relname: string) => ({
            relname,
            relrowsecurity: true,
            relforcerowsecurity: true,
          })),
        };
      }
      if (sql.includes('FROM data_purge_ledger')) {
        return {
          rows: [{
            pending: '0',
            failed: '0',
            rejected: '0',
            oldest_pending_seconds: null,
          }],
        };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.brokerSchema.status).toBe('error');
    expect(readiness.checks.brokerSchema.message).toContain('broker_credential');
  });

  it('fails readiness when a broker table has an extra permissive policy', async () => {
    config.auth.enableServerMint = true;
    mockQuery.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : requiredTables;
        return {
          rows: requestedTables.map((table_name: string) => ({ table_name })),
        };
      }
      if (sql.includes('information_schema.role_table_grants')) {
        return { rows: brokerGrantRows() };
      }
      if (sql.includes("WHERE version = '13'")) {
        return { rows: [{ version: '13' }] };
      }
      if (sql.includes("WHERE version = '14'")) {
        return { rows: [{ version: '14' }] };
      }
      if (sql.includes('flyway_schema_history')) {
        return { rows: [{ version: '14', description: 'client owned token broker' }] };
      }
      if (sql.includes('FROM pg_policy')) {
        return {
          rows: [
            ...brokerPolicyRows(),
            {
              table_name: 'broker_credential',
              policy_name: 'allow_all',
              command: '*',
              using_expr: 'true',
              check_expr: 'true',
            },
          ],
        };
      }
      if (sql.includes('FROM pg_class')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : forcedRlsTables;
        if (sql.includes('AS table_name')) {
          return {
            rows: requestedTables.map((table_name: string) => ({ table_name })),
          };
        }
        return {
          rows: requestedTables.map((relname: string) => ({
            relname,
            relrowsecurity: true,
            relforcerowsecurity: true,
          })),
        };
      }
      if (sql.includes('FROM data_purge_ledger')) {
        return {
          rows: [{
            pending: '0',
            failed: '0',
            rejected: '0',
            oldest_pending_seconds: null,
          }],
        };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.brokerSchema.status).toBe('error');
    expect(readiness.checks.brokerSchema.message).toContain('broker_credential');
  });

  it('fails readiness when an expected broker policy contains a permissive expression', async () => {
    config.auth.enableServerMint = true;
    mockQuery.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : requiredTables;
        return {
          rows: requestedTables.map((table_name: string) => ({ table_name })),
        };
      }
      if (sql.includes('information_schema.role_table_grants')) {
        return { rows: brokerGrantRows() };
      }
      if (sql.includes("WHERE version = '13'")) {
        return { rows: [{ version: '13' }] };
      }
      if (sql.includes("WHERE version = '14'")) {
        return { rows: [{ version: '14' }] };
      }
      if (sql.includes('flyway_schema_history')) {
        return { rows: [{ version: '14', description: 'client owned token broker' }] };
      }
      if (sql.includes('FROM pg_policy')) {
        return {
          rows: brokerPolicyRows().map((row) => row.table_name === 'broker_credential'
            ? { ...row, using_expr: 'chatsdk.is_broker_system_context() OR true' }
            : row),
        };
      }
      if (sql.includes('FROM pg_class')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : forcedRlsTables;
        if (sql.includes('AS table_name')) {
          return {
            rows: requestedTables.map((table_name: string) => ({ table_name })),
          };
        }
        return {
          rows: requestedTables.map((relname: string) => ({
            relname,
            relrowsecurity: true,
            relforcerowsecurity: true,
          })),
        };
      }
      if (sql.includes('FROM data_purge_ledger')) {
        return {
          rows: [{
            pending: '0',
            failed: '0',
            rejected: '0',
            oldest_pending_seconds: null,
          }],
        };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.brokerSchema.status).toBe('error');
    expect(readiness.checks.brokerSchema.message).toContain('broker_credential');
  });

  it('fails readiness when the broker runtime role is missing required grants', async () => {
    config.auth.enableServerMint = true;
    mockQuery.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : requiredTables;
        return {
          rows: requestedTables.map((table_name: string) => ({ table_name })),
        };
      }
      if (sql.includes('information_schema.role_table_grants')) {
        return {
          rows: brokerGrantRows().filter(
            (row) => !(row.table_name === 'event_outbox' && row.privilege_type === 'INSERT')
          ),
        };
      }
      if (sql.includes("WHERE version = '13'")) {
        return { rows: [{ version: '13' }] };
      }
      if (sql.includes("WHERE version = '14'")) {
        return { rows: [{ version: '14' }] };
      }
      if (sql.includes('flyway_schema_history')) {
        return { rows: [{ version: '14', description: 'client owned token broker' }] };
      }
      if (sql.includes('FROM pg_policy')) {
        return { rows: brokerPolicyRows() };
      }
      if (sql.includes('FROM pg_class')) {
        const requestedTables = Array.isArray(params?.[0]) ? params[0] : forcedRlsTables;
        if (sql.includes('AS table_name')) {
          return {
            rows: requestedTables.map((table_name: string) => ({ table_name })),
          };
        }
        return {
          rows: requestedTables.map((relname: string) => ({
            relname,
            relrowsecurity: true,
            relforcerowsecurity: true,
          })),
        };
      }
      if (sql.includes('FROM data_purge_ledger')) {
        return {
          rows: [{
            pending: '0',
            failed: '0',
            rejected: '0',
            oldest_pending_seconds: null,
          }],
        };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.brokerSchema.status).toBe('error');
    expect(readiness.checks.brokerSchema.message).toContain('event_outbox');
  });

  it('fails readiness when the database is unavailable', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT 1')) {
        throw new Error('database down');
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.database).toEqual({
      status: 'error',
      message: 'Database unavailable',
    });
  });

  it('fails readiness when required core tables are missing', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        return { rows: [{ table_name: 'app' }] };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.schema.status).toBe('error');
    expect(readiness.checks.schema.message).toContain('app_user');
  });

  it('fails readiness when Flyway history is required but unavailable', async () => {
    process.env.REQUIRE_FLYWAY_HISTORY = 'true';
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        return {
          rows: requiredTables.map((table_name) => ({ table_name })),
        };
      }
      if (sql.includes('flyway_schema_history')) {
        throw new Error('relation "flyway_schema_history" does not exist');
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

	    expect(readiness.ready).toBe(false);
	    expect(readiness.checks.migrations.status).toBe('error');
	    expect(readiness.checks.migrations.message).toBe('Flyway history unavailable');
	  });

  it('fails readiness when lifecycle RLS is not forced while migration checks are required', async () => {
    process.env.REQUIRE_FLYWAY_HISTORY = 'true';
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        return {
          rows: requiredTables.map((table_name) => ({ table_name })),
        };
      }
      if (sql.includes("WHERE version = '13'")) {
        return { rows: [{ version: '13' }] };
      }
      if (sql.includes('flyway_schema_history')) {
        return { rows: [{ version: '13', description: 'runtime role sequence execute' }] };
      }
      if (sql.includes('FROM pg_class')) {
        return {
          rows: forcedRlsTables.map((relname) => ({
            relname,
            relrowsecurity: true,
            relforcerowsecurity: relname !== 'data_purge_ledger',
          })),
        };
      }
      if (sql.includes('FROM data_purge_ledger')) {
        return {
          rows: [{
            pending: '0',
            failed: '0',
            rejected: '0',
            oldest_pending_seconds: null,
          }],
        };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.lifecycleRls.status).toBe('error');
    expect(readiness.checks.lifecycleRls.message).toContain('forced RLS');
  });

  it('fails readiness when Centrifugo ping fails', async () => {
    mockPing.mockResolvedValue(false);

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.centrifugo).toEqual({
      status: 'error',
      message: 'Centrifugo API ping failed',
    });
  });

  it('fails readiness when lifecycle purge backlog is stale', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('information_schema.tables')) {
        return {
          rows: requiredTables.map((table_name) => ({ table_name })),
        };
      }
      if (sql.includes('FROM data_purge_ledger')) {
        return {
          rows: [{
            pending: '3',
            failed: '0',
            rejected: '0',
            oldest_pending_seconds: '901.2',
          }],
        };
      }
      return { rows: [] };
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.lifecyclePurge.status).toBe('error');
    expect(readiness.checks.lifecyclePurge.message).toContain('Lifecycle purge unhealthy');
  });

  it('fails readiness when required rate-limit Redis is unavailable', async () => {
    mockCheckRateLimitHealth.mockResolvedValue({
      status: 'error',
      message: 'Rate-limit Redis unavailable',
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.rateLimit).toEqual({
      status: 'error',
      message: 'Rate-limit Redis unavailable',
    });
  });

  it('fails readiness when configured Meilisearch is unhealthy', async () => {
    mockCheckSearchHealth.mockResolvedValueOnce({
      status: 'error',
      message: 'Meilisearch unavailable',
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.search).toEqual({
      status: 'error',
      message: 'Meilisearch unavailable',
    });
  });

  it('fails readiness when production storage is unavailable', async () => {
    mockCheckStorageHealth.mockResolvedValueOnce({
      status: 'error',
      message: 'Storage bucket unavailable',
    });

    const readiness = await checkReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.storage).toEqual({
      status: 'error',
      message: 'Storage bucket unavailable',
    });
  });

  it('reports Inngest readiness modes explicitly', () => {
    expect(checkInngestReadiness('', '')).toEqual({
      status: 'skipped',
      message: 'Inngest not configured',
    });
    expect(checkInngestReadiness('', '', true)).toEqual({
      status: 'error',
      message: 'INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required',
    });
    expect(checkInngestReadiness('event-key', '')).toEqual({
      status: 'error',
      message: 'Both INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required when Inngest is configured',
    });
    expect(checkInngestReadiness('event-key', 'signing-key')).toEqual({ status: 'ok' });
  });
});
