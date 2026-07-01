import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';

const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockEnqueueDomainRealtimeEvent = vi.fn();
const mockTriggerRealtimeOutboxDrainSafely = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    transaction: (fn: any) => mockTransaction(fn),
  },
  initDB: vi.fn(),
}));

vi.mock('../src/services/realtime-events', () => ({
  appChannel: (appId: string) => `app:${appId}`,
  chatChannel: (appId: string, channelId: string) => `chat:${appId}:${channelId}`,
  userChannel: (appId: string, userId: string) => `user:${appId}:${userId}`,
  workspaceChannel: (appId: string, workspaceId: string) => `workspace:${appId}:${workspaceId}`,
  enqueueDomainRealtimeEvent: (...args: any[]) => mockEnqueueDomainRealtimeEvent(...args),
  triggerRealtimeOutboxDrainSafely: () => mockTriggerRealtimeOutboxDrainSafely(),
}));

vi.mock('../src/services/centrifugo', () => ({
  initCentrifugo: vi.fn(),
  centrifugo: {
    publishTyping: vi.fn(),
    publishPresence: vi.fn(),
  },
  getCentrifugo: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue(true),
    publish: vi.fn(),
    presence: vi.fn().mockResolvedValue({ clients: {} }),
  })),
}));

vi.mock('../src/inngest', () => ({
  inngest: {
    send: vi.fn(),
  },
  allFunctions: [],
}));

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

const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = 'user-alice';
const OTHER_USER_ID = 'user-bob';
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';
const POLL_ID = '44444444-4444-4444-8444-444444444444';

async function generateToken(userId = TEST_USER_ID, scopes?: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret-key-for-testing');
  const payload: Record<string, unknown> = {
    user_id: userId,
    app_id: TEST_APP_ID,
  };
  if (scopes) {
    payload.scopes = scopes;
  }
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function setupAuthMocks(extra?: (sql: string, params?: any[]) => any) {
  mockQuery.mockImplementation((sql: string, params?: any[]) => {
    if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('SELECT id, name, image_url FROM app_user')) {
      return { rows: [{ id: TEST_USER_ID, name: 'Alice', image_url: null }] };
    }
    return extra?.(sql, params) ?? { rows: [] };
  });
}

