import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL && process.env.CI) {
  throw new Error('TEST_DATABASE_URL is required for tenant RLS integration tests in CI');
}
const describeWithPostgres = TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('tenant RLS integration', () => {
  let db: typeof import('../src/services/database').db;
  let initDB: typeof import('../src/services/database').initDB;
  let closeDB: typeof import('../src/services/database').closeDB;

	  const appA = randomUUID();
	  const appB = randomUUID();
	  const channelA = randomUUID();
	  const channelB = randomUUID();
	  const globalTemplate = randomUUID();
	  const userA = `rls-user-a-${Date.now()}`;
	  const userB = `rls-user-b-${Date.now()}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.DATABASE_SSL = 'false';
    process.env.NODE_ENV = 'test';

    const database = await import('../src/services/database');
    db = database.db;
    initDB = database.initDB;
    closeDB = database.closeDB;

    await initDB();
    await db.query(
      `INSERT INTO app (id, name, api_key, api_secret)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        appA,
        'RLS App A',
        randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
        randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
        appB,
        'RLS App B',
        randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
        randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
      ]
    );
	    await db.withSystemContext(async () => {
	      await db.query(
	        `INSERT INTO app_user (app_id, id, name)
	         VALUES ($1, $2, $3), ($4, $5, $6)
	         ON CONFLICT (app_id, id) DO NOTHING`,
	        [appA, userA, 'RLS User A', appB, userB, 'RLS User B']
	      );
	      await db.query(
	        `INSERT INTO channel (id, app_id, cid, created_by)
	         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
	         ON CONFLICT (id) DO NOTHING`,
	        [
	          channelA,
	          appA,
	          `rls-a-${channelA}`,
	          userA,
	          channelB,
	          appB,
	          `rls-b-${channelB}`,
	          userB,
	        ]
	      );
	      await db.query(
	        `INSERT INTO workspace_template
	         (id, name, category, config, channels, is_public)
	         VALUES ($1, $2, $3, $4, $5, true)
	         ON CONFLICT (id) DO NOTHING`,
	        [
	          globalTemplate,
	          'RLS Global Template',
	          'team',
	          JSON.stringify({ version: 1 }),
	          JSON.stringify([]),
	        ]
	      );
	    });
	  });

  afterAll(async () => {
	    if (db) {
	      await db.withSystemContext(async () => {
	        await db.query('DELETE FROM workspace_template WHERE id = $1', [globalTemplate]);
	        await db.query('DELETE FROM app WHERE id = ANY($1)', [[appA, appB]]);
	      });
	    }
    if (closeDB) {
      await closeDB();
    }
  });

  it('shows only current app rows inside tenant context', async () => {
    const result = await db.withTenantContext({ appId: appA, userId: userA }, () =>
      db.query('SELECT app_id, id FROM app_user ORDER BY id')
    );

    expect(result.rows).toEqual([{ app_id: appA, id: userA }]);
  });

  it('lets system context see cross-app worker rows explicitly', async () => {
    const result = await db.withSystemContext(() =>
      db.query('SELECT app_id, id FROM app_user WHERE app_id = ANY($1) ORDER BY app_id', [[appA, appB]])
    );

    expect(result.rows).toHaveLength(2);
  });

	  it('blocks cross-app writes inside tenant context', async () => {
    await expect(db.withTenantContext({ appId: appA, userId: userA }, () =>
      db.query(
        `INSERT INTO app_user (app_id, id, name)
         VALUES ($1, $2, $3)`,
        [appB, 'rls-cross-write', 'Cross Write']
      )
	    )).rejects.toThrow();
	  });

	  it('prevents next_channel_seq from incrementing another tenant channel', async () => {
	    const ownResult = await db.withTenantContext({ appId: appA, userId: userA }, () =>
	      db.query('SELECT next_channel_seq($1) AS seq', [channelA])
	    );

	    expect(ownResult.rows[0].seq).toBe('1');

	    await expect(
	      db.withTenantContext({ appId: appA, userId: userA }, () =>
	        db.query('SELECT next_channel_seq($1)', [channelB])
	      )
	    ).rejects.toThrow();
	  });

	  it('allows tenants to read but not mutate global public workspace templates', async () => {
	    const readResult = await db.withTenantContext({ appId: appA, userId: userA }, () =>
	      db.query('SELECT id FROM workspace_template WHERE id = $1', [globalTemplate])
	    );

	    expect(readResult.rows).toEqual([{ id: globalTemplate }]);

	    const updateResult = await db.withTenantContext({ appId: appA, userId: userA }, () =>
	      db.query(
	        `UPDATE workspace_template
	         SET usage_count = usage_count + 1
	         WHERE id = $1
	         RETURNING id`,
	        [globalTemplate]
	      )
	    );

	    expect(updateResult.rows).toEqual([]);
	  });
	});
