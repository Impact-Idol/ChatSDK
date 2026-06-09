import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';

const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockEnqueueRealtimeEvent = vi.fn();
const mockTriggerRealtimeOutboxDrain = vi.fn();
const mockPublishMessage = vi.fn();
const mockPublishUnreadCount = vi.fn();
const mockPublishTotalUnreadCount = vi.fn();
const mockInngestSend = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    transaction: (fn: any) => mockTransaction(fn),
  },
  initDB: vi.fn(),
}));

vi.mock('../src/services/realtime-outbox', () => ({
  enqueueRealtimeEvent: (...args: any[]) => mockEnqueueRealtimeEvent(...args),
  triggerRealtimeOutboxDrain: () => mockTriggerRealtimeOutboxDrain(),
  checkRealtimeOutboxHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    pending: 0,
    failed: 0,
    oldestPendingSeconds: 0,
  }),
}));

vi.mock('../src/services/centrifugo', () => ({
  initCentrifugo: vi.fn(),
  centrifugo: {
    publishMessage: (...args: any[]) => mockPublishMessage(...args),
    publishUnreadCount: (...args: any[]) => mockPublishUnreadCount(...args),
    publishTotalUnreadCount: (...args: any[]) => mockPublishTotalUnreadCount(...args),
    publishMessageUpdate: vi.fn(),
    publishMessageDelete: vi.fn(),
    publishReaction: vi.fn(),
  },
  getCentrifugo: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue(true),
    publish: vi.fn(),
    presence: vi.fn().mockResolvedValue({ clients: {} }),
  })),
}));

vi.mock('../src/inngest', () => ({
  inngest: {
    send: (...args: any[]) => mockInngestSend(...args),
  },
  sendInngestEvent: (...args: any[]) => mockInngestSend(...args),
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
const TEST_USER_ID = 'user-123';
const OTHER_USER_ID = 'user-456';
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

async function generateToken(scopes?: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret-key-for-testing');
  return new jose.SignJWT({ user_id: TEST_USER_ID, app_id: TEST_APP_ID, scopes })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function setupAuthAndRouteMocks() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('SELECT id, name, image_url FROM app_user')) {
      return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
    }
    if (sql.includes('SELECT 1 FROM channel_member')) {
      return { rows: [{ '?column?': 1 }] };
    }
    if (sql.includes('SELECT c.name, c.type, array_agg')) {
      return {
        rows: [{
          name: 'Test Channel',
          type: 'messaging',
          member_ids: [TEST_USER_ID, OTHER_USER_ID],
        }],
      };
    }
    if (sql.includes('FROM upload') && sql.includes('status =')) {
      return { rows: [{ channel_id: CHANNEL_ID }] };
    }
    return { rows: [] };
  });
}

async function sendMessage(attachments?: any[]) {
  const token = await generateToken();
  return sendMessageWithToken(token, attachments);
}

