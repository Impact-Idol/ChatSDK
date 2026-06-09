import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';
import { randomUUID } from 'crypto';

const mockQuery = vi.fn();
const mockWithBrokerSystemContext = vi.fn(async (fn: () => Promise<unknown>) => fn());

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
    withBrokerSystemContext: (fn: () => Promise<unknown>) => mockWithBrokerSystemContext(fn),
  },
}));

vi.mock('../src/services/rate-limit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import {
  authenticateBrokerRequest,
  BrokerAuthError,
} from '../src/services/broker-auth';

const APP_ID = '00000000-0000-0000-0000-000000000001';
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const CREDENTIAL_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_SLUG = 'client-a-production';
const KID = 'client-a-key-1';

let privateKey: CryptoKey;
let publicJwk: jose.JWK;

function mockContext(token: string, headers: Record<string, string> = {}) {
  return {
    req: {
      header: (name: string) => {
        const supplied = headers[name.toLowerCase()];
        if (supplied !== undefined) return supplied;
        if (name.toLowerCase() === 'authorization') return `Bearer ${token}`;
        if (name.toLowerCase() === 'user-agent') return 'vitest';
        return undefined;
      },
    },
    get: () => 'test-request-id',
  } as any;
}

async function signBrokerJwt(input: {
  alg?: 'RS256' | 'HS256';
  kid?: string;
  jti?: string;
  issuer?: string;
  audience?: string;
  lifetimeSeconds?: number;
  issuedAtOffsetSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const issuedAt = now + (input.issuedAtOffsetSeconds ?? 0);
  const alg = input.alg ?? 'RS256';
  const signer = alg === 'RS256'
    ? privateKey
    : new TextEncoder().encode('test-hs-secret-minimum-length');
  return new jose.SignJWT({})
    .setProtectedHeader({ alg, kid: input.kid ?? KID })
    .setIssuer(input.issuer ?? CLIENT_SLUG)
    .setAudience(input.audience ?? 'chatsdk-server-mint')
    .setSubject('broker')
    .setJti(input.jti ?? randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + (input.lifetimeSeconds ?? 30))
    .sign(signer);
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
    if (sql.includes('SELECT id FROM app WHERE id = $1')) {
      return { rows: [{ id: APP_ID }], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO broker_mint_audit')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [] };
  });
}

describe('broker service JWT authentication', () => {
  beforeEach(async () => {
    mockQuery.mockReset();
    mockWithBrokerSystemContext.mockClear();
    const keys = await jose.generateKeyPair('RS256', { extractable: true });
    privateKey = keys.privateKey;
    publicJwk = await jose.exportJWK(keys.publicKey);
    setupSuccessfulQueries();
  });

  it('accepts a valid RS256 service JWT for an active scoped credential', async () => {
    const token = await signBrokerJwt({});

    const auth = await authenticateBrokerRequest(mockContext(token), APP_ID);

    expect(auth).toMatchObject({
      clientId: CLIENT_ID,
      clientSlug: CLIENT_SLUG,
      credentialId: CREDENTIAL_ID,
      credentialKid: KID,
      appId: APP_ID,
      allowedExternalTenantIds: ['tenant-a'],
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_jwt_replay'),
      expect.any(Array)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("expires_at < NOW() - INTERVAL '5 seconds'")
    );
  });

  it('rejects unknown kid and writes a denied audit', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM broker_credential')) return { rows: [] };
      if (sql.includes('INSERT INTO broker_mint_audit')) return { rows: [], rowCount: 1 };
      return { rows: [] };
    });
    const token = await signBrokerJwt({ kid: 'unknown-kid' });

    await expect(authenticateBrokerRequest(mockContext(token), APP_ID))
      .rejects.toMatchObject({ code: 'BROKER_AUTH_INVALID' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['unknown-kid'])
    );
  });

  it('rejects non-RS256 service JWTs before credential lookup', async () => {
    const token = await signBrokerJwt({ alg: 'HS256' });

    await expect(authenticateBrokerRequest(mockContext(token), APP_ID))
      .rejects.toBeInstanceOf(BrokerAuthError);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('FROM broker_credential'),
      expect.any(Array)
    );
  });

  it('rejects service JWT lifetimes above the production cap', async () => {
    const token = await signBrokerJwt({ lifetimeSeconds: 300 });

    await expect(authenticateBrokerRequest(mockContext(token), APP_ID))
      .rejects.toMatchObject({ code: 'BROKER_AUTH_INVALID' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['broker_jwt_lifetime_too_long'])
    );
  });

  it('rejects service JWTs issued in the future', async () => {
    const token = await signBrokerJwt({ issuedAtOffsetSeconds: 3600 });

    await expect(authenticateBrokerRequest(mockContext(token), APP_ID))
      .rejects.toMatchObject({ code: 'BROKER_AUTH_INVALID' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['broker_jwt_lifetime_too_long'])
    );
  });

  it('rejects replayed service JWT IDs', async () => {
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
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('INSERT INTO broker_mint_audit')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });
    const token = await signBrokerJwt({});

    await expect(authenticateBrokerRequest(mockContext(token), APP_ID))
      .rejects.toMatchObject({ code: 'BROKER_AUTH_REPLAY' });
  });

  it('rejects credentials that are not scoped to the requested app', async () => {
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
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO broker_mint_audit')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });
    const token = await signBrokerJwt({});

    await expect(authenticateBrokerRequest(mockContext(token), APP_ID))
      .rejects.toMatchObject({ code: 'BROKER_SCOPE_DENIED', status: 403 });
  });

  it('rejects configured origin mismatches and writes a denied audit', async () => {
    const token = await signBrokerJwt({});

    await expect(
      authenticateBrokerRequest(mockContext(token, { origin: 'https://evil.example.com' }), APP_ID)
    ).rejects.toMatchObject({ code: 'BROKER_ORIGIN_DENIED', status: 403 });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO broker_mint_audit'),
      expect.arrayContaining(['broker_origin_denied'])
    );
  });
});
