/**
 * Realtime subscription authorization regression tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';
import { randomUUID } from 'crypto';

const mockQuery = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

vi.mock('../src/services/centrifugo', () => ({
  initCentrifugo: vi.fn(),
  centrifugo: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
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
const OTHER_APP_ID = '00000000-0000-0000-0000-000000000002';
const TEST_USER_ID = 'user-123';
const OTHER_USER_ID = 'user-456';
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';
const TEST_SESSION_ID = '11111111-1111-4111-8111-111111111111';

async function generateToken(): Promise<string> {
	  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret-key-for-testing');
	  return new jose.SignJWT({
	    user_id: TEST_USER_ID,
	    app_id: TEST_APP_ID,
	    type: 'access',
	    sid: TEST_SESSION_ID,
	    scopes: ['chat:read'],
	  })
	    .setProtectedHeader({ alg: 'HS256', kid: 'local-dev-key' })
	    .setIssuer('chatsdk-api')
	    .setAudience('chatsdk-client')
	    .setSubject(`${TEST_APP_ID}:${TEST_USER_ID}`)
	    .setJti(randomUUID())
	    .setNotBefore('0s')
	    .setIssuedAt()
	    .setExpirationTime('1h')
	    .sign(secret);
}

function authMockRows(sql: string) {
  if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
    return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
  }
  if (sql.includes('SELECT tokens_valid_after')) {
    return { rows: [{ tokens_valid_after: new Date(0).toISOString() }] };
  }
  if (sql.includes('SELECT revoked_at, expires_at')) {
    return {
      rows: [{
        revoked_at: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }],
    };
  }
  if (sql.includes('FROM revoked_token')) {
    return { rows: [] };
  }
  if (sql.includes('SELECT id, name, image_url FROM app_user')) {
    return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
  }
  return null;
}

function setupAuthMocks() {
	  mockQuery.mockImplementation((sql: string) => {
	    const authRows = authMockRows(sql);
	    if (authRows) return authRows;
	    return { rows: [] };
	  });
}

async function authedSubscriptionToken(channel: string) {
  const token = await generateToken();
  return app.request('/api/realtime/subscription-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel }),
  });
}

describe('realtime subscription authorization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    setupAuthMocks();
  });

  it('mints a Centrifugo subscription token for the caller personal channel', async () => {
    const channel = `user:${TEST_APP_ID}:${TEST_USER_ID}`;
    const res = await authedSubscriptionToken(channel);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toEqual(expect.any(String));

    const secret = new TextEncoder().encode(
      process.env.CENTRIFUGO_TOKEN_SECRET
        || process.env.CENTRIFUGO_SECRET
        || 'chatsdk-dev-secret-key-change-in-production'
    );
    const { payload } = await jose.jwtVerify(data.token, secret);
	    expect(payload.sub).toBe(`${TEST_APP_ID}:${TEST_USER_ID}`);
	    expect(payload.user_id).toBe(TEST_USER_ID);
	    expect(payload.channel).toBe(channel);
	    expect(payload.app_id).toBe(TEST_APP_ID);
  });

  it('rejects another user personal channel', async () => {
    const res = await authedSubscriptionToken(`user:${TEST_APP_ID}:${OTHER_USER_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('another user');
  });

  it('rejects cross-app realtime channels', async () => {
    const res = await authedSubscriptionToken(`user:${OTHER_APP_ID}:${TEST_USER_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('another app');
  });

  it('rejects channels longer than the deployed Centrifugo default', async () => {
    const res = await authedSubscriptionToken(`user:${TEST_APP_ID}:${'u'.repeat(256)}`);

    expect(res.status).toBe(400);
  });

	  it('rejects private chat channel subscriptions for nonmembers', async () => {
	    mockQuery.mockImplementation((sql: string) => {
	      const authRows = authMockRows(sql);
	      if (authRows) return authRows;
	      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'messaging',
            workspace_id: null,
            role: null,
            workspace_member_user_id: null,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedSubscriptionToken(`chat:${TEST_APP_ID}:${CHANNEL_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not a member');
  });

	  it('allows workspace-scoped public chat subscriptions only for workspace members', async () => {
	    mockQuery.mockImplementation((sql: string) => {
	      const authRows = authMockRows(sql);
	      if (authRows) return authRows;
	      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'public',
            workspace_id: WORKSPACE_ID,
            role: null,
            workspace_member_user_id: TEST_USER_ID,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedSubscriptionToken(`chat:${TEST_APP_ID}:${CHANNEL_ID}`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toEqual(expect.any(String));
  });

	  it('rejects app-wide realtime channel subscriptions for non-admin users', async () => {
	    mockQuery.mockImplementation((sql: string) => {
	      const authRows = authMockRows(sql);
	      if (authRows) return authRows;
	      if (sql.includes("custom_data->>'is_admin'")) {
        return { rows: [{ is_admin: 'false' }] };
      }
      return { rows: [] };
    });

    const res = await authedSubscriptionToken(`app:${TEST_APP_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('admin');
  });
});
