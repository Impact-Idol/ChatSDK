/**
 * Tests for Part 2.4: Idempotency Key for createChannel
 *
 * Tests POST /api/channels with idempotencyKey field.
 * The API uses ON CONFLICT DO NOTHING for atomic idempotency — if the INSERT
 * conflicts on (app_id, idempotency_key), it returns null from the transaction,
 * then re-fetches and returns the existing channel (200).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database before importing anything that uses it
const mockQuery = vi.fn();
const mockTransaction = vi.fn();
vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    transaction: (fn: any) => mockTransaction(fn),
  },
  initDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock centrifugo
vi.mock('../src/services/centrifugo', () => ({
  centrifugo: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    publishChannelCreated: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../src/services/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const mocked: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    const val = actual[key];
    if (typeof val === 'function') {
      mocked[key] = vi.fn();
    } else if (typeof val === 'object' && val !== null) {
      const obj: Record<string, unknown> = {};
      for (const method of Object.keys(val as Record<string, unknown>)) {
        obj[method] = vi.fn();
      }
      mocked[key] = obj;
    } else {
      mocked[key] = val;
    }
  }
  return mocked;
});

import { app } from '../src/index';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';
const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = 'user-111';
const TEST_API_KEY = 'a'.repeat(64);

async function generateToken(userId: string, appId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ user_id: userId, app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function makeChannelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    app_id: TEST_APP_ID,
    cid: 'group:33333333-3333-3333-3333-333333333333',
    type: 'group',
    name: 'Test Group',
    image_url: null,
    config: {},
    member_count: 2,
    message_count: 0,
    last_message_at: null,
    created_by: TEST_USER_ID,
    created_at: '2026-01-30T00:00:00Z',
    updated_at: '2026-01-30T00:00:00Z',
    workspace_id: null,
    idempotency_key: null,
    ...overrides,
  };
}

async function createChannel(body: object) {
  const token = await generateToken(TEST_USER_ID, TEST_APP_ID);
  return app.request('/api/channels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-API-Key': TEST_API_KEY,
    },
    body: JSON.stringify(body),
  });
}

/** Standard auth mocks: app lookup + user lookup + CID check (no match) */
function setupAuthMocks() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('SELECT id, name, image_url FROM app_user')) {
      return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
    }
    // CID check — no existing channel
    if (sql.includes('SELECT id FROM channel WHERE app_id') && sql.includes('cid')) {
      return { rows: [] };
    }
    return { rows: [] };
  });
}

