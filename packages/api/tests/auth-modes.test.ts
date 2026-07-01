/**
 * Auth mode boundary tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash, randomUUID } from 'crypto';
import { Hono } from 'hono';

const mockQuery = vi.fn();
vi.mock('../src/services/database', () => ({
	  db: {
	    query: (...args: any[]) => mockQuery(...args),
	    transaction: async (fn: any) => fn({ query: mockQuery }),
	  },
	}));

vi.mock('../src/services/centrifugo', () => ({
	  centrifugo: {
	    publish: vi.fn().mockResolvedValue(undefined),
	    subscribe: vi.fn().mockResolvedValue(undefined),
	    disconnect: vi.fn().mockResolvedValue(undefined),
	    unsubscribe: vi.fn().mockResolvedValue(undefined),
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
import { authMiddleware, brokerScopedRouteGuard } from '../src/middleware/auth';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';
const CENTRIFUGO_SECRET = process.env.CENTRIFUGO_TOKEN_SECRET || process.env.CENTRIFUGO_SECRET || 'chatsdk-dev-secret-key-change-in-production';
const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = 'user-123';
const TEST_API_KEY = 'a'.repeat(64);
const TEST_SESSION_ID = '11111111-1111-4111-8111-111111111111';

async function generateToken(
  type?: 'access' | 'refresh',
  expiresIn = '1h',
  scopes?: string[],
  broker = false
): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
	  const payload: Record<string, unknown> = {
	    user_id: TEST_USER_ID,
	    app_id: TEST_APP_ID,
	    sid: TEST_SESSION_ID,
	  };

	  if (type) {
	    payload.type = type;
	  }
    if (scopes) {
      payload.scopes = scopes;
    }
    if (broker) {
      payload.broker_client_id = 'broker-client-test';
      payload.broker_credential_id = 'broker-credential-test';
      payload.external_tenant_id = 'tenant-test';
      payload.membership_version = 'membership-version-test';
    }

		  return new jose.SignJWT(payload)
		    .setProtectedHeader({ alg: 'HS256', kid: 'local-dev-key' })
		    .setIssuer('chatsdk-api')
		    .setAudience('chatsdk-client')
		    .setSubject(`${TEST_APP_ID}:${TEST_USER_ID}`)
		    .setJti(randomUUID())
		    .setNotBefore('0s')
		    .setIssuedAt()
		    .setExpirationTime(expiresIn)
		    .sign(secret);
}

function setupBasicMocks() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('FROM app_api_key') || sql.includes('FROM app WHERE api_key')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('SELECT id, name FROM app WHERE api_key')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App' }] };
    }
    if (sql.includes('SELECT id FROM app WHERE api_key')) {
      return { rows: [{ id: TEST_APP_ID }] };
    }
	    if (sql.includes('SELECT id FROM app_user WHERE')) {
	      return { rows: [{ id: TEST_USER_ID }] };
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
	    if (sql.includes('INSERT INTO auth_session') || sql.includes('UPDATE auth_session')) {
	      return { rows: [], rowCount: 1 };
	    }
	    if (sql.includes('INSERT INTO revoked_token')) {
	      return { rows: [{ token_id: 'rotated-refresh-token' }], rowCount: 1 };
	    }
	    if (sql.includes('SELECT id, name, image_url FROM app_user')) {
	      return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
	    }
    if (sql.includes('SELECT COALESCE(SUM(unread_count), 0) as total')) {
      return { rows: [{ total: '0' }] };
    }
    if (sql.includes('SELECT id, name, image_url, custom_data, last_active_at') && sql.includes('FROM app_user')) {
      return {
        rows: [{
          id: TEST_USER_ID,
          name: 'Test User',
          image_url: null,
          custom_data: { email: 'test@example.com' },
          last_active_at: new Date().toISOString(),
        }],
      };
    }
    if (sql.includes('INSERT INTO app_user')) {
      return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null, custom_data: {} }] };
    }
    if (sql.includes('DELETE FROM app_user') && sql.includes('RETURNING id')) {
      return { rows: [{ id: TEST_USER_ID }], rowCount: 1 };
    }
    if (sql.includes('DELETE FROM app_user')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [] };
  });
}

describe('auth modes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    delete process.env.CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH;
  });

  afterEach(() => {
    delete process.env.CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH;
  });

  it('allows normal user API routes with Bearer token only', async () => {
    setupBasicMocks();
    const token = await generateToken('access', '1h', ['chat:read']);

    const res = await app.request('/api/channels/unread-count', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it('rejects X-API-Key alone on normal user API routes', async () => {
    setupBasicMocks();

    const res = await app.request('/api/channels/unread-count', {
      headers: {
        'X-API-Key': TEST_API_KEY,
      },
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.message).toContain('User authentication required');
  });

  it('rejects X-API-Key alone on user lookup and list routes', async () => {
    setupBasicMocks();

    const byId = await app.request(`/api/users/${TEST_USER_ID}`, {
      headers: {
        'X-API-Key': TEST_API_KEY,
      },
    });
    const list = await app.request('/api/users', {
      headers: {
        'X-API-Key': TEST_API_KEY,
      },
    });

    expect(byId.status).toBe(401);
    expect(list.status).toBe(401);
  });

  it('authenticates app-scoped API keys without accepting primary app keys by default', async () => {
    const probe = new Hono();
    probe.use('/api/*', authMiddleware);
    probe.get('/api/probe', (c) => c.json({ appId: c.get('auth').appId }));

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM app_api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('UPDATE app_api_key SET last_used_at')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const accepted = await probe.request('/api/probe', {
      headers: { 'X-API-Key': TEST_API_KEY },
    });

    expect(accepted.status).toBe(200);
    await accepted.json().then((data) => expect(data.appId).toBe(TEST_APP_ID));
    expect(mockQuery.mock.calls[0][1]).toEqual([
      createHash('sha256').update(TEST_API_KEY).digest('hex'),
    ]);
    expect(mockQuery.mock.calls[0][1][0]).not.toBe(TEST_API_KEY);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM app_api_key')) {
        return { rows: [] };
      }
      if (sql.includes('FROM app') && sql.includes('WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Primary App', settings: {} }] };
      }
      return { rows: [] };
    });

    const rejected = await probe.request('/api/probe', {
      headers: { 'X-API-Key': 'primary-app-key' },
    });
    const text = await rejected.text();

    expect(rejected.status).toBe(401);
    expect(text).toBe('Invalid API key');
  });

  it('allows legacy primary app key auth only when explicitly enabled', async () => {
    process.env.CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH = 'true';
    const probe = new Hono();
    probe.use('/api/*', authMiddleware);
    probe.get('/api/probe', (c) => c.json({ appId: c.get('auth').appId }));

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM app_api_key')) {
        return { rows: [] };
      }
      if (sql.includes('FROM app') && sql.includes('WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Primary App', settings: {} }] };
      }
      return { rows: [] };
    });

    const res = await probe.request('/api/probe', {
      headers: { 'X-API-Key': 'primary-app-key' },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.appId).toBe(TEST_APP_ID);
  });

  it('allows user lookup and list routes with Bearer token only', async () => {
    setupBasicMocks();
    const token = await generateToken('access');

    const byId = await app.request(`/api/users/${TEST_USER_ID}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const list = await app.request('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(byId.status).toBe(200);
    expect(list.status).toBe(200);
  });

  it('rejects refresh tokens on normal user API routes', async () => {
    setupBasicMocks();
    const token = await generateToken('refresh');

    const res = await app.request('/api/channels/unread-count', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.message).toBe('Invalid token type');
    expect(data.error.hint).toContain('/api/auth/refresh');
  });

  it('explicitly bypasses user auth middleware for server broker routes', async () => {
    const probe = new Hono();
    probe.use('/api/*', authMiddleware);
    probe.get('/api/server/probe', (c) => c.json({ ok: true, hasAuth: Boolean(c.get('auth')) }));

    const res = await probe.request('/api/server/probe', {
      headers: {
        Authorization: 'Bearer not-a-user-token',
      },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, hasAuth: false });
  });

  it('denies broker-scoped tokens on app-management routes by default', async () => {
    setupBasicMocks();
    const token = await generateToken('access', '1h', ['chat:read', 'chat:write'], true);

    const res = await app.request('/api/webhooks', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Broker-scoped token is not allowed for this route');
  });

  it('denies broker-scoped read tokens on chat write routes before handlers run', async () => {
    setupBasicMocks();
    const token = await generateToken('access', '1h', ['chat:read'], true);

    const res = await app.request(
      '/api/channels/22222222-2222-4222-8222-222222222222/messages/11111111-1111-4111-8111-111111111111/thread',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: 'not allowed' }),
      }
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Token scope required: chat:write');
  });

  it('requires channel:create for broker-scoped browser channel creation', async () => {
    const probe = new Hono();
    probe.use('/api/*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: TEST_APP_ID,
        userId: TEST_USER_ID,
        isBrokerToken: true,
        scopes: ['chat:read', 'chat:write'],
      });
      await next();
    });
    probe.use('/api/*', brokerScopedRouteGuard);
    probe.post('/api/channels', (c) => c.json({ ok: true }));

    const denied = await probe.request('/api/channels', { method: 'POST' });
    const deniedText = await denied.text();

    expect(denied.status).toBe(403);
    expect(deniedText).toBe('Token scope required: channel:create');

    const allowedProbe = new Hono();
    allowedProbe.use('/api/*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: TEST_APP_ID,
        userId: TEST_USER_ID,
        isBrokerToken: true,
        scopes: ['chat:read', 'chat:write', 'channel:create'],
      });
      await next();
    });
    allowedProbe.use('/api/*', brokerScopedRouteGuard);
    allowedProbe.post('/api/channels', (c) => c.json({ ok: true }));

    const allowed = await allowedProbe.request('/api/channels', { method: 'POST' });
    expect(allowed.status).toBe(200);
  });

  it('requires explicit channel:create even for otherwise unscoped user channel creation', async () => {
    setupBasicMocks();
    const token = await generateToken('access');

    const res = await app.request('/api/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'messaging',
        memberIds: ['peer-user'],
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Token scope required: channel:create');
  });

  it('allows broker-scoped read tokens on allowlisted chat read routes', async () => {
    const probe = new Hono();
    probe.use('/api/*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: TEST_APP_ID,
        userId: TEST_USER_ID,
        scopes: ['chat:read'],
      });
      await next();
    });
    probe.use('/api/*', brokerScopedRouteGuard);
    probe.get('/api/channels/:channelId/messages', (c) => c.json({ ok: true }));

    const res = await probe.request('/api/channels/channel-1/messages');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });

  it('requires explicit broker scopes on broker-scoped read routes', async () => {
    const probe = new Hono();
    probe.use('/api/*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: TEST_APP_ID,
        userId: TEST_USER_ID,
        isBrokerToken: true,
      });
      await next();
    });
    probe.use('/api/*', brokerScopedRouteGuard);
    probe.get('/api/channels/:channelId/messages', (c) => c.json({ ok: true }));

    const res = await probe.request('/api/channels/channel-1/messages');
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(text).toBe('Token scope required: chat:read');
  });

  it('keeps app-wide user management routes server API-key only', async () => {
    setupBasicMocks();
    const token = await generateToken('access');

    const bearerDelete = await app.request(`/api/users/${TEST_USER_ID}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const bearerBulkDelete = await app.request('/api/users/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userIds: [TEST_USER_ID] }),
    });
    const bearerSync = await app.request('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ users: [{ id: TEST_USER_ID, name: 'Test User' }] }),
    });
    const bearerUpsert = await app.request(`/api/users/${TEST_USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Test User' }),
    });

    expect(bearerDelete.status).toBe(401);
    expect(bearerBulkDelete.status).toBe(401);
    expect(bearerSync.status).toBe(401);
    expect(bearerUpsert.status).toBe(401);

    const appDelete = await app.request(`/api/users/${TEST_USER_ID}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': TEST_API_KEY,
      },
    });
    const appSync = await app.request('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ users: [{ id: TEST_USER_ID, name: 'Test User' }] }),
    });
    const appUpsert = await app.request(`/api/users/${TEST_USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ name: 'Test User' }),
    });

    expect(appDelete.status).toBe(200);
    expect(appSync.status).toBe(200);
    expect(appUpsert.status).toBe(200);
  });

  it('keeps ensure user routes server API-key only', async () => {
    setupBasicMocks();
    const token = await generateToken('access');

    const bearerEnsure = await app.request('/api/users/ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: TEST_USER_ID, name: 'Test User' }),
    });
    const bearerBulkEnsure = await app.request('/api/users/bulk-ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ users: [{ userId: TEST_USER_ID, name: 'Test User' }] }),
    });

    expect(bearerEnsure.status).toBe(401);
    expect(bearerBulkEnsure.status).toBe(401);

    const appEnsure = await app.request('/api/users/ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        name: 'Test User',
        email: 'test@example.com',
        custom: { source: 'vouch' },
      }),
    });
    const appBulkEnsure = await app.request('/api/users/bulk-ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ users: [{ userId: TEST_USER_ID, name: 'Test User' }] }),
    });

    expect(appEnsure.status).toBe(200);
    expect(appBulkEnsure.status).toBe(200);
  });

  it('returns created, updated, and existing actions from ensure user', async () => {
    setupBasicMocks();
    const rows = [
      {
        id: 'new-user',
        name: 'New User',
        image_url: null,
        custom_data: { email: 'new@example.com', source: 'vouch' },
        inserted: true,
        changed: false,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'updated-user',
        name: 'Updated User',
        image_url: null,
        custom_data: { source: 'vouch' },
        inserted: false,
        changed: true,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'existing-user',
        name: 'Existing User',
        image_url: null,
        custom_data: {},
        inserted: false,
        changed: false,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM app_api_key') || sql.includes('FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('WITH existing AS')) {
        return { rows: [rows.shift()] };
      }
      return { rows: [] };
    });

    const created = await app.request('/api/users/ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        userId: 'new-user',
        name: 'New User',
        email: 'new@example.com',
        custom: { source: 'vouch' },
      }),
    });
    const updated = await app.request('/api/users/ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ userId: 'updated-user', name: 'Updated User' }),
    });
    const existing = await app.request('/api/users/ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ userId: 'existing-user' }),
    });

    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      action: 'created',
      created: true,
      updated: false,
      user: { id: 'new-user', email: 'new@example.com', custom: { source: 'vouch' } },
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ action: 'updated', created: false, updated: true });
    expect(existing.status).toBe(200);
    expect(await existing.json()).toMatchObject({ action: 'existing', created: false, updated: false });
  });

  it('bulk ensures users and reports per-user errors', async () => {
    setupBasicMocks();
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM app_api_key') || sql.includes('FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('WITH existing AS')) {
        const userId = params?.[1];
        if (userId === 'bad-user') {
          throw new Error('insert failed');
        }
        return {
          rows: [{
            id: userId,
            name: userId,
            image_url: null,
            custom_data: {},
            inserted: userId === 'new-user',
            changed: userId === 'updated-user',
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    });

    const res = await app.request('/api/users/bulk-ensure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        users: [
          { userId: 'new-user' },
          { userId: 'updated-user' },
          { userId: 'bad-user' },
        ],
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(207);
    expect(data).toMatchObject({
      count: 2,
      created: 1,
      updated: 1,
      existing: 0,
      errors: [{ userId: 'bad-user', error: 'insert failed' }],
    });
  });

  it('keeps token broker routes API-key protected', async () => {
    setupBasicMocks();
    const token = await generateToken('access');

    const bearerOnly = await app.request('/api/auth/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: TEST_USER_ID }),
    });

    const withApiKey = await app.request('/api/auth/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ userId: TEST_USER_ID }),
    });

	    expect(bearerOnly.status).toBe(401);
	    expect(withApiKey.status).toBe(200);

	    const data = await withApiKey.json();
	    const secret = new TextEncoder().encode(JWT_SECRET);
	    const accessHeader = jose.decodeProtectedHeader(data.token);
	    const { payload: accessPayload } = await jose.jwtVerify(data.token, secret, {
	      issuer: 'chatsdk-api',
	      audience: 'chatsdk-client',
	    });
	    const centrifugoSecret = new TextEncoder().encode(CENTRIFUGO_SECRET);
	    const { payload: wsPayload } = await jose.jwtVerify(data._internal.wsToken, centrifugoSecret, {
	      issuer: 'chatsdk-api',
	      audience: 'chatsdk-client',
	    });

	    expect(accessHeader.kid).toBe('local-dev-key');
	    expect(accessPayload.type).toBe('access');
	    expect(accessPayload.jti).toEqual(expect.any(String));
	    expect(accessPayload.sid).toEqual(expect.any(String));
	    expect(accessPayload.nbf).toEqual(expect.any(Number));
	    expect(wsPayload.sub).toBe(`${TEST_APP_ID}:${TEST_USER_ID}`);
	    expect(wsPayload.user_id).toBe(TEST_USER_ID);
	  });

	  it('refreshes access, refresh, and websocket tokens with a refresh token', async () => {
    setupBasicMocks();
    const token = await generateToken('refresh');

    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toEqual(expect.any(String));
    expect(data.refreshToken).toEqual(expect.any(String));
    expect(data.expiresIn).toBe(900);
    expect(data._internal.wsToken).toEqual(expect.any(String));

    const centrifugoSecret = new TextEncoder().encode(CENTRIFUGO_SECRET);
	    const { payload } = await jose.jwtVerify(data._internal.wsToken, centrifugoSecret);
	    expect(payload.sub).toBe(`${TEST_APP_ID}:${TEST_USER_ID}`);
	    expect(payload.user_id).toBe(TEST_USER_ID);
	    expect(payload.app_id).toBe(TEST_APP_ID);
	  });

	  it('legacy token broker returns a refresh token and types the access token', async () => {
	    setupBasicMocks();

	    const res = await app.request('/tokens', {
	      method: 'POST',
	      headers: {
	        'Content-Type': 'application/json',
	        'X-API-Key': TEST_API_KEY,
	      },
	      body: JSON.stringify({ userId: TEST_USER_ID, name: 'Test User' }),
	    });
	    const data = await res.json();

	    expect(res.status).toBe(200);
	    expect(data.token).toEqual(expect.any(String));
	    expect(data.refreshToken).toEqual(expect.any(String));
	    expect(data.wsToken).toEqual(expect.any(String));

	    const secret = new TextEncoder().encode(JWT_SECRET);
	    const accessPayload = await jose.jwtVerify(data.token, secret);
	    const refreshPayload = await jose.jwtVerify(data.refreshToken, secret);
	    expect(accessPayload.payload.type).toBe('access');
	    expect(refreshPayload.payload.type).toBe('refresh');
	  });

	  it('legacy refresh rejects access tokens', async () => {
	    setupBasicMocks();
	    const token = await generateToken('access');

	    const res = await app.request('/tokens/refresh', {
	      method: 'POST',
	      headers: {
	        Authorization: `Bearer ${token}`,
	      },
	    });
	    const data = await res.json();

	    expect(res.status).toBe(401);
	    expect(data.error.message).toBe('Invalid token type');
	  });

	  it('legacy refresh rejects expired refresh tokens without broad clock tolerance', async () => {
	    setupBasicMocks();
	    const token = await generateToken('refresh', '-1h');

	    const res = await app.request('/tokens/refresh', {
	      method: 'POST',
	      headers: {
	        Authorization: `Bearer ${token}`,
	      },
	    });
	    const data = await res.json();

	    expect(res.status).toBe(401);
	    expect(data.error.message).toBe('Token expired');
	  });

	  it('legacy refresh rotates refresh and websocket tokens with a refresh token', async () => {
	    setupBasicMocks();
	    const token = await generateToken('refresh');

	    const res = await app.request('/tokens/refresh', {
	      method: 'POST',
	      headers: {
	        Authorization: `Bearer ${token}`,
	      },
	    });
	    const data = await res.json();

	    expect(res.status).toBe(200);
	    expect(data.token).toEqual(expect.any(String));
	    expect(data.refreshToken).toEqual(expect.any(String));
	    expect(data.wsToken).toEqual(expect.any(String));
	    expect(data.expiresIn).toBe(900);

	    const secret = new TextEncoder().encode(JWT_SECRET);
	    const accessPayload = await jose.jwtVerify(data.token, secret);
	    const refreshPayload = await jose.jwtVerify(data.refreshToken, secret);
	    expect(accessPayload.payload.type).toBe('access');
	    expect(refreshPayload.payload.type).toBe('refresh');
	  });
	});
