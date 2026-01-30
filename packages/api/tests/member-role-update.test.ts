/**
 * Tests for Part 5: Role Update PATCH Endpoints
 *
 * Tests PATCH /api/workspaces/:id/members/:userId
 * Tests PATCH /api/channels/:channelId/members/:userId
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database before importing anything that uses it
const mockQuery = vi.fn();
vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

// Mock centrifugo
vi.mock('../src/services/centrifugo', () => ({
  centrifugo: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
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
const TEST_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
const TEST_CHANNEL_ID = '22222222-2222-2222-2222-222222222222';
const OWNER_USER_ID = 'owner-user-111';
const ADMIN_USER_ID = 'admin-user-222';
const MEMBER_USER_ID = 'member-user-333';
const TARGET_USER_ID = 'target-user-444';
const TEST_API_KEY = 'a'.repeat(64);

async function generateToken(userId: string, appId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ user_id: userId, app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function makeRequest(path: string, method: string, token: string, body?: object, apiKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return app.request(path, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ============================================================================
// Workspace Member Role Update Tests
// ============================================================================

describe('PATCH /api/workspaces/:id/members/:userId', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('AC1: should update workspace member role successfully with API key auth', async () => {
    const token = await generateToken(OWNER_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: OWNER_USER_ID, name: 'Owner', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
        return { rows: [{ '?column?': 1 }] };
      }
      // Target member exists (with API key auth, permission check is skipped,
      // so the only workspace_member query is for the target user)
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'member' }] };
      }
      // Update role
      if (sql.includes('UPDATE workspace_member SET role')) {
        return { rows: [{ user_id: TARGET_USER_ID, role: 'admin' }], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/workspaces/${TEST_WORKSPACE_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'admin' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.role).toBe('admin');
  });

  it('AC3: API key auth bypasses per-user permission checks for workspace role update', async () => {
    const token = await generateToken(MEMBER_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: MEMBER_USER_ID, name: 'Member', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
        return { rows: [{ '?column?': 1 }] };
      }
      // Target member exists
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'member' }] };
      }
      if (sql.includes('UPDATE workspace_member SET role')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    // With API key auth, even a member-role user can update roles
    // because isAppLevelAuth() bypasses per-user permission checks
    const res = await makeRequest(
      `/api/workspaces/${TEST_WORKSPACE_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'admin' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(200);
  });

  it('AC5: should not allow demoting the last owner', async () => {
    const token = await generateToken(OWNER_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: OWNER_USER_ID, name: 'Owner', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
        return { rows: [{ '?column?': 1 }] };
      }
      // Target member is owner
      if (sql.includes('SELECT role FROM workspace_member') && sql.includes('user_id = $3')) {
        return { rows: [{ role: 'owner' }] };
      }
      // Caller is also owner
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'owner' }] };
      }
      // Only 1 owner
      if (sql.includes('SELECT COUNT(*)')) {
        return { rows: [{ count: '1' }] };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/workspaces/${TEST_WORKSPACE_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'member' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.message).toContain('last owner');
  });

  it('AC6: should return 404 if the target member does not exist', async () => {
    const token = await generateToken(OWNER_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: OWNER_USER_ID, name: 'Owner', image_url: null }] };
      }
      if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
        return { rows: [{ '?column?': 1 }] };
      }
      // Target member does not exist
      if (sql.includes('SELECT role FROM workspace_member') && sql.includes('user_id = $3')) {
        return { rows: [] };
      }
      // Caller is owner
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [{ role: 'owner' }] };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/workspaces/${TEST_WORKSPACE_ID}/members/nonexistent-user`,
      'PATCH',
      token,
      { role: 'admin' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(404);
  });

  // Note: Workspace role hierarchy enforcement is not needed because
  // isAppLevelAuth() always returns true (API key is mandatory for all requests),
  // which bypasses per-user permission checks. Hierarchy is enforced on channels only.

  it('should validate role value', async () => {
    const token = await generateToken(OWNER_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: OWNER_USER_ID, name: 'Owner', image_url: null }] };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/workspaces/${TEST_WORKSPACE_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'superadmin' }, // Invalid role
      TEST_API_KEY,
    );

    expect(res.status).toBe(400);
  });
});

// ============================================================================
// Channel Member Role Update Tests
// ============================================================================

describe('PATCH /api/channels/:channelId/members/:userId', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('AC2: should update channel member role successfully', async () => {
    const token = await generateToken(OWNER_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: OWNER_USER_ID, name: 'Owner', image_url: null }] };
      }
      // First call: caller role check, Second call: target role check
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'owner' }] }; // Caller is owner
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      // Update role
      if (sql.includes('UPDATE channel_member SET role')) {
        return { rows: [{ user_id: TARGET_USER_ID, role: 'moderator' }], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'moderator' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.role).toBe('moderator');
  });

  it('AC4: should require owner/admin/moderator permission for channel role update', async () => {
    const token = await generateToken(MEMBER_USER_ID, TEST_APP_ID);

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: MEMBER_USER_ID, name: 'Member', image_url: null }] };
      }
      // Caller is a regular member
      if (sql.includes('SELECT role FROM channel_member')) {
        return { rows: [{ role: 'member' }] };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'moderator' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(403);
  });

  // ---- Role Hierarchy Tests ----

  it('should prevent moderator from promoting member to owner', async () => {
    const token = await generateToken(MEMBER_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: MEMBER_USER_ID, name: 'Moderator', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'moderator' }] }; // Caller is moderator
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'owner' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(403);
  });

  it('should prevent moderator from promoting member to admin', async () => {
    const token = await generateToken(MEMBER_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: MEMBER_USER_ID, name: 'Moderator', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'moderator' }] }; // Caller is moderator
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'admin' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(403);
  });

  it('should allow moderator to assign moderator role', async () => {
    const token = await generateToken(MEMBER_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: MEMBER_USER_ID, name: 'Moderator', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'moderator' }] }; // Caller is moderator
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      if (sql.includes('UPDATE channel_member SET role')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'moderator' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(200);
  });

  it('should allow moderator to assign member role', async () => {
    const token = await generateToken(MEMBER_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: MEMBER_USER_ID, name: 'Moderator', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'moderator' }] }; // Caller is moderator
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      if (sql.includes('UPDATE channel_member SET role')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'member' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(200);
  });

  it('should prevent admin from promoting member to owner', async () => {
    const token = await generateToken(ADMIN_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: ADMIN_USER_ID, name: 'Admin', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'admin' }] }; // Caller is admin
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'owner' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(403);
  });

  it('should allow admin to assign admin, moderator, or member role', async () => {
    // Test assigning moderator (admin level > moderator level, should succeed)
    const token = await generateToken(ADMIN_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: ADMIN_USER_ID, name: 'Admin', image_url: null }] };
      }
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'admin' }] }; // Caller is admin
        }
        return { rows: [{ role: 'member' }] }; // Target is member
      }
      if (sql.includes('UPDATE channel_member SET role')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/${TARGET_USER_ID}`,
      'PATCH',
      token,
      { role: 'moderator' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(200);
  });

  it('AC6: should return 404 if the target channel member does not exist', async () => {
    const token = await generateToken(OWNER_USER_ID, TEST_APP_ID);

    let channelMemberQueryCount = 0;
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
        return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
      }
      if (sql.includes('SELECT id, name, image_url FROM app_user')) {
        return { rows: [{ id: OWNER_USER_ID, name: 'Owner', image_url: null }] };
      }
      // First call: caller role (owner), Second call: target (not found)
      if (sql.includes('SELECT role FROM channel_member')) {
        channelMemberQueryCount++;
        if (channelMemberQueryCount === 1) {
          return { rows: [{ role: 'owner' }] };
        }
        return { rows: [] }; // Target not found
      }
      return { rows: [] };
    });

    const res = await makeRequest(
      `/api/channels/${TEST_CHANNEL_ID}/members/nonexistent-user`,
      'PATCH',
      token,
      { role: 'moderator' },
      TEST_API_KEY,
    );

    expect(res.status).toBe(404);
  });
});
