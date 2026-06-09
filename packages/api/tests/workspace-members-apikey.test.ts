/**
 * Workspace auth boundary regressions.
 *
 * Normal workspace member-management routes are user routes: they require a
 * valid Bearer token and enforce the Bearer user's workspace role. Supplying an
 * API key alongside that token must not upgrade the request into app-level auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockTransaction = vi.fn();
vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    transaction: (fn: any) => mockTransaction(fn),
  },
}));

vi.mock('../src/services/centrifugo', () => ({
  centrifugo: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
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
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';
const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';
const TEST_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
const ADMIN_USER_ID = 'admin-user-123';
const REGULAR_USER_ID = 'regular-user-123';
const SECOND_USER_ID = 'regular-user-456';
const TEST_API_KEY = 'a'.repeat(64);

async function generateToken(userId: string, appId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ user_id: userId, app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function setupUserRouteMocks(userId: string, workspaceRole: 'owner' | 'admin' | 'member' | null) {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    if (sql.includes('SELECT id, name, image_url FROM app_user')) {
      return { rows: [{ id: userId, name: 'Test User', image_url: null }] };
    }
    if (sql.includes('SELECT role FROM workspace_member')) {
      return workspaceRole ? { rows: [{ role: workspaceRole }] } : { rows: [] };
    }
    if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
      return { rows: [{ '?column?': 1 }] };
    }
    if (sql.includes('INSERT INTO workspace_member')) {
      return { rows: [{ user_id: SECOND_USER_ID }], rowCount: 1 };
    }
    if (sql.includes('UPDATE workspace')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [] };
  });
  mockTransaction.mockImplementation(async (fn: any) => fn({ query: mockQuery }));
}

async function addWorkspaceMember(userId: string, includeApiKey = false) {
  const token = await generateToken(userId, TEST_APP_ID);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (includeApiKey) {
    headers['X-API-Key'] = TEST_API_KEY;
  }

  return app.request(`/api/workspaces/${TEST_WORKSPACE_ID}/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userIds: [SECOND_USER_ID], role: 'member' }),
  });
}

describe('Workspace member-management auth boundaries', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
  });

  it('allows an admin Bearer token without X-API-Key', async () => {
    setupUserRouteMocks(ADMIN_USER_ID, 'admin');

    const res = await addWorkspaceMember(ADMIN_USER_ID);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.added).toContain(SECOND_USER_ID);
  });

  it('does not allow workspace admins to add owners', async () => {
    setupUserRouteMocks(ADMIN_USER_ID, 'admin');
    const token = await generateToken(ADMIN_USER_ID, TEST_APP_ID);

    const res = await app.request(`/api/workspaces/${TEST_WORKSPACE_ID}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userIds: [SECOND_USER_ID], role: 'owner' }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Only owners can grant owner role');
    expect(mockQuery.mock.calls.some((call: any[]) => String(call[0]).includes('INSERT INTO workspace_member'))).toBe(false);
  });

  it('does not let a mixed X-API-Key plus Bearer request bypass user role checks', async () => {
    setupUserRouteMocks(REGULAR_USER_ID, 'member');

    const res = await addWorkspaceMember(REGULAR_USER_ID, true);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Permission denied');
    expect(mockQuery.mock.calls.some((call: any[]) => String(call[0]).includes('INSERT INTO workspace_member'))).toBe(false);
  });

  it('rejects X-API-Key alone on normal user workspace routes', async () => {
    setupUserRouteMocks(REGULAR_USER_ID, null);

    const res = await app.request(`/api/workspaces/${TEST_WORKSPACE_ID}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({ userIds: [SECOND_USER_ID], role: 'member' }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.message).toContain('User authentication required');
    expect(mockQuery.mock.calls.some((call: any[]) => String(call[0]).includes('INSERT INTO workspace_member'))).toBe(false);
  });

  it('looks up workspace invite tokens inside the authenticated app', async () => {
    const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: REGULAR_USER_ID, name: 'Regular User', image_url: null }] };
      }
      if (sql.includes('SELECT * FROM workspace_invite')) {
        expect(sql).toContain('app_id = $2');
        expect(params).toEqual(['invite-token', TEST_APP_ID]);
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await app.request('/api/workspaces/invites/invite-token', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(404);
  });

  it('does not allow workspace admins to invite owners', async () => {
    const token = await generateToken(ADMIN_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: ADMIN_USER_ID, name: 'Admin User', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('INSERT INTO workspace_invite')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await app.request(`/api/workspaces/${TEST_WORKSPACE_ID}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emails: ['owner-invite@example.com'], role: 'owner' }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Only owners can grant owner role');
    expect(mockQuery.mock.calls.some((call: any[]) => String(call[0]).includes('INSERT INTO workspace_invite'))).toBe(false);
  });

  it('does not allow workspace admins to refresh existing owner invites', async () => {
    const token = await generateToken(ADMIN_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: ADMIN_USER_ID, name: 'Admin User', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT name FROM workspace')) {
        return { rows: [{ name: 'Test Workspace' }] };
      }
      if (sql.includes('SELECT id, role FROM workspace_invite')) {
        expect(sql).toContain('app_id = $2');
        expect(params).toEqual([TEST_WORKSPACE_ID, TEST_APP_ID, 'owner-invite@example.com']);
        return { rows: [{ id: 'invite-1', role: 'owner' }] };
      }
      if (sql.includes('UPDATE workspace_invite')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await app.request(`/api/workspaces/${TEST_WORKSPACE_ID}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emails: ['owner-invite@example.com'], role: 'member' }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Only owners can grant owner role');
    expect(mockQuery.mock.calls.some((call: any[]) => String(call[0]).includes('UPDATE workspace_invite'))).toBe(false);
  });

  it('does not allow workspace admins to remove owners', async () => {
    const token = await generateToken(ADMIN_USER_ID, TEST_APP_ID);

    let workspaceMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: ADMIN_USER_ID, name: 'Admin User', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('SELECT role FROM workspace_member')) {
        workspaceMemberQueryCount++;
        if (workspaceMemberQueryCount === 1) {
          return { rows: [{ role: 'admin' }] };
        }
        return { rows: [{ role: 'owner' }] };
      }
      if (sql.includes('SELECT COUNT(*)')) {
        return { rows: [{ count: '2' }] };
      }
      if (sql.includes('DELETE FROM workspace_member')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await app.request(`/api/workspaces/${TEST_WORKSPACE_ID}/members/${SECOND_USER_ID}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toBe('Only owners can modify owners');
    expect(mockQuery.mock.calls.some((call: any[]) => String(call[0]).includes('DELETE FROM workspace_member'))).toBe(false);
  });
});
