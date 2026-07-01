import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';
import { randomUUID } from 'crypto';

const mockQuery = vi.fn();
const mockWithBrokerSystemContext = vi.fn(async (fn: () => Promise<unknown>) => fn());

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    withBrokerSystemContext: (fn: () => Promise<unknown>) => mockWithBrokerSystemContext(fn),
    withTenantContext: async (_tenant: any, fn: () => Promise<unknown>) => fn(),
    withIsolatedTenantContext: async (_tenant: any, fn: () => Promise<unknown>) => fn(),
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

const APP_ID = '00000000-0000-0000-0000-000000000001';
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const CREDENTIAL_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_SLUG = 'client-a-production';
const KID = 'client-a-key-1';
const USER_ID = 'client-a:user-1';

let privateKey: CryptoKey;
let publicJwk: jose.JWK;

const mintBody = {
  userId: USER_ID,
  externalTenantId: 'tenant-a',
  externalUserId: 'user-1',
  externalSessionId: 'client-session-123',
  deviceId: 'browser-1',
  requestedScopes: ['chat:read', 'chat:write'],
  ttlSeconds: 120,
};

async function signBrokerJwt() {
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(CLIENT_SLUG)
    .setAudience('chatsdk-server-mint')
    .setSubject('broker')
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + 30)
    .sign(privateKey);
}