async function sendMessageWithToken(token: string, attachments?: any[]) {
  return app.request(`/api/channels/${CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: 'hello durable realtime',
      clientMsgId: MESSAGE_ID,
      attachments,
    }),
  });
}

describe('message send realtime outbox', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
    mockEnqueueRealtimeEvent.mockReset();
    mockTriggerRealtimeOutboxDrain.mockReset();
    mockPublishMessage.mockReset();
    mockPublishUnreadCount.mockReset();
    mockPublishTotalUnreadCount.mockReset();
    mockInngestSend.mockReset();
    mockInngestSend.mockResolvedValue(undefined);
    mockEnqueueRealtimeEvent.mockResolvedValue('outbox-event-id');
    setupAuthAndRouteMocks();
  });

  it('enqueues message and unread realtime events transactionally without direct Centrifugo publish', async () => {
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('next_channel_seq')) {
          return { rows: [{ seq: 7 }] };
        }
        if (sql.includes('INSERT INTO message')) {
          return {
            rows: [{
              id: MESSAGE_ID,
              channel_id: CHANNEL_ID,
              app_id: TEST_APP_ID,
              user_id: TEST_USER_ID,
              seq: 7,
              text: 'hello durable realtime',
              attachments: [],
              parent_id: null,
              reply_to_id: null,
              reply_count: 0,
              status: 'sent',
              created_at: '2026-06-08T00:00:00.000Z',
              edited_at: null,
              deleted_at: null,
            }],
          };
        }
        if (sql.includes('SELECT cm.user_id, cm.unread_count')) {
          return {
            rows: [{
              user_id: OTHER_USER_ID,
              unread_count: 3,
              total_unread: '9',
            }],
          };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const res = await sendMessage();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(MESSAGE_ID);
    expect(mockEnqueueRealtimeEvent).toHaveBeenCalledTimes(3);
    expect(mockEnqueueRealtimeEvent.mock.calls.every(([client]) => client === txClient)).toBe(true);
    expect(mockEnqueueRealtimeEvent.mock.calls.map(([, event]) => event.eventType)).toEqual([
      'message.new',
      'channel.unread_changed',
      'channel.total_unread_changed',
    ]);
    expect(mockEnqueueRealtimeEvent.mock.calls[0][1]).toEqual(expect.objectContaining({
      appId: TEST_APP_ID,
      aggregateType: 'message',
      aggregateId: MESSAGE_ID,
      channels: [`chat:${TEST_APP_ID}:${CHANNEL_ID}`],
      idempotencyKey: `message.new:${TEST_APP_ID}:${MESSAGE_ID}`,
    }));
    expect(mockTriggerRealtimeOutboxDrain).toHaveBeenCalledTimes(1);
    expect(mockPublishMessage).not.toHaveBeenCalled();
    expect(mockPublishUnreadCount).not.toHaveBeenCalled();
    expect(mockPublishTotalUnreadCount).not.toHaveBeenCalled();
  });

  it('rejects broker read-only scoped tokens on message send', async () => {
    const token = await generateToken(['chat:read']);

    const res = await sendMessageWithToken(token);

    expect(res.status).toBe(403);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockEnqueueRealtimeEvent).not.toHaveBeenCalled();
  });

  it('stores and broadcasts media attachments without sender-scoped media tokens', async () => {
    let insertedAttachments: any[] | undefined;
    const txClient = {
      query: vi.fn((sql: string, params: any[] = []) => {
        if (sql.includes('next_channel_seq')) {
          return { rows: [{ seq: 7 }] };
        }
        if (sql.includes('INSERT INTO message')) {
          insertedAttachments = JSON.parse(params[6]);
          return {
            rows: [{
              id: MESSAGE_ID,
              channel_id: CHANNEL_ID,
              app_id: TEST_APP_ID,
              user_id: TEST_USER_ID,
              seq: 7,
              text: 'hello durable realtime',
              attachments: insertedAttachments,
              parent_id: null,
              reply_to_id: null,
              reply_count: 0,
              status: 'sent',
              created_at: '2026-06-08T00:00:00.000Z',
              edited_at: null,
              deleted_at: null,
            }],
          };
        }
        if (sql.includes('SELECT cm.user_id, cm.unread_count')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const res = await sendMessage([{
      type: 'image',
      url: 'http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Fimage.png&mediaToken=sender-token',
      name: 'image.png',
      size: 123,
      mimeType: 'image/png',
    }]);
    const body = await res.json();
    const broadcastMessage = mockEnqueueRealtimeEvent.mock.calls[0][1].payload.payload.message;

    expect(res.status).toBe(201);
    expect(insertedAttachments?.[0].url).toBe('http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Fimage.png');
    expect(broadcastMessage.attachments[0].url).toBe('http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Fimage.png');
    expect(broadcastMessage.attachments[0].url).not.toContain('mediaToken=');
    expect(body.attachments[0].url).toContain('mediaToken=');
  });

  it('returns the persisted message even if the async drain trigger throws', async () => {
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('next_channel_seq')) {
          return { rows: [{ seq: 7 }] };
        }
        if (sql.includes('INSERT INTO message')) {
          return {
            rows: [{
              id: MESSAGE_ID,
              channel_id: CHANNEL_ID,
              app_id: TEST_APP_ID,
              user_id: TEST_USER_ID,
              seq: 7,
              text: 'hello durable realtime',
              attachments: [],
              parent_id: null,
              reply_to_id: null,
              reply_count: 0,
              status: 'sent',
              created_at: '2026-06-08T00:00:00.000Z',
              edited_at: null,
              deleted_at: null,
            }],
          };
        }
        if (sql.includes('SELECT cm.user_id, cm.unread_count')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));
    mockTriggerRealtimeOutboxDrain.mockImplementationOnce(() => {
      throw new Error('drain trigger unavailable');
    });

    const res = await sendMessage();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(MESSAGE_ID);
    expect(mockPublishMessage).not.toHaveBeenCalled();
  });

  it('returns the persisted message when post-commit notification side effects fail', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('SELECT c.name, c.type, array_agg')) {
        throw new Error('post-commit query failed');
      }
      return { rows: [] };
    });

    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('next_channel_seq')) {
          return { rows: [{ seq: 7 }] };
        }
        if (sql.includes('INSERT INTO message')) {
          return {
            rows: [{
              id: MESSAGE_ID,
              channel_id: CHANNEL_ID,
              app_id: TEST_APP_ID,
              user_id: TEST_USER_ID,
              seq: 7,
              text: 'hello durable realtime',
              attachments: [],
              parent_id: null,
              reply_to_id: null,
              reply_count: 0,
              status: 'sent',
              created_at: '2026-06-08T00:00:00.000Z',
              edited_at: null,
              deleted_at: null,
            }],
          };
        }
        if (sql.includes('SELECT cm.user_id, cm.unread_count')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const res = await sendMessage();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(MESSAGE_ID);
    expect(body.mentions).toEqual([]);
    expect(mockPublishMessage).not.toHaveBeenCalled();
  });

  it('broadcasts message updates without editor-scoped media tokens', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('SELECT user_id FROM message')) {
        return { rows: [{ user_id: TEST_USER_ID }] };
      }
      return { rows: [] };
    });

    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('UPDATE message')) {
          return {
            rows: [{
              id: MESSAGE_ID,
              channel_id: CHANNEL_ID,
              app_id: TEST_APP_ID,
              user_id: TEST_USER_ID,
              seq: 7,
              text: 'edited',
              attachments: [{
                type: 'image',
                url: 'http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Fimage.png',
              }],
              parent_id: null,
              reply_to_id: null,
              reply_count: 0,
              status: 'sent',
              created_at: '2026-06-08T00:00:00.000Z',
              edited_at: '2026-06-08T00:01:00.000Z',
              deleted_at: null,
            }],
          };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const token = await generateToken();
    const res = await app.request(`/api/channels/${CHANNEL_ID}/messages/${MESSAGE_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: 'edited' }),
    });
    const body = await res.json();
    const broadcastMessage = mockEnqueueRealtimeEvent.mock.calls[0][1].payload.payload.message;

    expect(res.status).toBe(200);
    expect(broadcastMessage.attachments[0].url).toBe('http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Fimage.png');
    expect(broadcastMessage.attachments[0].url).not.toContain('mediaToken=');
    expect(body.attachments[0].url).toContain('mediaToken=');
  });

  it('does not edit deleted or hard-purged messages', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('SELECT user_id FROM message')) {
        expect(sql).toContain('deleted_at IS NULL');
        expect(sql).toContain('hard_deleted_at IS NULL');
        return { rows: [] };
      }
      return { rows: [] };
    });

    const token = await generateToken();
    const res = await app.request(`/api/channels/${CHANNEL_ID}/messages/${MESSAGE_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: 'edited' }),
    });

    expect(res.status).toBe(404);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
