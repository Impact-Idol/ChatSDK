import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL && process.env.CI) {
  throw new Error('TEST_DATABASE_URL is required for realtime outbox transaction integration tests in CI');
}
const describeWithPostgres = TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('realtime outbox transaction integration', () => {
  let db: typeof import('../src/services/database').db;
  let initDB: typeof import('../src/services/database').initDB;
  let closeDB: typeof import('../src/services/database').closeDB;
  let enqueueDomainRealtimeEvent: typeof import('../src/services/realtime-events').enqueueDomainRealtimeEvent;

  const appId = randomUUID();
  const userId = `rollback-user-${Date.now()}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.DATABASE_SSL = 'false';
    process.env.NODE_ENV = 'test';

    const database = await import('../src/services/database');
    const realtimeEvents = await import('../src/services/realtime-events');

    db = database.db;
    initDB = database.initDB;
    closeDB = database.closeDB;
    enqueueDomainRealtimeEvent = realtimeEvents.enqueueDomainRealtimeEvent;

    await initDB();
    await db.query(
      `INSERT INTO app (id, name, api_key, api_secret)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [
        appId,
        'Rollback Test App',
        randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
        randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
      ]
    );
    await db.query(
      `INSERT INTO app_user (app_id, id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (app_id, id) DO NOTHING`,
      [appId, userId, 'Rollback User']
    );
  });

  afterAll(async () => {
    if (db) {
      await db.query('DELETE FROM app WHERE id = $1', [appId]);
    }
    if (closeDB) {
      await closeDB();
    }
  });

  it('rolls back durable state and outbox rows together', async () => {
    const workspaceId = randomUUID();
    const idempotencyKey = `rollback.workspace.created:${workspaceId}`;
    const sentinel = new Error('sentinel rollback after outbox enqueue');

    await expect(db.transaction(async (client) => {
      await client.query(
        `INSERT INTO workspace (id, app_id, name, type, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [workspaceId, appId, 'Rollback Workspace', 'project', userId]
      );

      await enqueueDomainRealtimeEvent(client, {
        appId,
        aggregateType: 'workspace',
        aggregateId: workspaceId,
        eventType: 'workspace.created',
        channels: [`user:${appId}:${userId}`],
        payload: { workspaceId },
        idempotencyKey,
      });

      throw sentinel;
    })).rejects.toThrow(sentinel.message);

    const workspace = await db.query(
      'SELECT id FROM workspace WHERE id = $1 AND app_id = $2',
      [workspaceId, appId]
    );
    const outbox = await db.query(
      'SELECT id FROM event_outbox WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    expect(workspace.rows).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
  });

  it('commits durable state and outbox row together on success', async () => {
    const workspaceId = randomUUID();

    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO workspace (id, app_id, name, type, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [workspaceId, appId, 'Committed Workspace', 'project', userId]
      );

      await enqueueDomainRealtimeEvent(client, {
        appId,
        aggregateType: 'workspace',
        aggregateId: workspaceId,
        eventType: 'workspace.created',
        channels: [`user:${appId}:${userId}`],
        payload: { workspaceId },
      });
    });

    const result = await db.query(
      `SELECT w.id AS workspace_id, eo.id AS outbox_id, eo.status
       FROM workspace w
       JOIN event_outbox eo
         ON eo.aggregate_id = w.id::text
        AND eo.app_id = w.app_id
       WHERE w.id = $1 AND w.app_id = $2`,
      [workspaceId, appId]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows).toEqual([
      expect.objectContaining({
        workspace_id: workspaceId,
        status: expect.stringMatching(/^(pending|processing|published)$/),
      }),
    ]);
  });
});
