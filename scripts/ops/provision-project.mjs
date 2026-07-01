#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import * as jose from 'jose';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const KNOWN_DEMO_APP_IDS = new Set([
  '00000000-0000-0000-0000-000000000001',
]);

const KNOWN_DEMO_SLUGS = new Set([
  '001',
  'demo',
  'default',
  'test',
]);

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'prod', 'staging', 'stage']);
const VALID_BROKER_SCOPES = new Set([
  'chat:read',
  'chat:write',
  'reaction:write',
  'typing:write',
  'upload:write',
  'search:read',
]);

export function generateAppApiKey() {
  return `chatsdk_${randomBytes(20).toString('hex')}`;
}

export function hashAppApiKey(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function fingerprintApiKeyHash(apiKeyHash) {
  if (!apiKeyHash) {
    return null;
  }
  return `sha256:${String(apiKeyHash).slice(0, 12)}...${String(apiKeyHash).slice(-6)}`;
}

export function redactSecret(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 12) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBoolean(value) {
  if (value === true) return true;
  if (value === false || value === undefined) return false;
  return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

export function parseArgs(argv) {
  const [command = 'help', ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? rest[index + 1];

    if (value === undefined || value.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = value;
    if (inlineValue === undefined) index += 1;
  }

  return { command, options };
}

export function normalizeInput(options) {
  const slug = String(options.slug || '').trim();
  const environment = String(options.environment || 'development').trim().toLowerCase();
  const name = String(options.name || slug).trim();
  const keyName = String(options.serverKeyName || `${slug}-server`).trim();
  const originsProvided = Object.prototype.hasOwnProperty.call(options, 'origins');
  const browserScopesProvided = Object.prototype.hasOwnProperty.call(options, 'browserScopes');
  const origins = originsProvided ? parseCsv(String(options.origins || '')) : undefined;
  const browserScopes = browserScopesProvided
    ? parseCsv(String(options.browserScopes || ''))
    : undefined;

  return {
    slug,
    environment,
    name,
    keyName,
    origins,
    browserScopes,
    json: Boolean(options.json),
    allowDemo: parseBoolean(options.allowDemo),
    emitSecret: parseBoolean(options.emitSecret),
  };
}

export function normalizeBrokerInput(options) {
  const base = normalizeInput(options);
  const brokerClientSlug = String(options.brokerClientSlug || `${base.slug}-${base.environment}`).trim();
  const brokerClientName = String(options.brokerClientName || `${base.name} Broker`).trim();
  const kid = String(options.kid || `${brokerClientSlug}-rs256-1`).trim();
  const externalTenantIds = Object.prototype.hasOwnProperty.call(options, 'externalTenantIds')
    ? parseCsv(String(options.externalTenantIds || ''))
    : undefined;
  const userIdPrefixes = Object.prototype.hasOwnProperty.call(options, 'userIdPrefixes')
    ? parseCsv(String(options.userIdPrefixes || ''))
    : undefined;
  const channelIdPrefixes = Object.prototype.hasOwnProperty.call(options, 'channelIdPrefixes')
    ? parseCsv(String(options.channelIdPrefixes || ''))
    : undefined;
  const defaultScopes = Object.prototype.hasOwnProperty.call(options, 'defaultScopes')
    ? parseCsv(String(options.defaultScopes || ''))
    : undefined;
  const allowedScopes = Object.prototype.hasOwnProperty.call(options, 'allowedScopes')
    ? parseCsv(String(options.allowedScopes || ''))
    : undefined;
  const maxMembershipFanout = Object.prototype.hasOwnProperty.call(options, 'maxMembershipFanout')
    ? Number.parseInt(String(options.maxMembershipFanout || ''), 10)
    : undefined;
  const maxTokenTtlSeconds = Object.prototype.hasOwnProperty.call(options, 'maxTokenTtlSeconds')
    ? Number.parseInt(String(options.maxTokenTtlSeconds || ''), 10)
    : undefined;

  return {
    ...base,
    brokerClientSlug,
    brokerClientName,
    kid,
    externalTenantIds,
    userIdPrefixes,
    channelIdPrefixes,
    defaultScopes,
    allowedScopes,
    maxMembershipFanout,
    maxTokenTtlSeconds,
  };
}

export function validateProjectInput(input) {
  const errors = [];

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(input.slug)) {
    errors.push('slug must be 3-64 lowercase letters, numbers, or hyphens, and cannot start/end with a hyphen');
  }

  if (!input.name || input.name.length > 255) {
    errors.push('name is required and must be at most 255 characters');
  }

  if (!input.keyName || input.keyName.length > 255) {
    errors.push('server key name is required and must be at most 255 characters');
  }

  if (PRODUCTION_LIKE_ENVIRONMENTS.has(input.environment) && !input.allowDemo) {
    if (KNOWN_DEMO_SLUGS.has(input.slug)) {
      errors.push(`slug ${input.slug} is reserved for demo/development use`);
    }
  }

  if (input.browserScopes?.includes('channel:create') && PRODUCTION_LIKE_ENVIRONMENTS.has(input.environment)) {
    errors.push('channel:create must not be part of default browser scopes for production-like projects');
  }

  return errors;
}

export function validateBrokerInput(input) {
  const errors = validateProjectInput(input);

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(input.brokerClientSlug)) {
    errors.push('broker client slug must be 3-64 lowercase letters, numbers, or hyphens, and cannot start/end with a hyphen');
  }

  if (!input.brokerClientName || input.brokerClientName.length > 255) {
    errors.push('broker client name is required and must be at most 255 characters');
  }

  if (!input.kid || input.kid.length > 255) {
    errors.push('kid is required and must be at most 255 characters');
  }

  if (input.maxMembershipFanout !== undefined && (!Number.isInteger(input.maxMembershipFanout) || input.maxMembershipFanout <= 0)) {
    errors.push('max membership fanout must be a positive integer');
  }

  if (input.maxTokenTtlSeconds !== undefined && (!Number.isInteger(input.maxTokenTtlSeconds) || input.maxTokenTtlSeconds < 60 || input.maxTokenTtlSeconds > 3600)) {
    errors.push('max token ttl seconds must be between 60 and 3600');
  }

  const invalidAllowedScopes = (input.allowedScopes ?? []).filter((scope) => !VALID_BROKER_SCOPES.has(scope));
  if (invalidAllowedScopes.length > 0) {
    errors.push(`allowed scopes contain unsupported values: ${invalidAllowedScopes.join(', ')}`);
  }

  const invalidDefaultScopes = (input.defaultScopes ?? []).filter((scope) => !VALID_BROKER_SCOPES.has(scope));
  if (invalidDefaultScopes.length > 0) {
    errors.push(`default scopes contain unsupported values: ${invalidDefaultScopes.join(', ')}`);
  }

  const allowedSet = new Set(input.allowedScopes ?? []);
  const outOfAllowedDefaults = input.allowedScopes
    ? (input.defaultScopes ?? []).filter((scope) => !allowedSet.has(scope))
    : [];
  if (outOfAllowedDefaults.length > 0) {
    errors.push(`default scopes must be included in allowed scopes: ${outOfAllowedDefaults.join(', ')}`);
  }

  if (input.origins?.includes('*')) {
    errors.push('broker allowed origins must not include wildcard *');
  }

  for (const origin of input.origins ?? []) {
    try {
      const parsed = new URL(origin);
      if (origin !== parsed.origin) {
        errors.push(`broker origin must be an exact origin without path or trailing slash: ${origin}`);
      }
      if (origin.includes('*')) {
        errors.push(`broker origin must not include wildcards: ${origin}`);
      }
    } catch {
      errors.push(`broker origin must be a valid URL origin: ${origin}`);
    }
  }

  if ((input.defaultScopes ?? []).includes('channel:create') || (input.allowedScopes ?? []).includes('channel:create')) {
    errors.push('broker scopes must not include channel:create');
  }

  return errors;
}

export function buildAppSettings(input, existingSettings = {}) {
  const existingProvisioning = existingSettings.provisioning || {};
  return {
    ...existingSettings,
    provisioning: {
      ...existingProvisioning,
      slug: input.slug,
      environment: input.environment,
      origins: input.origins ?? existingProvisioning.origins ?? [],
      browserScopes: input.browserScopes ?? existingProvisioning.browserScopes ?? ['chat:read', 'chat:write'],
      managedBy: 'scripts/ops/provision-project.mjs',
    },
  };
}

export async function findProjectApp(db, input) {
  const result = await db.query(
    `SELECT id, name, settings, created_at, updated_at
     FROM app
     WHERE settings #>> '{provisioning,slug}' = $1
       AND settings #>> '{provisioning,environment}' = $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [input.slug, input.environment]
  );

  return result.rows[0] ?? null;
}

export async function ensureBrokerClient(db, input) {
  const existing = await db.query(
    `SELECT id, slug, name, status, metadata, created_at, updated_at
     FROM broker_client
     WHERE slug = $1
     LIMIT 1`,
    [input.brokerClientSlug]
  );

  if (existing.rows[0]) {
    if (existing.rows[0].status !== 'active') {
      throw new Error(`broker client ${input.brokerClientSlug} is ${existing.rows[0].status}; refusing to reactivate through provisioning`);
    }
    const metadata = {
      ...(existing.rows[0].metadata || {}),
      provisioning: {
        slug: input.slug,
        environment: input.environment,
        managedBy: 'scripts/ops/provision-project.mjs',
      },
    };
    const result = await db.query(
      `UPDATE broker_client
       SET name = $2, metadata = $3::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING id, slug, name, status, metadata, created_at, updated_at`,
      [existing.rows[0].id, input.brokerClientName, JSON.stringify(metadata)]
    );
    return { client: result.rows[0], created: false };
  }

  const result = await db.query(
    `INSERT INTO broker_client (slug, name, status, metadata)
     VALUES ($1, $2, 'active', $3::jsonb)
     RETURNING id, slug, name, status, metadata, created_at, updated_at`,
    [
      input.brokerClientSlug,
      input.brokerClientName,
      JSON.stringify({
        provisioning: {
          slug: input.slug,
          environment: input.environment,
          managedBy: 'scripts/ops/provision-project.mjs',
        },
      }),
    ]
  );
  return { client: result.rows[0], created: true };
}

export async function ensureBrokerCredential(db, clientId, input) {
  const existing = await db.query(
    `SELECT id, client_id, kid, auth_type, status, public_key_jwk, created_at, updated_at
     FROM broker_credential
     WHERE kid = $1
     LIMIT 1`,
    [input.kid]
  );

  if (existing.rows[0]) {
    if (existing.rows[0].client_id !== clientId) {
      throw new Error(`broker credential kid ${input.kid} already belongs to another broker client`);
    }
    if (!['active', 'rotating'].includes(existing.rows[0].status)) {
      throw new Error(`broker credential ${input.kid} is ${existing.rows[0].status}; refusing to reactivate through provisioning`);
    }
    const result = await db.query(
      `UPDATE broker_credential
       SET updated_at = NOW()
       WHERE id = $1
       RETURNING id, client_id, kid, auth_type, status, public_key_jwk, created_at, updated_at`,
      [existing.rows[0].id]
    );
    return { credential: result.rows[0], created: false, privateJwk: null };
  }

  const { publicJwk, privateJwk } = await generateBrokerJwks();
  const result = await db.query(
    `INSERT INTO broker_credential (client_id, kid, public_key_jwk, auth_type, status)
     VALUES ($1, $2, $3::jsonb, 'service_jwt_rs256', 'active')
     RETURNING id, client_id, kid, auth_type, status, public_key_jwk, created_at, updated_at`,
    [clientId, input.kid, JSON.stringify(publicJwk)]
  );
  return { credential: result.rows[0], created: true, privateJwk };
}

export async function generateBrokerJwks() {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
  const publicJwk = await jose.exportJWK(publicKey);
  const privateJwk = await jose.exportJWK(privateKey);
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  privateJwk.alg = 'RS256';
  privateJwk.use = 'sig';
  return { publicJwk, privateJwk };
}

export async function upsertBrokerAppScope(db, credentialId, appId, input) {
  const existing = await db.query(
    `SELECT status,
            allowed_external_tenant_ids,
            allowed_user_id_prefixes,
            allowed_channel_id_prefixes,
            max_membership_fanout,
            allowed_origins,
            max_token_ttl_seconds,
            default_scopes,
            allowed_scopes
     FROM broker_app_scope
     WHERE credential_id = $1 AND app_id = $2`,
    [credentialId, appId]
  );
  const existingScope = existing.rows[0] ?? {};
  if (existingScope.status && existingScope.status !== 'active') {
    throw new Error(`Broker app scope for app ${appId} is ${existingScope.status}; refusing to reactivate through provisioning`);
  }
  const effective = {
    externalTenantIds: input.externalTenantIds ?? existingScope.allowed_external_tenant_ids ?? [],
    userIdPrefixes: input.userIdPrefixes ?? existingScope.allowed_user_id_prefixes ?? [],
    channelIdPrefixes: input.channelIdPrefixes ?? existingScope.allowed_channel_id_prefixes ?? [],
    maxMembershipFanout: input.maxMembershipFanout ?? Number(existingScope.max_membership_fanout ?? 1000),
    origins: input.origins ?? existingScope.allowed_origins ?? [],
    maxTokenTtlSeconds: input.maxTokenTtlSeconds ?? Number(existingScope.max_token_ttl_seconds ?? 900),
    defaultScopes: input.defaultScopes ?? existingScope.default_scopes ?? ['chat:read', 'chat:write'],
    allowedScopes: input.allowedScopes ?? existingScope.allowed_scopes ?? ['chat:read', 'chat:write', 'reaction:write', 'typing:write', 'upload:write', 'search:read'],
  };
  validateEffectiveBrokerScope(effective);

  const result = await db.query(
    `INSERT INTO broker_app_scope (
       credential_id,
       app_id,
       status,
       allowed_external_tenant_ids,
       allowed_user_id_prefixes,
       allowed_channel_id_prefixes,
       max_membership_fanout,
       allowed_origins,
       max_token_ttl_seconds,
       default_scopes,
       allowed_scopes
     )
     VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (credential_id, app_id) DO UPDATE SET
       status = broker_app_scope.status,
       allowed_external_tenant_ids = EXCLUDED.allowed_external_tenant_ids,
       allowed_user_id_prefixes = EXCLUDED.allowed_user_id_prefixes,
       allowed_channel_id_prefixes = EXCLUDED.allowed_channel_id_prefixes,
       max_membership_fanout = EXCLUDED.max_membership_fanout,
       allowed_origins = EXCLUDED.allowed_origins,
       max_token_ttl_seconds = EXCLUDED.max_token_ttl_seconds,
       default_scopes = EXCLUDED.default_scopes,
       allowed_scopes = EXCLUDED.allowed_scopes,
       updated_at = NOW()
     RETURNING credential_id, app_id, status, allowed_origins, default_scopes, allowed_scopes, max_token_ttl_seconds`,
    [
      credentialId,
      appId,
      effective.externalTenantIds,
      effective.userIdPrefixes,
      effective.channelIdPrefixes,
      effective.maxMembershipFanout,
      effective.origins,
      effective.maxTokenTtlSeconds,
      effective.defaultScopes,
      effective.allowedScopes,
    ]
  );
  return {
    ...result.rows[0],
    _effective: effective,
  };
}

export function validateEffectiveBrokerScope(scope) {
  const errors = [];
  if (scope.externalTenantIds.length === 0) {
    errors.push('broker scope must include at least one external tenant id');
  }
  if (scope.userIdPrefixes.length === 0) {
    errors.push('broker scope must include at least one user id prefix');
  }
  if (scope.channelIdPrefixes.length === 0) {
    errors.push('broker scope must include at least one channel id prefix');
  }
  if (scope.origins.length === 0) {
    errors.push('broker scope must include at least one allowed origin');
  }
  const allowedSet = new Set(scope.allowedScopes);
  const invalidDefault = scope.defaultScopes.filter((scopeName) => !allowedSet.has(scopeName));
  if (invalidDefault.length > 0) {
    errors.push(`default scopes must be included in allowed scopes: ${invalidDefault.join(', ')}`);
  }
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}

export async function createProjectApp(db, input) {
  const settings = buildAppSettings(input);
  const result = await db.query(
    `INSERT INTO app (name, settings)
     VALUES ($1, $2::jsonb)
     RETURNING id, name, settings, created_at, updated_at`,
    [input.name, JSON.stringify(settings)]
  );

  return result.rows[0];
}

export async function ensureProjectApp(db, input) {
  const existing = await findProjectApp(db, input);
  if (existing) {
    const settings = buildAppSettings(input, existing.settings || {});
    const result = await db.query(
      `UPDATE app
       SET name = $2, settings = $3::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, settings, created_at, updated_at`,
      [existing.id, input.name, JSON.stringify(settings)]
    );
    return { app: result.rows[0], created: false };
  }

  const app = await createProjectApp(db, input);
  return { app, created: true };
}

export async function getActiveServerKeys(db, appId) {
  const result = await db.query(
    `SELECT id, name, api_key_hash, created_at, revoked_at, last_used_at
     FROM app_api_key
     WHERE app_id = $1
       AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [appId]
  );

  return result.rows;
}

export async function ensureServerKey(db, appId, keyName, createIfMissing = true) {
  const existingResult = await db.query(
    `SELECT id, name, api_key_hash, created_at, revoked_at, last_used_at
     FROM app_api_key
     WHERE app_id = $1
       AND name = $2
       AND revoked_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [appId, keyName]
  );

  if (existingResult.rows[0] || !createIfMissing) {
    return { key: existingResult.rows[0] ?? null, created: false, plaintext: null };
  }

  const apiKey = generateAppApiKey();
  const insertResult = await db.query(
    `INSERT INTO app_api_key (app_id, name, api_key_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, api_key_hash, created_at, revoked_at, last_used_at`,
    [appId, keyName, hashAppApiKey(apiKey)]
  );

  return { key: insertResult.rows[0], created: true, plaintext: apiKey };
}

export async function rotateServerKey(db, appId, keyName) {
  const revokeResult = await db.query(
    `UPDATE app_api_key
     SET revoked_at = NOW()
     WHERE app_id = $1
       AND name = $2
       AND revoked_at IS NULL
     RETURNING id`,
    [appId, keyName]
  );

  if (revokeResult.rows.length === 0) {
    throw new Error(`No active server key named ${keyName} exists for this project`);
  }

  const apiKey = generateAppApiKey();
  const result = await db.query(
    `INSERT INTO app_api_key (app_id, name, api_key_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, api_key_hash, created_at, revoked_at, last_used_at`,
    [appId, keyName, hashAppApiKey(apiKey)]
  );

  return { key: result.rows[0], plaintext: apiKey };
}

export async function lockProjectProvisioning(db, input) {
  await db.query(
    'SELECT pg_advisory_xact_lock(hashtext($1))',
    [`chatsdk:project-provisioning:${input.slug}:${input.environment}`]
  );
}

export async function runInTransaction(db, fn) {
  if (typeof db.transaction === 'function') {
    return db.transaction(fn);
  }

  await db.query('BEGIN', []);
  try {
    const result = await fn(db);
    await db.query('COMMIT', []);
    return result;
  } catch (error) {
    await db.query('ROLLBACK', []);
    throw error;
  }
}

export function formatProjectOutput({ command, input, app, appCreated, serverKey, serverKeyCreated, plaintext }) {
  const formattedServerKey = serverKey
    ? {
        id: serverKey.id,
        name: serverKey.name,
        created: serverKeyCreated,
        redactedApiKey: plaintext ? redactSecret(plaintext) : null,
        apiKeyFingerprint: fingerprintApiKeyHash(serverKey.api_key_hash),
        createdAt: serverKey.created_at,
        lastUsedAt: serverKey.last_used_at,
      }
    : null;

  if (formattedServerKey && input.emitSecret && plaintext) {
    formattedServerKey.apiKey = plaintext;
  }

  return {
    command,
    project: {
      slug: input.slug,
      environment: input.environment,
      name: app.name,
      appId: app.id,
      appCreated,
      origins: app.settings?.provisioning?.origins ?? input.origins ?? [],
      browserScopes: app.settings?.provisioning?.browserScopes ?? input.browserScopes ?? [],
    },
    serverKey: formattedServerKey,
    warnings: plaintext && input.emitSecret
      ? ['Store apiKey in the embedding project backend secret store. It will not be shown by show commands.']
      : plaintext
      ? ['A new server key was created, but plaintext output was suppressed. Rotate with --emit-secret when you are ready to store it.']
      : [],
  };
}

export function formatBrokerOutput({ input, app, brokerClient, brokerClientCreated, credential, credentialCreated, privateJwk, scope }) {
  const output = {
    command: 'provision-broker',
    project: {
      slug: input.slug,
      environment: input.environment,
      name: app.name,
      appId: app.id,
    },
    brokerClient: {
      id: brokerClient.id,
      slug: brokerClient.slug,
      name: brokerClient.name,
      created: brokerClientCreated,
      status: brokerClient.status,
    },
    brokerCredential: {
      id: credential.id,
      kid: credential.kid,
      authType: credential.auth_type,
      status: credential.status,
      created: credentialCreated,
      privateJwk: input.emitSecret && privateJwk ? privateJwk : undefined,
      privateJwkRedacted: privateJwk ? '[suppressed]' : undefined,
    },
    brokerScope: {
      appId: scope.app_id,
      status: scope.status,
      allowedOrigins: scope.allowed_origins,
      defaultScopes: scope.default_scopes,
      allowedScopes: scope.allowed_scopes,
      maxTokenTtlSeconds: Number(scope.max_token_ttl_seconds),
      maxMembershipFanout: scope._effective?.maxMembershipFanout ?? input.maxMembershipFanout,
      allowedExternalTenantIds: scope._effective?.externalTenantIds ?? input.externalTenantIds,
      allowedUserIdPrefixes: scope._effective?.userIdPrefixes ?? input.userIdPrefixes,
      allowedChannelIdPrefixes: scope._effective?.channelIdPrefixes ?? input.channelIdPrefixes,
    },
    warnings: privateJwk && input.emitSecret
      ? ['Store brokerCredential.privateJwk in the embedding project backend secret store. It will not be shown again.']
      : privateJwk
      ? ['A new broker credential was created, but private JWK output was suppressed. Rotate/provision a new kid with --emit-secret when ready to store it.']
      : [],
  };

  if (!output.brokerCredential.privateJwk) {
    delete output.brokerCredential.privateJwk;
  }
  if (!output.brokerCredential.privateJwkRedacted) {
    delete output.brokerCredential.privateJwkRedacted;
  }
  return output;
}

export async function provisionProject(db, input) {
  const errors = validateProjectInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return runInTransaction(db, async (tx) => {
    await lockProjectProvisioning(tx, input);
    const { app, created: appCreated } = await ensureProjectApp(tx, input);

    if (PRODUCTION_LIKE_ENVIRONMENTS.has(input.environment) && !input.allowDemo && KNOWN_DEMO_APP_IDS.has(app.id)) {
      throw new Error(`app id ${app.id} is reserved for demo/development use`);
    }

    const { key, created: serverKeyCreated, plaintext } = await ensureServerKey(tx, app.id, input.keyName);

    return formatProjectOutput({
      command: 'create',
      input,
      app,
      appCreated,
      serverKey: key,
      serverKeyCreated,
      plaintext,
    });
  });
}

export async function showProject(db, input) {
  const errors = validateProjectInput({ ...input, name: input.name || input.slug, keyName: input.keyName || `${input.slug}-server` });
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const app = await findProjectApp(db, input);
  if (!app) {
    throw new Error(`Project app not found for ${input.slug}/${input.environment}`);
  }

  const keys = await getActiveServerKeys(db, app.id);
  return {
    command: 'show',
    project: {
      slug: input.slug,
      environment: input.environment,
      name: app.name,
      appId: app.id,
      origins: app.settings?.provisioning?.origins || [],
      browserScopes: app.settings?.provisioning?.browserScopes || [],
      createdAt: app.created_at,
      updatedAt: app.updated_at,
    },
    serverKeys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      redactedApiKey: null,
      apiKeyFingerprint: fingerprintApiKeyHash(key.api_key_hash),
      createdAt: key.created_at,
      lastUsedAt: key.last_used_at,
    })),
  };
}

export async function rotateProjectKey(db, input) {
  const errors = validateProjectInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return runInTransaction(db, async (tx) => {
    await lockProjectProvisioning(tx, input);
    const app = await findProjectApp(tx, input);
    if (!app) {
      throw new Error(`Project app not found for ${input.slug}/${input.environment}`);
    }

    const { key, plaintext } = await rotateServerKey(tx, app.id, input.keyName);
    return formatProjectOutput({
      command: 'rotate-key',
      input,
      app,
      appCreated: false,
      serverKey: key,
      serverKeyCreated: true,
      plaintext,
    });
  });
}

export async function provisionBrokerScope(db, input) {
  const errors = validateBrokerInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return runInTransaction(db, async (tx) => {
    await lockProjectProvisioning(tx, input);
    const app = await findProjectApp(tx, input);
    if (!app) {
      throw new Error(`Project app not found for ${input.slug}/${input.environment}`);
    }
    if (PRODUCTION_LIKE_ENVIRONMENTS.has(input.environment) && !input.allowDemo && KNOWN_DEMO_APP_IDS.has(app.id)) {
      throw new Error(`app id ${app.id} is reserved for demo/development use`);
    }

    const { client: brokerClient, created: brokerClientCreated } = await ensureBrokerClient(tx, input);
    const { credential, created: credentialCreated, privateJwk } = await ensureBrokerCredential(tx, brokerClient.id, input);
    const scope = await upsertBrokerAppScope(tx, credential.id, app.id, input);

    return formatBrokerOutput({
      input,
      app,
      brokerClient,
      brokerClientCreated,
      credential,
      credentialCreated,
      privateJwk,
      scope,
    });
  });
}

function printHuman(output) {
  console.log(`command: ${output.command}`);
  console.log(`project: ${output.project.slug}/${output.project.environment}`);
  console.log(`app_id: ${output.project.appId}`);
  if (output.project.appCreated !== undefined) {
    console.log(`app_created: ${output.project.appCreated}`);
  }
  if (output.serverKey) {
    console.log(`server_key_id: ${output.serverKey.id}`);
    console.log(`server_key_name: ${output.serverKey.name}`);
    if (output.serverKey.redactedApiKey) {
      console.log(`server_key_redacted: ${output.serverKey.redactedApiKey}`);
    }
    if (output.serverKey.apiKeyFingerprint) {
      console.log(`server_key_fingerprint: ${output.serverKey.apiKeyFingerprint}`);
    }
    if (output.serverKey.apiKey) {
      console.log(`server_api_key: ${output.serverKey.apiKey}`);
    } else if (output.serverKey.created) {
      console.log('server_api_key: suppressed; rerun rotate-key with --emit-secret when ready to store a new key');
    }
  }
  if (output.brokerClient) {
    console.log(`broker_client_id: ${output.brokerClient.id}`);
    console.log(`broker_client_slug: ${output.brokerClient.slug}`);
  }
  if (output.brokerCredential) {
    console.log(`broker_credential_id: ${output.brokerCredential.id}`);
    console.log(`broker_credential_kid: ${output.brokerCredential.kid}`);
    if (output.brokerCredential.privateJwk) {
      console.log(`broker_private_jwk: ${JSON.stringify(output.brokerCredential.privateJwk)}`);
    } else if (output.brokerCredential.created) {
      console.log('broker_private_jwk: suppressed; provision a new kid with --emit-secret when ready to store a private key');
    }
  }
  if (output.brokerScope) {
    console.log(`broker_scope_app_id: ${output.brokerScope.appId}`);
    console.log(`broker_scope_origins: ${output.brokerScope.allowedOrigins.join(',')}`);
    console.log(`broker_scope_default_scopes: ${output.brokerScope.defaultScopes.join(',')}`);
    console.log(`broker_scope_allowed_scopes: ${output.brokerScope.allowedScopes.join(',')}`);
  }
  if (Array.isArray(output.serverKeys)) {
    for (const key of output.serverKeys) {
      console.log(`server_key: ${key.name} ${key.id} ${key.apiKeyFingerprint ?? key.redactedApiKey ?? 'unknown'}`);
    }
  }
  for (const warning of output.warnings || []) {
    console.error(`warning: ${warning}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/ops/provision-project.mjs create --slug vouch-dev --name "Vouch Dev" --environment development [--origins http://localhost:3000] [--browser-scopes chat:read,chat:write] [--server-key-name vouch-dev-server] [--emit-secret] [--json]
  node scripts/ops/provision-project.mjs show --slug vouch-dev --environment development [--json]
  node scripts/ops/provision-project.mjs rotate-key --slug vouch-dev --environment development [--server-key-name vouch-dev-server] [--emit-secret] [--json]
  node scripts/ops/provision-project.mjs provision-broker --slug vouch-dev --environment development --origins http://localhost:3000 --external-tenant-ids tenant-a --user-id-prefixes vouch: --channel-id-prefixes vouch: [--emit-secret] [--json]

Environment:
  DATABASE_URL or POSTGRES_URL is required.

Notes:
  create records --origins and --browser-scopes as project metadata.
  provision-broker writes origins/scopes into broker_app_scope for server mint enforcement.
`);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { command, options } = parseArgs(argv);
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return null;
  }

  const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL is required');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    let output;
    if (command === 'create') {
      const input = normalizeInput(options);
      output = await provisionProject(client, input);
    } else if (command === 'show') {
      const input = normalizeInput(options);
      output = await showProject(client, input);
    } else if (command === 'rotate-key') {
      const input = normalizeInput(options);
      output = await rotateProjectKey(client, input);
    } else if (command === 'provision-broker') {
      const input = normalizeBrokerInput(options);
      output = await provisionBrokerScope(client, input);
    } else {
      throw new Error(`Unknown command: ${command}`);
    }

    const outputJson = parseBoolean(options.json);
    if (outputJson) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      printHuman(output);
    }
    return output;
  } finally {
    await client.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`provision-project failed: ${error.message}`);
    process.exitCode = 1;
  });
}
