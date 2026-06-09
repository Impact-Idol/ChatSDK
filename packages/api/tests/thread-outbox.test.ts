import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';

const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockEnqueueRealtimeEvent = vi.fn();
const mockTriggerRealtimeOutboxDrain = vi.fn();
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
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';
const PARENT_MESSAGE_ID = '11111111-1111-4111-8111-111111111111';
const REPLY_ID = '33333333-3333-4333-8333-333333333333';

async function generateToken(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret-key-for-testing');
  return new jose.SignJWT({ user_id: TEST_USER_ID, app_id: TEST_APP_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

async function postThreadReply(attachments?: any[]) {
  const token = await generateToken();
  return app.request(`/api/channels/${CHANNEL_ID}/messages/${PARENT_MESSAGE_ID}/thread`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: 'thread reply through outbox',
      clientMsgId: REPLY_ID,
      attachments,
    }),
  });
}

describe('thread reply realtime outbox', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
    mockEnqueueRealtimeEvent.mockReset();
    mockTriggerRealtimeOutboxDrain.mockReset();
    mockInngestSend.mockReset();
    mockInngestSend.mockResolvedValue(undefined);
    mockEnqueueRealtimeEvent.mockResolvedValue('outbox-event-id');

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
      if (sql.includes('SELECT id, user_id FROM message')) {
        return { rows: [{ id: PARENT_MESSAGE_ID, user_id: 'parent-author' }] };
      }
      if (sql.includes('SELECT name FROM channel')) {
        return { rows: [{ name: 'Thread Channel' }] };
      }
      if (sql.includes('SELECT DISTINCT user_id FROM message')) {
        return { rows: [{ user_id: TEST_USER_ID }, { user_id: 'parent-author' }] };
      }
      if (sql.includes('FROM upload') && sql.includes('status =')) {
        return { rows: [{ channel_id: CHANNEL_ID }] };
      }
      return { rows: [] };
    });
  });

  it('enqueues message.new and thread.reply events transactionally without direct publish', async () => {
    const txClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('next_channel_seq')) {
          return { rows: [{ seq: 8 }] };
        }
        if (sql.includes('INSERT INTO message')) {
          return {
            rows: [{
              id: REPLY_ID,
              seq: 8,
              created_at: '2026-06-08T00:00:00.000Z',
            }],
          };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const res = await postThreadReply();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(REPLY_ID);
    expect(mockEnqueueRealtimeEvent).toHaveBeenCalledTimes(2);
    expect(mockEnqueueRealtimeEvent.mock.calls.every(([client]) => client === txClient)).toBe(true);
    expect(mockEnqueueRealtimeEvent.mock.calls.map(([, event]) => event.eventType)).toEqual([
      'message.new',
      'thread.reply',
    ]);
    expect(mockTriggerRealtimeOutboxDrain).toHaveBeenCalledTimes(1);
  });

  it('stores and broadcasts thread media attachments without sender-scoped media tokens', async () => {
    let insertedAttachments: any[] | undefined;
    const txClient = {
      query: vi.fn((sql: string, params: any[] = []) => {
        if (sql.includes('next_channel_seq')) {
          return { rows: [{ seq: 8 }] };
        }
        if (sql.includes('INSERT INTO message')) {
          insertedAttachments = JSON.parse(params[6]);
          return {
            rows: [{
              id: REPLY_ID,
              seq: 8,
              created_at: '2026-06-08T00:00:00.000Z',
            }],
          };
        }
        return { rows: [] };
      }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(txClient));

    const res = await postThreadReply([{
      type: 'image',
      url: 'http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Freply.png&mediaToken=sender-token',
    }]);
    const body = await res.json();
    const messageNew = mockEnqueueRealtimeEvent.mock.calls[0][1].payload.payload.message;
    const threadReply = mockEnqueueRealtimeEvent.mock.calls[1][1].payload.payload.message;

    expect(res.status).toBe(201);
    expect(insertedAttachments?.[0].url).toBe('http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Freply.png');
    expect(messageNew.attachments[0].url).not.toContain('mediaToken=');
    expect(threadReply.attachments[0].url).not.toContain('mediaToken=');
    expect(body.attachments[0].url).toContain('mediaToken=');
  });
});