describe('durable realtime route outbox behavior', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
    mockEnqueueDomainRealtimeEvent.mockReset();
    mockTriggerRealtimeOutboxDrainSafely.mockReset();
    mockEnqueueDomainRealtimeEvent.mockResolvedValue(undefined);
  });

  it('creates workspace events only for committed workspace members, not the app-wide channel', async () => {
    setupAuthMocks();
    const workspaceRow = {
      id: WORKSPACE_ID,
      name: 'Private Project',
      type: 'project',
      image_url: null,
      member_count: 1,
      channel_count: 0,
      expires_at: null,
      created_at: '2026-06-08T00:00:00.000Z',
      created_by: TEST_USER_ID,
    };
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('INSERT INTO workspace ')) {
          return { rows: [workspaceRow] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const token = await generateToken(TEST_USER_ID, ['chat:write']);
    const res = await app.request('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Private Project', type: 'project' }),
    });

    expect(res.status).toBe(200);
    expect(mockEnqueueDomainRealtimeEvent).toHaveBeenCalledTimes(1);
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][1]).toEqual(expect.objectContaining({
      eventType: 'workspace.created',
      channels: [`user:${TEST_APP_ID}:${TEST_USER_ID}`],
    }));
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][1].channels).not.toContain(
      `app:${TEST_APP_ID}`
    );
  });

  it('sends public workspace channel creation to all workspace members who can see it', async () => {
    setupAuthMocks((sql: string) => {
      if (sql.includes('SELECT id FROM channel WHERE app_id') && sql.includes('cid')) {
        return { rows: [] };
      }
      if (sql.includes('FROM workspace w')) {
        return { rows: [{ id: WORKSPACE_ID }] };
      }
      if (sql.includes('user_id = ANY')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const channelRow = {
      id: CHANNEL_ID,
      app_id: TEST_APP_ID,
      cid: `public:${CHANNEL_ID}`,
      type: 'public',
      name: 'Announcements',
      image_url: null,
      config: {},
      member_count: 1,
      message_count: 0,
      last_message_at: null,
      created_by: TEST_USER_ID,
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
      workspace_id: WORKSPACE_ID,
      idempotency_key: null,
    };
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('INSERT INTO channel ')) {
          return { rows: [channelRow] };
        }
        if (sql.includes('SELECT user_id FROM workspace_member')) {
          return { rows: [{ user_id: TEST_USER_ID }, { user_id: OTHER_USER_ID }] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const token = await generateToken(TEST_USER_ID, ['chat:read', 'chat:write', 'channel:create']);
    const res = await app.request('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: 'public',
        name: 'Announcements',
        memberIds: [],
        workspaceId: WORKSPACE_ID,
      }),
    });

    expect(res.status).toBe(201);
    expect(mockEnqueueDomainRealtimeEvent).toHaveBeenCalledTimes(1);
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][1]).toEqual(expect.objectContaining({
      eventType: 'channel.created',
      channels: [
        `user:${TEST_APP_ID}:${TEST_USER_ID}`,
        `user:${TEST_APP_ID}:${OTHER_USER_ID}`,
      ],
    }));
  });

  it('does not enqueue member-joined events for duplicate channel member inserts', async () => {
    setupAuthMocks((sql: string) => {
      if (sql.includes('SELECT role FROM channel_member')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT type, workspace_id FROM channel')) {
        return { rows: [{ type: 'public', workspace_id: null }] };
      }
      return { rows: [] };
    });
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('INSERT INTO channel_member')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const token = await generateToken(TEST_USER_ID, ['chat:write']);
    const res = await app.request(`/api/channels/${CHANNEL_ID}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: OTHER_USER_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.addedCount).toBe(0);
    expect(mockEnqueueDomainRealtimeEvent).not.toHaveBeenCalled();
    expect(mockTriggerRealtimeOutboxDrainSafely).toHaveBeenCalledTimes(1);
  });

  it('enqueues anonymous poll vote payloads transactionally', async () => {
    setupAuthMocks((sql: string) => {
      if (sql.includes('FROM poll p') && sql.includes('JOIN message m')) {
        return {
          rows: [{
            id: POLL_ID,
            channel_id: CHANNEL_ID,
            options: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }],
            is_multi_choice: false,
            is_anonymous: true,
            ends_at: null,
          }],
        };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('FOR UPDATE OF p')) {
          return {
            rows: [{
              id: POLL_ID,
              channel_id: CHANNEL_ID,
              options: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }],
              is_multi_choice: false,
              is_anonymous: true,
              ends_at: null,
            }],
          };
        }
        if (sql.includes('SELECT COUNT(DISTINCT user_id)')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const token = await generateToken(TEST_USER_ID, ['chat:write']);
    const res = await app.request(`/api/polls/${POLL_ID}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ optionIds: ['yes'] }),
    });

    expect(res.status).toBe(200);
    expect(mockEnqueueDomainRealtimeEvent).toHaveBeenCalledTimes(1);
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][0]).toBe(txClient);
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][1]).toEqual(expect.objectContaining({
      eventType: 'poll.voted',
      channels: [`chat:${TEST_APP_ID}:${CHANNEL_ID}`],
      payload: expect.objectContaining({
        pollId: POLL_ID,
        userId: null,
        totalVotes: 1,
      }),
    }));
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][1].payload).not.toHaveProperty('optionIds');
    expect(txClient.query.mock.calls.some(([sql]) => String(sql).includes('FOR UPDATE OF p'))).toBe(true);
  });

  it('enqueues workspace member joins to all committed workspace members for admin adds', async () => {
    setupAuthMocks((sql: string) => {
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT 1 FROM workspace WHERE')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('INSERT INTO workspace_member')) {
          return { rows: [{ user_id: OTHER_USER_ID }] };
        }
        if (sql.includes('SELECT user_id FROM workspace_member')) {
          return { rows: [{ user_id: TEST_USER_ID }, { user_id: OTHER_USER_ID }] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const token = await generateToken();
    const res = await app.request(`/api/workspaces/${WORKSPACE_ID}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userIds: [OTHER_USER_ID], role: 'member' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.added).toEqual([OTHER_USER_ID]);
    expect(mockEnqueueDomainRealtimeEvent).toHaveBeenCalledTimes(1);
    expect(mockEnqueueDomainRealtimeEvent.mock.calls[0][1]).toEqual(expect.objectContaining({
      eventType: 'workspace.member_joined',
      channels: [
        `user:${TEST_APP_ID}:${TEST_USER_ID}`,
        `user:${TEST_APP_ID}:${OTHER_USER_ID}`,
      ],
      payload: { workspaceId: WORKSPACE_ID, userId: OTHER_USER_ID },
    }));
    expect(mockTriggerRealtimeOutboxDrainSafely).toHaveBeenCalledTimes(1);
  });
});
