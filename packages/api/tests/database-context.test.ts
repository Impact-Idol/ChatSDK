import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryCall = { sql: string; params?: any[] };

const mocks = vi.hoisted(() => {
  const clientCalls: QueryCall[] = [];
  const poolCalls: QueryCall[] = [];

  const mockClient = {
    query: vi.fn((sql: string, params?: any[]) => {
      clientCalls.push({ sql, params });
      return Promise.resolve({ rows: [] });
    }),
    release: vi.fn(),
  };

  const mockPool = {
    connect: vi.fn(() => Promise.resolve(mockClient)),
    query: vi.fn((sql: string, params?: any[]) => {
      poolCalls.push({ sql, params });
      return Promise.resolve({ rows: [] });
    }),
    end: vi.fn(() => Promise.resolve()),
  };

  return { clientCalls, poolCalls, mockClient, mockPool };
});

vi.mock('pg', () => ({
  Pool: class {
    constructor() {
      return mocks.mockPool;
    }
  },
}));

describe('database tenant context', () => {
  beforeEach(async () => {
    vi.resetModules();
    mocks.clientCalls.length = 0;
    mocks.poolCalls.length = 0;
    mocks.mockClient.query.mockClear();
    mocks.mockClient.release.mockClear();
    mocks.mockPool.connect.mockClear();
    mocks.mockPool.query.mockClear();
    mocks.mockPool.end.mockClear();
  });

  it('routes db.query through short tenant-scoped query transactions', async () => {
    const { db, initDB, closeDB } = await import('../src/services/database');
    await initDB();
    mocks.clientCalls.length = 0;

    await db.withTenantContext(
      {
        appId: '00000000-0000-0000-0000-000000000001',
        userId: 'alice',
      },
      async () => {
        await db.query('SELECT * FROM message WHERE app_id = $1', ['app']);
        await db.transaction(async (client) => {
          await client.query('INSERT INTO message DEFAULT VALUES');
        });
      }
    );

    expect(mocks.poolCalls).toEqual([]);
    expect(mocks.clientCalls.map((call) => call.sql)).toEqual([
      'BEGIN',
      expect.stringContaining("set_config('app.current_app_id'"),
      'SELECT * FROM message WHERE app_id = $1',
      'COMMIT',
      'BEGIN',
      expect.stringContaining("set_config('app.current_app_id'"),
      'INSERT INTO message DEFAULT VALUES',
      'COMMIT',
    ]);
    expect(mocks.clientCalls[1].params).toEqual([
      '00000000-0000-0000-0000-000000000001',
      'alice',
      'false',
    ]);

    await closeDB();
  });

  it('uses the raw pool outside tenant context', async () => {
    const { db, initDB, closeDB } = await import('../src/services/database');
    await initDB();
    mocks.clientCalls.length = 0;

    await db.query('SELECT 1');

    expect(mocks.poolCalls.map((call) => call.sql)).toEqual(['SELECT 1']);
    expect(mocks.clientCalls).toEqual([]);

    await closeDB();
  });

  it('sets explicit system context for cross-app workers', async () => {
    const { db, initDB, closeDB } = await import('../src/services/database');
    await initDB();
    mocks.clientCalls.length = 0;

    await db.withSystemContext(async () => {
      await db.query('UPDATE event_outbox SET status = $1', ['processing']);
    });

    expect(mocks.clientCalls[1].params).toEqual(['', '', 'true']);
    expect(mocks.clientCalls.map((call) => call.sql)).toContain('UPDATE event_outbox SET status = $1');

    await closeDB();
  });

	  it('uses a fresh client for isolated system context inside tenant context', async () => {
    const { db, initDB, closeDB } = await import('../src/services/database');
    await initDB();
    mocks.clientCalls.length = 0;
    mocks.mockPool.connect.mockClear();

    await db.withTenantContext(
      {
        appId: '00000000-0000-0000-0000-000000000001',
        userId: 'alice',
      },
      async () => {
        await db.query('SELECT tenant scoped');
        await db.withSystemContext(async () => {
          await db.query('SELECT system scoped');
        });
      }
    );

    expect(mocks.mockPool.connect).toHaveBeenCalledTimes(2);
    expect(mocks.clientCalls.map((call) => call.sql)).toEqual([
      'BEGIN',
      expect.stringContaining("set_config('app.current_app_id'"),
      'SELECT tenant scoped',
      'COMMIT',
      'BEGIN',
      expect.stringContaining("set_config('app.current_app_id'"),
      'SELECT system scoped',
      'COMMIT',
    ]);
    expect(mocks.clientCalls[5].params).toEqual(['', '', 'true']);

	    await closeDB();
	  });

  it('rejects tenant identity switches inside an active context', async () => {
	    const { db, initDB, closeDB } = await import('../src/services/database');
	    await initDB();
	    mocks.clientCalls.length = 0;

	    await expect(
	      db.withTenantContext(
	        {
	          appId: '00000000-0000-0000-0000-000000000001',
	          userId: 'alice',
	        },
	        async () => {
	          await db.withTenantContext(
	            {
	              appId: '00000000-0000-0000-0000-000000000002',
	              userId: 'alice',
	            },
	            async () => {
	              await db.query('SELECT switched tenant');
	            }
	          );
	        }
	      )
	    ).rejects.toThrow('Cannot switch tenant DB context');

	    expect(mocks.clientCalls).toEqual([]);

	    await closeDB();
	  });

  it('rejects explicit user context clearing inside an active context', async () => {
    const { db, initDB, closeDB } = await import('../src/services/database');
    await initDB();
    mocks.clientCalls.length = 0;

    await expect(
      db.withTenantContext(
        {
          appId: '00000000-0000-0000-0000-000000000001',
          userId: 'alice',
        },
        async () => {
          await db.withTenantContext(
            {
              appId: '00000000-0000-0000-0000-000000000001',
              userId: undefined,
            },
            async () => {
              await db.query('SELECT cleared user');
            }
          );
        }
      )
    ).rejects.toThrow('Cannot switch tenant DB context');

    expect(mocks.clientCalls).toEqual([]);

    await closeDB();
  });

  it('rejects spoofed broker context markers from tenant context callers', async () => {
    const { db, initDB, closeDB } = await import('../src/services/database');
    await initDB();
    mocks.clientCalls.length = 0;

    await expect(
      db.withTenantContext(
        {
          appId: '00000000-0000-0000-0000-000000000001',
          brokerSystem: true,
        } as any,
        async () => {
          await db.query('SELECT broker scoped');
        }
      )
    ).rejects.toThrow('Broker DB context cannot be set through tenant context');

    expect(mocks.clientCalls).toEqual([]);

    await closeDB();
  });

  it('rejects tenant context switches inside an active broker context', async () => {
    const { db, closeDB } = await import('../src/services/database');

    await expect(
      db.withBrokerSystemContext(async () => {
        await db.withTenantContext(
          {
            appId: '00000000-0000-0000-0000-000000000001',
            userId: 'alice',
          },
          async () => {
            await db.query('SELECT tenant inside broker');
          }
        );
      })
    ).rejects.toThrow('Cannot switch tenant DB context inside an active broker DB context');

    await closeDB();
  });

  it('rejects isolated tenant context escapes inside an active broker context', async () => {
    const { db, closeDB } = await import('../src/services/database');

    await expect(
      db.withBrokerSystemContext(async () => {
        await db.withIsolatedTenantContext(
          {
            appId: '00000000-0000-0000-0000-000000000001',
            userId: 'alice',
          },
          async () => {
            await db.query('SELECT isolated tenant inside broker');
          }
        );
      })
    ).rejects.toThrow('Cannot switch tenant DB context inside an active broker DB context');

    await closeDB();
  });

  it('verifies the broker runtime role once per pool lifetime', async () => {
    const originalRequireRlsRoleCheck = process.env.REQUIRE_RLS_ROLE_CHECK;
    process.env.REQUIRE_RLS_ROLE_CHECK = 'true';
    mocks.mockClient.query.mockImplementation((sql: string, params?: any[]) => {
      mocks.clientCalls.push({ sql, params });
      if (sql.includes('FROM pg_roles')) {
        return Promise.resolve({
          rows: [{
            current_user: 'chatsdk_broker_system',
            rolsuper: false,
            rolbypassrls: false,
          }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    try {
      const { db, closeDB } = await import('../src/services/database');

      await db.withBrokerSystemContext(async () => {
        await db.query('SELECT broker scoped one');
      });
      await db.withBrokerSystemContext(async () => {
        await db.query('SELECT broker scoped two');
      });

      expect(mocks.clientCalls.filter((call) => call.sql.includes('FROM pg_roles'))).toHaveLength(1);
      expect(mocks.clientCalls.map((call) => call.sql)).toContain('SELECT broker scoped one');
      expect(mocks.clientCalls.map((call) => call.sql)).toContain('SELECT broker scoped two');

      await closeDB();
    } finally {
      if (originalRequireRlsRoleCheck === undefined) {
        delete process.env.REQUIRE_RLS_ROLE_CHECK;
      } else {
        process.env.REQUIRE_RLS_ROLE_CHECK = originalRequireRlsRoleCheck;
      }
    }
  });
	});
