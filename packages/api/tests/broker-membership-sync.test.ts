import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';
import { randomUUID } from 'crypto';

const mockQuery = vi.fn();
const mockWithBrokerSystemContext = vi.fn(async (fn: () => Promise<unknown>) => fn());
const mockDisconnect = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    transaction: async (fn: any) => fn({ query: mockQuery }),
    withBrokerSystemContext: (fn: () => Promise<unknown>) => mockWithBrokerSystemContext(fn),
    withTenantContext: async (_tenant: any, fn: () => Promise<unknown>) => fn(),
  },
}));

vi.mock('../src/services/centrifugo', () => ({
  getCentrifugo: vi.fn(() => ({
    disconnect: mockDisconnect,
  })),
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
const SUPPORT_CHANNEL_ID = '33333333-3333-4333-8333-333333333333';
const OLD_CHANNEL_ID = '44444444-4444-4444-8444-444444444444';

let privateKey: CryptoKey;
let publicJwk: jose.JWK;

const membershipBody = {
  version: 'tenant-a:user-1:42',
  revision: 42,
  freshUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  stateHash: 'sha256:membership-state',
  externalTenantId: 'tenant-a',
  displayName: 'Alice Example',
  avatarUrl: 'https://client-a.example.com/alice.png',
  memberships: [
    { type: 'channel', id: 'support-123', role: 'member' },
  ],
  status: 'active',
  metadata: { plan: 'pro' },
} as const;

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
          max_token_ttl_seconds: 900,
          default_scopes: ['chat:read', 'chat:write'],
          allowed_scopes: ['chat:read', 'chat:write', 'upload:write'],
        }],
      };
    }
    if (sql.includes('SELECT revision, status')) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO app_user')) {
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO broker_membership_state')) {
      return { rows: [{ revision: '42', status: 'active' }], rowCount: 1 };
    }
    if (sql.includes('FROM channel_member cm')) {
      return { rows: [] };
    }
    if (sql.includes('SELECT id, cid FROM channel WHERE')) {
      return { rows: [{ id: SUPPORT_CHANNEL_ID, cid: 'support-123' }] };
    }
    if (sql.includes('INSERT INTO channel_member')) {
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('DELETE FROM channel_member')) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('UPDATE channel SET member_count')) {
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO broker_mint_audit')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe('broker membership sync route', () => {
  beforeEach(async () => {
    mockQuery.mockReset();
    mockWithBrokerSystemContext.mockClear();
    mockDisconnect.mockClear();
    const keys = await jose.generateKeyPair('RS256', { extractable: true });
    privateKey = keys.privateKey;
    publicJwk = await jose.exportJWK(keys.publicKey);
    setupSuccessfulQueries();
  });

  it('rejects app API keys without a broker service JWT', async () => {
    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'app-key',
      },
      body: JSON.stringify(membershipBody),
    });

    expect(res.status).toBe(401);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.any(Array)
    );
  });

  it('applies an active membership snapshot for a scoped broker credential', async () => {
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(membershipBody),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      appId: APP_ID,
      userId: USER_ID,
      membershipVersion: membershipBody.version,
      membershipRevision: membershipBody.revision,
      stateHash: membershipBody.stateHash,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_user'),
      expect.arrayContaining([APP_ID, USER_ID])
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_membership_state'),
      expect.arrayContaining([APP_ID, USER_ID, 'tenant-a', membershipBody.version])
    );
    const channelMemberCall = mockQuery.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO channel_member')
    );
    expect(channelMemberCall?.[1]).toEqual([
      [SUPPORT_CHANNEL_ID],
      APP_ID,
      USER_ID,
      ['member'],
    ]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['success'])
    );
  });

  it('rejects a race-lost membership upsert instead of reporting success', async () => {
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
            allowed_origins: [],
            max_token_ttl_seconds: 900,
            default_scopes: ['chat:read'],
            allowed_scopes: ['chat:read'],
          }],
        };
      }
      if (sql.includes('SELECT revision, status, version')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO app_user')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO broker_membership_state')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('INSERT INTO broker_mint_audit')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(membershipBody),
    });

    expect(res.status).toBe(409);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_MEMBERSHIP_CONFLICT'])
    );
  });

  it('audits authenticated validation failures', async () => {
    const token = await signBrokerJwt();
    const invalid = {
      ...membershipBody,
      metadata: { oversized: 'x'.repeat(5000) },
    };

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(invalid),
    });

    expect(res.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['invalid_membership_payload'])
    );
  });

  it('rejects oversized membership payloads before broker auth', async () => {
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(200 * 1024),
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(membershipBody),
    });

    expect(res.status).toBe(413);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('FROM broker_credential'),
      expect.any(Array)
    );
  });

  it('rejects membership revisions above the safe integer boundary', async () => {
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...membershipBody,
        revision: Number.MAX_SAFE_INTEGER + 1,
      }),
    });

    expect(res.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['invalid_membership_payload'])
    );
  });

  it('rejects membership revision rollback and writes denied audit', async () => {
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
            allowed_origins: [],
            max_token_ttl_seconds: 900,
            default_scopes: ['chat:read'],
            allowed_scopes: ['chat:read'],
          }],
        };
      }
      if (sql.includes('SELECT revision, status')) {
        return {
          rows: [{
            revision: '100',
            status: 'active',
            version: 'tenant-a:user-1:100',
            state_hash: 'sha256:previous-state',
            external_tenant_id: 'tenant-a',
            fresh_until: new Date(Date.now() + 10 * 60 * 1000),
          }],
        };
      }
      if (sql.includes('INSERT INTO broker_mint_audit')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(membershipBody),
    });

    expect(res.status).toBe(409);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_MEMBERSHIP_ROLLBACK'])
    );
  });

  it('rejects external tenant reassignment for an existing broker user', async () => {
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
            allowed_origins: [],
            max_token_ttl_seconds: 900,
            default_scopes: ['chat:read'],
            allowed_scopes: ['chat:read'],
          }],
        };
      }
      if (sql.includes('SELECT revision, status')) {
        return {
          rows: [{
            revision: '41',
            status: 'active',
            version: 'tenant-b:user-1:41',
            state_hash: 'sha256:previous-state',
            external_tenant_id: 'tenant-b',
            fresh_until: new Date(Date.now() + 10 * 60 * 1000),
          }],
        };
      }
      if (sql.includes('INSERT INTO broker_mint_audit')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(membershipBody),
    });

    expect(res.status).toBe(409);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_user'),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['BROKER_TENANT_REASSIGN_DENIED'])
    );
  });

  it('revokes sessions and enqueues realtime disconnect when status is removed', async () => {
    const token = await signBrokerJwt();
    const removed = {
      ...membershipBody,
      status: 'removed',
      revision: 43,
    };

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(removed),
    });

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE auth_session'),
      expect.arrayContaining([APP_ID, USER_ID, 'broker_membership_removed'])
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_outbox'),
      expect.arrayContaining([
        APP_ID,
        'auth_session',
        USER_ID,
        'realtime.disconnect_user',
      ])
    );
  });

  it('enqueues durable realtime unsubscribe when an active snapshot removes a channel', async () => {
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
            allowed_origins: [],
            max_token_ttl_seconds: 900,
            default_scopes: ['chat:read'],
            allowed_scopes: ['chat:read'],
          }],
        };
      }
      if (sql.includes('SELECT revision, status, version')) {
        return {
          rows: [{
            revision: '41',
            status: 'active',
            version: 'tenant-a:user-1:41',
            state_hash: 'sha256:previous-state',
            external_tenant_id: 'tenant-a',
          }],
        };
      }
      if (sql.includes('INSERT INTO app_user')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO broker_membership_state')) {
        return { rows: [{ revision: '42', status: 'active' }], rowCount: 1 };
      }
      if (sql.includes('FROM channel_member cm')) {
        return {
          rows: [
            { channel_id: SUPPORT_CHANNEL_ID, cid: 'support-123' },
            { channel_id: OLD_CHANNEL_ID, cid: 'support-old' },
          ],
        };
      }
      if (sql.includes('SELECT id, cid FROM channel WHERE')) {
        return { rows: [{ id: SUPPORT_CHANNEL_ID, cid: 'support-123' }] };
      }
      if (sql.includes('INSERT INTO channel_member')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('DELETE FROM channel_member')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('UPDATE channel SET member_count')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO event_outbox')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO broker_mint_audit')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const token = await signBrokerJwt();

    const res = await app.request(`/api/server/apps/${APP_ID}/memberships/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(membershipBody),
    });

    expect(res.status).toBe(200);
    const unsubscribeCall = mockQuery.mock.calls.find(
      ([sql, params]) => typeof sql === 'string'
        && sql.includes('INSERT INTO event_outbox')
        && Array.isArray(params)
        && Array.isArray(params[1])
        && params[1].includes(`${OLD_CHANNEL_ID}:${USER_ID}`)
    );
    expect(unsubscribeCall?.[1]).toEqual([
      APP_ID,
      [`${OLD_CHANNEL_ID}:${USER_ID}`],
      [expect.stringContaining(`chat:${APP_ID}:${OLD_CHANNEL_ID}`)],
      [`broker.unsubscribe:${APP_ID}:${USER_ID}:support-old:42`],
    ]);
  });
});
