import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';

const provisioning = await import('../../../scripts/ops/provision-project.mjs');

function makeDb(rowsByCall: any[]) {
  const calls: any[] = [];
  return {
    calls,
    query: async (sql: string, params: any[]) => {
      calls.push({ sql, params });
      if (
        sql === 'BEGIN'
        || sql === 'COMMIT'
        || sql === 'ROLLBACK'
        || sql.includes('pg_advisory_xact_lock')
      ) {
        return { rows: [], rowCount: 0 };
      }
      const next = rowsByCall.shift();
      if (next instanceof Error) throw next;
      return next ?? { rows: [], rowCount: 0 };
    },
  };
}

const projectAppRow = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Seed Project A',
  settings: {
    provisioning: {
      slug: 'seed-project-a-dev',
      environment: 'development',
      origins: ['https://a.example'],
      browserScopes: ['chat:read', 'chat:write'],
    },
  },
  created_at: '2026-06-20T00:00:00Z',
  updated_at: '2026-06-20T00:00:00Z',
};

describe('project provisioning operator helpers', () => {
  it('redacts secrets in stable show output', () => {
    expect(provisioning.redactSecret('chatsdk_1234567890abcdef1234567890abcdef12345678')).toBe(
      'chatsdk_12...345678'
    );
    expect(provisioning.redactSecret('short')).toBe('sh...rt');
    expect(provisioning.redactSecret(null)).toBeNull();
  });

  it('rejects demo slugs and channel:create defaults for production-like projects', () => {
    const demoErrors = provisioning.validateProjectInput({
      slug: 'demo',
      environment: 'production',
      name: 'Demo',
      keyName: 'demo-server',
      origins: [],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
    });
    expect(demoErrors).toContain('slug demo is reserved for demo/development use');

    const scopeErrors = provisioning.validateProjectInput({
      slug: 'vouch-prod',
      environment: 'production',
      name: 'Vouch Prod',
      keyName: 'vouch-prod-server',
      origins: [],
      browserScopes: ['chat:read', 'chat:write', 'channel:create'],
      allowDemo: false,
    });
    expect(scopeErrors).toContain(
      'channel:create must not be part of default browser scopes for production-like projects'
    );
  });

  it('parses boolean flags without swallowing or looping on the next option', () => {
    const parsed = provisioning.parseArgs([
      'create',
      '--json',
      '--emit-secret',
      '--slug',
      'vouch-dev',
      '--environment=development',
    ]);

    expect(parsed).toEqual({
      command: 'create',
      options: {
        json: true,
        emitSecret: true,
        slug: 'vouch-dev',
        environment: 'development',
      },
    });
    expect(provisioning.parseBoolean('false')).toBe(false);
    expect(provisioning.parseBoolean('0')).toBe(false);
    expect(provisioning.parseBoolean(true)).toBe(true);
  });

  it('creates a project app and one-time server key without relying on the primary app key', async () => {
    const db = makeDb([
      { rows: [] },
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev',
          settings: {},
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:00:00Z',
        }],
      },
      { rows: [] },
      {
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          name: 'vouch-dev-server',
          api_key: 'chatsdk_created_key',
          created_at: '2026-06-20T00:00:01Z',
          revoked_at: null,
          last_used_at: null,
        }],
      },
    ]);

    const output = await provisioning.provisionProject(db, {
      slug: 'vouch-dev',
      environment: 'development',
      name: 'Vouch Dev',
      keyName: 'vouch-dev-server',
      origins: ['http://localhost:3000'],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
      emitSecret: true,
    });

    expect(output.project.appCreated).toBe(true);
    expect(output.serverKey.created).toBe(true);
    expect(output.serverKey.apiKey).toMatch(/^chatsdk_/);
    expect(output.serverKey.redactedApiKey).not.toBe(output.serverKey.apiKey);
    const insertKeyCall = db.calls.find((call) => call.sql.includes('INSERT INTO app_api_key'));
    expect(insertKeyCall).toBeTruthy();
    expect(insertKeyCall.params[2]).toBe(
      createHash('sha256').update(output.serverKey.apiKey).digest('hex')
    );
    expect(insertKeyCall.params[2]).toMatch(/^[a-f0-9]{64}$/);
    expect(insertKeyCall.params[2]).not.toBe(output.serverKey.apiKey);
    expect(db.calls.some((call) => call.sql.includes('api_secret'))).toBe(false);
  });

  it('suppresses newly-created plaintext server keys unless explicitly requested', async () => {
    const db = makeDb([
      { rows: [] },
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev',
          settings: {},
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:00:00Z',
        }],
      },
      { rows: [] },
      {
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          name: 'vouch-dev-server',
          api_key: 'chatsdk_created_key',
          created_at: '2026-06-20T00:00:01Z',
          revoked_at: null,
          last_used_at: null,
        }],
      },
    ]);

    const output = await provisioning.provisionProject(db, {
      slug: 'vouch-dev',
      environment: 'development',
      name: 'Vouch Dev',
      keyName: 'vouch-dev-server',
      origins: ['http://localhost:3000'],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
      emitSecret: false,
    });

    expect(output.serverKey.created).toBe(true);
    expect(output.serverKey).not.toHaveProperty('apiKey');
    expect(output.serverKey.redactedApiKey).toMatch(/^chatsdk_/);
    expect(output.warnings[0]).toContain('plaintext output was suppressed');
  });

  it('rotates a server key inside the project lock and transaction', async () => {
    const db = makeDb([
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev',
          settings: {},
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:00:00Z',
        }],
      },
      { rows: [{ id: '22222222-2222-4222-8222-222222222222' }], rowCount: 1 },
      {
        rows: [{
          id: '33333333-3333-4333-8333-333333333333',
          name: 'vouch-dev-server',
          api_key: 'chatsdk_rotated_key',
          created_at: '2026-06-20T00:00:02Z',
          revoked_at: null,
          last_used_at: null,
        }],
      },
    ]);

    const output = await provisioning.rotateProjectKey(db, {
      slug: 'vouch-dev',
      environment: 'development',
      name: 'Vouch Dev',
      keyName: 'vouch-dev-server',
      origins: undefined,
      browserScopes: undefined,
      allowDemo: false,
      emitSecret: true,
    });

    expect(output.command).toBe('rotate-key');
    expect(output.serverKey.apiKey).toMatch(/^chatsdk_/);
    expect(db.calls.map((call) => call.sql)).toEqual(expect.arrayContaining([
      'BEGIN',
      expect.stringContaining('pg_advisory_xact_lock'),
      expect.stringContaining('UPDATE app_api_key'),
      expect.stringContaining('INSERT INTO app_api_key'),
      'COMMIT',
    ]));
  });

  it('uses returned revoked-key rows instead of rowCount when rotating a server key', async () => {
    const db = makeDb([
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev',
          settings: {},
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:00:00Z',
        }],
      },
      { rows: [{ id: '22222222-2222-4222-8222-222222222222' }], rowCount: null },
      {
        rows: [{
          id: '33333333-3333-4333-8333-333333333333',
          name: 'vouch-dev-server',
          api_key: 'chatsdk_rotated_key',
          created_at: '2026-06-20T00:00:02Z',
          revoked_at: null,
          last_used_at: null,
        }],
      },
    ]);

    const output = await provisioning.rotateProjectKey(db, {
      slug: 'vouch-dev',
      environment: 'development',
      name: 'Vouch Dev',
      keyName: 'vouch-dev-server',
      origins: undefined,
      browserScopes: undefined,
      allowDemo: false,
      emitSecret: true,
    });

    expect(output.command).toBe('rotate-key');
    expect(output.serverKey.apiKey).toMatch(/^chatsdk_/);
  });

  it('preserves existing origins and browser scopes on idempotent create reruns when flags are omitted', async () => {
    const db = makeDb([
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev',
          settings: {
            provisioning: {
              slug: 'vouch-dev',
              environment: 'development',
              origins: ['https://vouch.example'],
              browserScopes: ['chat:read', 'chat:write', 'typing:write'],
            },
          },
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:00:00Z',
        }],
      },
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev Renamed',
          settings: {
            provisioning: {
              slug: 'vouch-dev',
              environment: 'development',
              origins: ['https://vouch.example'],
              browserScopes: ['chat:read', 'chat:write', 'typing:write'],
            },
          },
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:01:00Z',
        }],
      },
      {
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          name: 'vouch-dev-server',
          api_key: 'chatsdk_existing_key',
          created_at: '2026-06-20T00:00:01Z',
          revoked_at: null,
          last_used_at: null,
        }],
      },
    ]);

    const output = await provisioning.provisionProject(db, {
      slug: 'vouch-dev',
      environment: 'development',
      name: 'Vouch Dev Renamed',
      keyName: 'vouch-dev-server',
      origins: undefined,
      browserScopes: undefined,
      allowDemo: false,
      emitSecret: false,
    });

    const updateCall = db.calls.find((call) => call.sql.includes('UPDATE app'));
    const updatedSettings = JSON.parse(updateCall.params[2]);
    expect(updatedSettings.provisioning.origins).toEqual(['https://vouch.example']);
    expect(updatedSettings.provisioning.browserScopes).toEqual(['chat:read', 'chat:write', 'typing:write']);
    expect(output.project.origins).toEqual(['https://vouch.example']);
    expect(output.project.browserScopes).toEqual(['chat:read', 'chat:write', 'typing:write']);
  });

  it('show returns only redacted active server keys', async () => {
    const db = makeDb([
      {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Vouch Dev',
          settings: {
            provisioning: {
              slug: 'vouch-dev',
              environment: 'development',
              origins: ['http://localhost:3000'],
              browserScopes: ['chat:read', 'chat:write'],
            },
          },
          created_at: '2026-06-20T00:00:00Z',
          updated_at: '2026-06-20T00:00:00Z',
        }],
      },
      {
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          name: 'vouch-dev-server',
          api_key_hash: 'a'.repeat(64),
          created_at: '2026-06-20T00:00:01Z',
          revoked_at: null,
          last_used_at: null,
        }],
      },
    ]);

    const output = await provisioning.showProject(db, {
      slug: 'vouch-dev',
      environment: 'development',
      name: 'vouch-dev',
      keyName: 'vouch-dev-server',
      origins: [],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
    });

    expect(output.serverKeys).toHaveLength(1);
    expect(output.serverKeys[0].redactedApiKey).toBeNull();
    expect(output.serverKeys[0].apiKeyFingerprint).toBe(`sha256:${'a'.repeat(12)}...${'a'.repeat(6)}`);
    expect(output.serverKeys[0]).not.toHaveProperty('apiKey');
  });

  it('validates broker scopes and rejects wildcard origins', () => {
    const errors = provisioning.validateBrokerInput({
      slug: 'seed-project-a-dev',
      environment: 'development',
      name: 'Seed Project A',
      keyName: 'seed-project-a-dev-server',
      origins: ['*'],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
      emitSecret: false,
      brokerClientSlug: 'seed-project-a-development',
      brokerClientName: 'Seed Project A Broker',
      kid: 'seed-project-a-development-rs256-1',
      externalTenantIds: ['tenant-a'],
      userIdPrefixes: ['seed-a-'],
      channelIdPrefixes: ['seed-a-'],
      defaultScopes: ['chat:read', 'not-a-scope'],
      allowedScopes: ['chat:read'],
      maxMembershipFanout: 100,
      maxTokenTtlSeconds: 900,
    });

    expect(errors).toEqual(expect.arrayContaining([
      'broker allowed origins must not include wildcard *',
      'default scopes contain unsupported values: not-a-scope',
      'default scopes must be included in allowed scopes: not-a-scope',
    ]));
  });

  it('provisions broker client, RS256 credential, and app scope with private JWK suppressed by default', async () => {
    const db = makeDb([
      { rows: [projectAppRow] },
      { rows: [] },
      {
        rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          slug: 'seed-project-a-development',
          name: 'Seed Project A Broker',
          status: 'active',
          metadata: {},
          created_at: '2026-06-20T00:00:01Z',
          updated_at: '2026-06-20T00:00:01Z',
        }],
      },
      { rows: [] },
      {
        rows: [{
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          client_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          kid: 'seed-project-a-development-rs256-1',
          auth_type: 'service_jwt_rs256',
          status: 'active',
          public_key_jwk: { kty: 'RSA' },
          created_at: '2026-06-20T00:00:02Z',
          updated_at: '2026-06-20T00:00:02Z',
        }],
      },
      { rows: [] },
      {
        rows: [{
          credential_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          app_id: projectAppRow.id,
          status: 'active',
          allowed_origins: ['https://a.example'],
          default_scopes: ['chat:read', 'chat:write'],
          allowed_scopes: ['chat:read', 'chat:write', 'typing:write'],
          max_token_ttl_seconds: 900,
        }],
      },
    ]);

    const output = await provisioning.provisionBrokerScope(db, {
      slug: 'seed-project-a-dev',
      environment: 'development',
      name: 'Seed Project A',
      keyName: 'seed-project-a-dev-server',
      origins: ['https://a.example'],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
      emitSecret: false,
      brokerClientSlug: 'seed-project-a-development',
      brokerClientName: 'Seed Project A Broker',
      kid: 'seed-project-a-development-rs256-1',
      externalTenantIds: ['tenant-a'],
      userIdPrefixes: ['seed-a-'],
      channelIdPrefixes: ['seed-a-'],
      defaultScopes: ['chat:read', 'chat:write'],
      allowedScopes: ['chat:read', 'chat:write', 'typing:write'],
      maxMembershipFanout: 100,
      maxTokenTtlSeconds: 900,
    });

    expect(output.command).toBe('provision-broker');
    expect(output.brokerClient.created).toBe(true);
    expect(output.brokerCredential.created).toBe(true);
    expect(output.brokerCredential).not.toHaveProperty('privateJwk');
    expect(output.brokerCredential.privateJwkRedacted).toBe('[suppressed]');
    expect(output.brokerScope.allowedOrigins).toEqual(['https://a.example']);
    expect(output.brokerScope.allowedUserIdPrefixes).toEqual(['seed-a-']);
    expect(db.calls.map((call) => call.sql)).toEqual(expect.arrayContaining([
      'BEGIN',
      expect.stringContaining('INSERT INTO broker_client'),
      expect.stringContaining('INSERT INTO broker_credential'),
      expect.stringContaining('INSERT INTO broker_app_scope'),
      'COMMIT',
    ]));
  });

  it('keeps seeded project broker scopes isolated by app id and prefixes', async () => {
    const appB = {
      ...projectAppRow,
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Seed Project B',
      settings: {
        provisioning: {
          slug: 'seed-project-b-dev',
          environment: 'development',
          origins: ['https://b.example'],
          browserScopes: ['chat:read', 'chat:write'],
        },
      },
    };
    const db = makeDb([
      { rows: [appB] },
      {
        rows: [{
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          slug: 'seed-project-b-development',
          name: 'Seed Project B Broker',
          status: 'active',
          metadata: {},
          created_at: '2026-06-20T00:00:01Z',
          updated_at: '2026-06-20T00:00:01Z',
        }],
      },
      {
        rows: [{
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          slug: 'seed-project-b-development',
          name: 'Seed Project B Broker',
          status: 'active',
          metadata: {},
          created_at: '2026-06-20T00:00:01Z',
          updated_at: '2026-06-20T00:00:02Z',
        }],
      },
      {
        rows: [{
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          client_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          kid: 'seed-project-b-development-rs256-1',
          auth_type: 'service_jwt_rs256',
          status: 'active',
          public_key_jwk: { kty: 'RSA' },
          created_at: '2026-06-20T00:00:02Z',
          updated_at: '2026-06-20T00:00:02Z',
        }],
      },
      {
        rows: [{
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          client_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          kid: 'seed-project-b-development-rs256-1',
          auth_type: 'service_jwt_rs256',
          status: 'active',
          public_key_jwk: { kty: 'RSA' },
          created_at: '2026-06-20T00:00:02Z',
          updated_at: '2026-06-20T00:00:03Z',
        }],
      },
      { rows: [] },
      {
        rows: [{
          credential_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          app_id: appB.id,
          status: 'active',
          allowed_origins: ['https://b.example'],
          default_scopes: ['chat:read', 'chat:write'],
          allowed_scopes: ['chat:read', 'chat:write'],
          max_token_ttl_seconds: 600,
        }],
      },
    ]);

    const output = await provisioning.provisionBrokerScope(db, {
      slug: 'seed-project-b-dev',
      environment: 'development',
      name: 'Seed Project B',
      keyName: 'seed-project-b-dev-server',
      origins: ['https://b.example'],
      browserScopes: ['chat:read', 'chat:write'],
      allowDemo: false,
      emitSecret: false,
      brokerClientSlug: 'seed-project-b-development',
      brokerClientName: 'Seed Project B Broker',
      kid: 'seed-project-b-development-rs256-1',
      externalTenantIds: ['tenant-b'],
      userIdPrefixes: ['seed-b-'],
      channelIdPrefixes: ['seed-b-'],
      defaultScopes: ['chat:read', 'chat:write'],
      allowedScopes: ['chat:read', 'chat:write'],
      maxMembershipFanout: 50,
      maxTokenTtlSeconds: 600,
    });

    expect(output.project.appId).toBe(appB.id);
    expect(output.brokerScope.allowedExternalTenantIds).toEqual(['tenant-b']);
    expect(output.brokerScope.allowedUserIdPrefixes).toEqual(['seed-b-']);
    expect(output.brokerScope.allowedChannelIdPrefixes).toEqual(['seed-b-']);
    const scopeCall = db.calls.find((call) => call.sql.includes('INSERT INTO broker_app_scope'));
    expect(scopeCall.params[1]).toBe(appB.id);
    expect(scopeCall.params[2]).toEqual(['tenant-b']);
    expect(scopeCall.params[3]).toEqual(['seed-b-']);
    expect(scopeCall.params[4]).toEqual(['seed-b-']);
  });

  it('refuses to reactivate suspended broker clients or disabled broker credentials', async () => {
    const suspendedClientDb = makeDb([
      {
        rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          slug: 'seed-project-a-development',
          name: 'Seed Project A Broker',
          status: 'suspended',
          metadata: {},
        }],
      },
    ]);
    await expect(provisioning.ensureBrokerClient(suspendedClientDb, {
      slug: 'seed-project-a-dev',
      environment: 'development',
      brokerClientSlug: 'seed-project-a-development',
      brokerClientName: 'Seed Project A Broker',
    })).rejects.toThrow('refusing to reactivate');

    const disabledCredentialDb = makeDb([
      {
        rows: [{
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          client_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          kid: 'seed-project-a-development-rs256-1',
          status: 'disabled',
        }],
      },
    ]);
    await expect(provisioning.ensureBrokerCredential(
      disabledCredentialDb,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      { kid: 'seed-project-a-development-rs256-1' }
    )).rejects.toThrow('refusing to reactivate');
  });

  it('preserves existing broker scope arrays when update flags are omitted', async () => {
    const db = makeDb([
      {
        rows: [{
          allowed_external_tenant_ids: ['tenant-a'],
          allowed_user_id_prefixes: ['seed-a-'],
          allowed_channel_id_prefixes: ['seed-a-'],
          max_membership_fanout: 25,
          allowed_origins: ['https://a.example'],
          max_token_ttl_seconds: 600,
          default_scopes: ['chat:read'],
          allowed_scopes: ['chat:read', 'chat:write'],
        }],
      },
      {
        rows: [{
          credential_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          app_id: projectAppRow.id,
          status: 'active',
          allowed_origins: ['https://a.example'],
          default_scopes: ['chat:read'],
          allowed_scopes: ['chat:read', 'chat:write'],
          max_token_ttl_seconds: 900,
        }],
      },
    ]);

    await provisioning.upsertBrokerAppScope(
      db,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      projectAppRow.id,
      {
        externalTenantIds: undefined,
        userIdPrefixes: undefined,
        channelIdPrefixes: undefined,
        maxMembershipFanout: undefined,
        origins: undefined,
        maxTokenTtlSeconds: 900,
        defaultScopes: undefined,
        allowedScopes: undefined,
      }
    );

    const upsertCall = db.calls.find((call) => call.sql.includes('INSERT INTO broker_app_scope'));
    expect(upsertCall.params[2]).toEqual(['tenant-a']);
    expect(upsertCall.params[3]).toEqual(['seed-a-']);
    expect(upsertCall.params[4]).toEqual(['seed-a-']);
    expect(upsertCall.params[6]).toEqual(['https://a.example']);
    expect(upsertCall.params[7]).toBe(900);
  });

  it('refuses to reactivate disabled broker app scopes', async () => {
    const db = makeDb([
      {
        rows: [{
          status: 'disabled',
          allowed_external_tenant_ids: ['tenant-a'],
          allowed_user_id_prefixes: ['seed-a-'],
          allowed_channel_id_prefixes: ['seed-a-'],
          max_membership_fanout: 25,
          allowed_origins: ['https://a.example'],
          max_token_ttl_seconds: 600,
          default_scopes: ['chat:read'],
          allowed_scopes: ['chat:read', 'chat:write'],
        }],
      },
    ]);

    await expect(provisioning.upsertBrokerAppScope(
      db,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      projectAppRow.id,
      {
        externalTenantIds: undefined,
        userIdPrefixes: undefined,
        channelIdPrefixes: undefined,
        maxMembershipFanout: undefined,
        origins: undefined,
        maxTokenTtlSeconds: undefined,
        defaultScopes: undefined,
        allowedScopes: undefined,
      }
    )).rejects.toThrow('refusing to reactivate');
  });
});
