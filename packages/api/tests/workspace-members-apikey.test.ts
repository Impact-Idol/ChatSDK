/**
 * Test: API Key should authorize workspace member management
 *
 * Verifies that POST /api/workspaces/:id/members allows member management
 * when a valid X-API-Key is present, regardless of the Bearer token user's
 * workspace role. The API key represents a trusted server-side call.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database before importing anything that uses it
const mockQuery = vi.fn();
vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

// Mock centrifugo to avoid side effects
vi.mock('../src/services/centrifugo', () => ({
  centrifugo: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger — uses importOriginal so new exports don't break this mock
vi.mock('../src/services/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const mocked: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    const val = actual[key];
    if (typeof val === 'function') {
      mocked[key] = vi.fn();
    } else if (typeof val === 'object' && val !== null) {
      // logger instance — mock its methods
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

function setupDbMocks() {
  mockQuery.mockImplementation((sql: string, params?: any[]) => {
    // Auth middleware: validate API key
    if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
      return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
    }
    // Auth middleware: get user info from token
    if (sql.includes('SELECT id, name, image_url FROM app_user')) {
      return { rows: [{ id: REGULAR_USER_ID, name: 'Regular User', image_url: null }] };
    }
    // Workspace existence check
    if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
      return { rows: [{ '?column?': 1 }] };
    }
    // Workspace member role check — user is NOT a member
    if (sql.includes('SELECT role FROM workspace_member')) {
      return { rows: [] };
    }
    // Owner count check (for last-owner guard)
    if (sql.includes('SELECT COUNT(*)')) {
      return { rows: [{ count: '0' }] };
    }
    // Insert workspace member
    if (sql.includes('INSERT INTO workspace_member')) {
      return { rows: [], rowCount: 1 };
    }
    // Delete workspace member
    if (sql.includes('DELETE FROM workspace_member')) {
      return { rows: [], rowCount: 1 };
    }
    // Update member count
    if (sql.includes('UPDATE workspace')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [] };
  });
}

function makeRequest(path: string, method: string, token: string, body?: object) {
  return app.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': TEST_API_KEY,
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Workspace API Key Authorization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('POST /api/workspaces/:id/members - Add Members', () => {
    it('should return 200 when valid API key is present, even if Bearer token user is not a workspace member', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);
      setupDbMocks();

      const res = await makeRequest(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members`,
        'POST',
        token,
        { userIds: [REGULAR_USER_ID], role: 'member' },
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.added).toContain(REGULAR_USER_ID);
    });

    it('should bypass the workspace role check query when API key is present', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);
      setupDbMocks();

      await makeRequest(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members`,
        'POST',
        token,
        { userIds: [REGULAR_USER_ID], role: 'member' },
      );

      // Verify the role check query was never executed
      const roleCheckCalls = mockQuery.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('SELECT role FROM workspace_member')
      );
      expect(roleCheckCalls).toHaveLength(0);
    });

    it('should add multiple users in a single request with API key auth', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);
      setupDbMocks();

      const res = await makeRequest(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members`,
        'POST',
        token,
        { userIds: [REGULAR_USER_ID, SECOND_USER_ID], role: 'member' },
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.added).toContain(REGULAR_USER_ID);
      expect(data.added).toContain(SECOND_USER_ID);
      expect(data.count).toBe(2);
    });

    it('should return 404 when workspace does not exist', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);
      const NON_EXISTENT_WS = '99999999-9999-9999-9999-999999999999';

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
          return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
        }
        if (sql.includes('SELECT id, name, image_url FROM app_user')) {
          return { rows: [{ id: REGULAR_USER_ID, name: 'Regular User', image_url: null }] };
        }
        // Workspace does NOT exist
        if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO workspace_member')) {
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes('UPDATE workspace')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [] };
      });

      const res = await makeRequest(
        `/api/workspaces/${NON_EXISTENT_WS}/members`,
        'POST',
        token,
        { userIds: [REGULAR_USER_ID], role: 'member' },
      );

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.message).toBe('Workspace not found');
    });

    it('should return 401 when no API key is present', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);

      const res = await app.request(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userIds: [REGULAR_USER_ID],
            role: 'member',
          }),
        }
      );

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/workspaces/:id/members/:userId - Remove Member', () => {
    it('should allow removing a member with API key auth even if token user is not a workspace admin', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);
      setupDbMocks();

      const res = await makeRequest(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members/${SECOND_USER_ID}`,
        'DELETE',
        token,
      );

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when removing member from non-existent workspace', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);
      const NON_EXISTENT_WS = '99999999-9999-9999-9999-999999999999';

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
          return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
        }
        if (sql.includes('SELECT id, name, image_url FROM app_user')) {
          return { rows: [{ id: REGULAR_USER_ID, name: 'Regular User', image_url: null }] };
        }
        // Workspace does NOT exist
        if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT role FROM workspace_member')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const res = await makeRequest(
        `/api/workspaces/${NON_EXISTENT_WS}/members/${SECOND_USER_ID}`,
        'DELETE',
        token,
      );

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.message).toBe('Workspace not found');
    });

    it('should still prevent removing the last owner even with API key auth', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
          return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
        }
        if (sql.includes('SELECT id, name, image_url FROM app_user')) {
          return { rows: [{ id: REGULAR_USER_ID, name: 'Regular User', image_url: null }] };
        }
        // Workspace existence check
        if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
          return { rows: [{ '?column?': 1 }] };
        }
        // Target user is an owner
        if (sql.includes('SELECT role FROM workspace_member')) {
          return { rows: [{ role: 'owner' }] };
        }
        // Only 1 owner exists
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      const res = await makeRequest(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members/${SECOND_USER_ID}`,
        'DELETE',
        token,
      );

      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error.message).toBe('Cannot remove the last owner');
    });
  });

  describe('Edge cases - Invalid credentials', () => {
    it('should return 401 when API key is invalid', async () => {
      const token = await generateToken(REGULAR_USER_ID, TEST_APP_ID);

      mockQuery.mockImplementation((sql: string) => {
        // API key not found in database
        if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const res = await app.request(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'invalid-key',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userIds: [REGULAR_USER_ID], role: 'member' }),
        },
      );

      expect(res.status).toBe(401);
    });

    it('should return 404 when API key belongs to a different app than the workspace', async () => {
      const DIFFERENT_APP_ID = '00000000-0000-0000-0000-000000000099';
      const token = await generateToken(REGULAR_USER_ID, DIFFERENT_APP_ID);

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name, settings FROM app WHERE api_key')) {
          return { rows: [{ id: DIFFERENT_APP_ID, name: 'Different App', settings: {} }] };
        }
        if (sql.includes('SELECT id, name, image_url FROM app_user')) {
          return { rows: [{ id: REGULAR_USER_ID, name: 'Regular User', image_url: null }] };
        }
        // Workspace does not belong to this app
        if (sql.includes('SELECT 1 FROM workspace WHERE id')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO workspace_member')) {
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes('UPDATE workspace')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [] };
      });

      const res = await makeRequest(
        `/api/workspaces/${TEST_WORKSPACE_ID}/members`,
        'POST',
        token,
        { userIds: [REGULAR_USER_ID], role: 'member' },
      );

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.message).toBe('Workspace not found');
    });
  });
});