describe('POST /api/channels - idempotency key', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
  });

  it('AC1: should create channel with idempotencyKey and return 201', async () => {
    setupAuthMocks();

    const channelRow = makeChannelRow({ idempotency_key: 'idem-key-1' });
    // Transaction INSERT succeeds (returns row)
    mockTransaction.mockImplementation(async (fn: any) => {
      const txClient = {
        query: vi.fn().mockResolvedValue({ rows: [channelRow] }),
      };
      return fn(txClient);
    });

    const res = await createChannel({
      type: 'group',
      name: 'Test Group',
      memberIds: ['other-user'],
      idempotencyKey: 'idem-key-1',
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.idempotencyKey).toBe('idem-key-1');
  });

  it('AC2: should return existing channel (200) when idempotencyKey conflicts (atomic)', async () => {
    const existingRow = makeChannelRow({ idempotency_key: 'idem-key-dup' });

    // Auth mocks + post-transaction re-fetch of existing channel
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
      }
      if (sql.includes('SELECT id FROM channel WHERE app_id') && sql.includes('cid')) {
        return { rows: [] };
      }
      // Post-transaction re-fetch by idempotency_key
      if (sql.includes('idempotency_key')) {
        return { rows: [existingRow] };
      }
      return { rows: [] };
    });

    // Transaction INSERT hits ON CONFLICT DO NOTHING → returns 0 rows → tx returns null
    mockTransaction.mockImplementation(async (fn: any) => {
      const txClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }), // ON CONFLICT DO NOTHING
      };
      return fn(txClient);
    });

    const res = await createChannel({
      type: 'group',
      name: 'Test Group',
      memberIds: ['other-user'],
      idempotencyKey: 'idem-key-dup',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(existingRow.id);
  });

  it('AC3: should create different channels for different idempotencyKeys', async () => {
    setupAuthMocks();

    const row1 = makeChannelRow({ id: 'aaaa-1111', idempotency_key: 'key-a' });
    const row2 = makeChannelRow({ id: 'bbbb-2222', idempotency_key: 'key-b' });
    let callCount = 0;

    // Both INSERTs succeed (different keys, no conflict)
    mockTransaction.mockImplementation(async (fn: any) => {
      callCount++;
      const row = callCount === 1 ? row1 : row2;
      const txClient = {
        query: vi.fn().mockResolvedValue({ rows: [row] }),
      };
      return fn(txClient);
    });

    const res1 = await createChannel({
      type: 'group',
      name: 'Group A',
      memberIds: ['other-user'],
      idempotencyKey: 'key-a',
    });

    const res2 = await createChannel({
      type: 'group',
      name: 'Group B',
      memberIds: ['other-user'],
      idempotencyKey: 'key-b',
    });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    const data1 = await res1.json();
    const data2 = await res2.json();
    expect(data1.id).not.toBe(data2.id);
  });

  it('AC4: should allow duplicate channels when no idempotencyKey provided', async () => {
    setupAuthMocks();

    const row1 = makeChannelRow({ id: 'cccc-1111' });
    const row2 = makeChannelRow({ id: 'dddd-2222' });
    let callCount = 0;

    // Both INSERTs succeed (no idempotency key → no conflict possible)
    mockTransaction.mockImplementation(async (fn: any) => {
      callCount++;
      const row = callCount === 1 ? row1 : row2;
      const txClient = {
        query: vi.fn().mockResolvedValue({ rows: [row] }),
      };
      return fn(txClient);
    });

    const res1 = await createChannel({
      type: 'group',
      name: 'Group',
      memberIds: ['other-user'],
    });

    const res2 = await createChannel({
      type: 'group',
      name: 'Group',
      memberIds: ['other-user'],
    });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    const data1 = await res1.json();
    const data2 = await res2.json();
    expect(data1.id).not.toBe(data2.id);
  });

  it('AC5: idempotency re-fetch query is scoped to app_id', async () => {
    const existingRow = makeChannelRow({ idempotency_key: 'shared-key' });

    // Setup: conflict path — transaction returns null, then re-fetch query runs
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
      }
      if (sql.includes('SELECT id FROM channel WHERE app_id') && sql.includes('cid')) {
        return { rows: [] };
      }
      // Post-transaction re-fetch — this is the query we're verifying
      if (sql.includes('idempotency_key')) {
        return { rows: [existingRow] };
      }
      return { rows: [] };
    });

    // Transaction INSERT hits ON CONFLICT → returns null
    mockTransaction.mockImplementation(async (fn: any) => {
      const txClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      return fn(txClient);
    });

    await createChannel({
      type: 'group',
      name: 'Group',
      memberIds: ['other-user'],
      idempotencyKey: 'shared-key',
    });

    // Verify the re-fetch query includes both app_id and idempotency_key
    const refetchCalls = mockQuery.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('idempotency_key')
    );
    expect(refetchCalls.length).toBeGreaterThan(0);
    // The query params should include app_id as first param
    expect(refetchCalls[0][1]).toContain(TEST_APP_ID);
    // And the idempotency key as second param
    expect(refetchCalls[0][1]).toContain('shared-key');
  });

  it('AC6: INSERT SQL includes ON CONFLICT for atomic dedup', async () => {
    setupAuthMocks();

    const channelRow = makeChannelRow();
    const txQueryMock = vi.fn().mockResolvedValue({ rows: [channelRow] });
    mockTransaction.mockImplementation(async (fn: any) => {
      return fn({ query: txQueryMock });
    });

    await createChannel({
      type: 'group',
      name: 'Group',
      memberIds: ['other-user'],
      idempotencyKey: 'atomic-key',
    });

    // Verify the INSERT query includes ON CONFLICT clause
    const insertCall = txQueryMock.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO channel')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![0]).toContain('ON CONFLICT');
    expect(insertCall![0]).toContain('idempotency_key');
    expect(insertCall![0]).toContain('DO NOTHING');
  });
});