function setupSuccessfulQueries() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM broker_credential')) {
      return {
        rows: [{
          client_id: CLIENT_ID,
          client_slug: CLIENT_SLUG,
          credential_id: CREDENTIAL_ID,
          kid: KID,
          public_key_jwk: publicJwk,
        }],
      };
    }
    if (sql.includes('DELETE FROM broker_jwt_replay')) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('INSERT INTO broker_jwt_replay')) {
      return { rows: [{ jti: 'accepted' }], rowCount: 1 };
    }
    if (sql.includes('FROM broker_app_scope')) {
      return {
        rows: [{
          allowed_external_tenant_ids: ['tenant-a'],
          allowed_user_id_prefixes: ['client-a:'],
          allowed_channel_id_prefixes: ['support-'],
          max_membership_fanout: 10,
          allowed_origins: ['https://client-a.example.com'],
          max_token_ttl_seconds: 300,
          default_scopes: ['chat:read'],
          allowed_scopes: ['chat:read', 'chat:write'],
        }],
      };
    }
    if (sql.includes('FROM broker_membership_state')) {
      return {
        rows: [{
          version: 'tenant-a:user-1:42',
          revision: '42',
          fresh_until: new Date(Date.now() + 5 * 60 * 1000),
          status: 'active',
        }],
      };
    }
    if (sql.includes('INSERT INTO auth_session')) {
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('SELECT id FROM app WHERE id = $1')) {
      return { rows: [{ id: APP_ID }], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO broker_mint_audit')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe('broker token mint route', () => {
  beforeEach(async () => {
    mockQuery.mockReset();
    mockWithBrokerSystemContext.mockClear();
    const keys = await jose.generateKeyPair('RS256', { extractable: true });
    privateKey = keys.privateKey;
    publicJwk = await jose.exportJWK(keys.publicKey);
    setupSuccessfulQueries();
  });

  it('mints access and realtime tokens without returning a refresh token', async () => {
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/tokens/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mintBody),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toEqual(expect.any(String));
    expect(data._internal.wsToken).toEqual(expect.any(String));
    expect(jose.decodeJwt(data.token).scopes).toEqual(['chat:read', 'chat:write']);
    expect(jose.decodeJwt(data._internal.wsToken).scopes).toEqual(['chat:read', 'chat:write']);
    expect(data.refreshToken).toBeUndefined();
    expect(data.expiresIn).toBe(120);
    expect(data.user).toMatchObject({
      id: USER_ID,
      externalTenantId: 'tenant-a',
      membershipVersion: 'tenant-a:user-1:42',
      membershipRevision: 42,
    });

    const decodedAccess = jose.decodeJwt(data.token);
    expect(decodedAccess.scopes).toEqual(['chat:read', 'chat:write']);

    const decodedWs = jose.decodeJwt(data._internal.wsToken);
    expect(decodedWs.scopes).toEqual(['chat:read', 'chat:write']);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_session'),
      expect.arrayContaining([
        expect.any(String),
        APP_ID,
        USER_ID,
        expect.any(Date),
        CLIENT_ID,
        CREDENTIAL_ID,
        'tenant-a',
        'user-1',
      ])
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['success'])
    );
  });

  it('denies token mint when broker membership is stale', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM broker_credential')) {
        return {
          rows: [{
            client_id: CLIENT_ID,
            client_slug: CLIENT_SLUG,
            credential_id: CREDENTIAL_ID,
            kid: KID,
            public_key_jwk: publicJwk,
          }],
        };
      }
      if (sql.includes('DELETE FROM broker_jwt_replay')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO broker_jwt_replay')) return { rows: [{ jti: 'accepted' }], rowCount: 1 };
      if (sql.includes('FROM broker_app_scope')) {
        return {
          rows: [{
            allowed_external_tenant_ids: ['tenant-a'],
            allowed_user_id_prefixes: ['client-a:'],
            allowed_channel_id_prefixes: ['client-a:'],
            max_membership_fanout: 10,
            allowed_origins: [],
            max_token_ttl_seconds: 300,
            default_scopes: ['chat:read'],
            allowed_scopes: ['chat:read', 'chat:write'],
          }],
        };
      }
      if (sql.includes('FROM broker_membership_state')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT id FROM app WHERE id = $1')) return { rows: [{ id: APP_ID }] };
      if (sql.includes('INSERT INTO broker_mint_audit')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/tokens/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mintBody),
    });

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_session'),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_MEMBERSHIP_STALE'])
    );
  });

  it('denies token mint when broker membership is removed', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM broker_credential')) {
        return {
          rows: [{
            client_id: CLIENT_ID,
            client_slug: CLIENT_SLUG,
            credential_id: CREDENTIAL_ID,
            kid: KID,
            public_key_jwk: publicJwk,
          }],
        };
      }
      if (sql.includes('DELETE FROM broker_jwt_replay')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO broker_jwt_replay')) return { rows: [{ jti: 'accepted' }], rowCount: 1 };
      if (sql.includes('FROM broker_app_scope')) {
        return {
          rows: [{
            allowed_external_tenant_ids: ['tenant-a'],
            allowed_user_id_prefixes: ['client-a:'],
            allowed_channel_id_prefixes: ['support-'],
            max_membership_fanout: 10,
            allowed_origins: [],
            max_token_ttl_seconds: 300,
            default_scopes: ['chat:read'],
            allowed_scopes: ['chat:read', 'chat:write'],
          }],
        };
      }
      if (sql.includes('FROM broker_membership_state')) {
        return {
          rows: [{
            version: 'tenant-a:user-1:43',
            revision: '43',
            fresh_until: new Date(Date.now() + 5 * 60 * 1000),
            status: 'removed',
          }],
        };
      }
      if (sql.includes('SELECT id FROM app WHERE id = $1')) return { rows: [{ id: APP_ID }] };
      if (sql.includes('INSERT INTO broker_mint_audit')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/tokens/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mintBody),
    });

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_session'),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_MEMBERSHIP_STALE'])
    );
  });

  it('denies disallowed requested scopes before session creation', async () => {
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/tokens/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...mintBody,
        requestedScopes: ['chat:read', 'upload:write'],
      }),
    });

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_session'),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_SCOPE_DENIED'])
    );
  });

  it('denies requested token TTL above the broker app scope maximum', async () => {
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/tokens/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...mintBody,
        ttlSeconds: 301,
      }),
    });

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_session'),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_TTL_DENIED'])
    );
  });
});
