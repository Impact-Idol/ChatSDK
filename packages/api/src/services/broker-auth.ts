import * as jose from 'jose';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { JWK } from 'jose';
import type { QueryResultRow } from 'pg';
import { isIP } from 'net';
import { db } from './database';
import { config } from '../config/defaults';

const BROKER_REPLAY_CLEANUP_INTERVAL_MS = 60_000;
let lastBrokerReplayCleanupAt = 0;

export interface BrokerAuthContext {
  clientId: string;
  clientSlug: string;
  credentialId: string;
  credentialKid: string;
  appId: string;
  allowedExternalTenantIds: string[];
  allowedUserIdPrefixes: string[];
  allowedChannelIdPrefixes: string[];
  maxMembershipFanout: number;
  allowedOrigins: string[];
  maxTokenTtlSeconds: number;
  defaultScopes: string[];
  allowedScopes: string[];
  tokenJti: string;
}

interface BrokerCredentialRow extends QueryResultRow {
  client_id: string;
  client_slug: string;
  credential_id: string;
  kid: string;
  public_key_jwk: JWK;
}

interface BrokerScopeRow extends QueryResultRow {
  allowed_external_tenant_ids: string[];
  allowed_user_id_prefixes: string[];
  allowed_channel_id_prefixes: string[];
  max_membership_fanout: number;
  allowed_origins: string[];
  max_token_ttl_seconds: number;
  default_scopes: string[];
  allowed_scopes: string[];
}

export class BrokerAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 401,
    public readonly audited = false
  ) {
    super(message);
    this.name = 'BrokerAuthError';
  }
}

export async function authenticateBrokerRequest(
  c: Context,
  appId: string
): Promise<BrokerAuthContext> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    await writeBrokerAudit(c, {
      appId,
      status: 'denied',
      denialReason: 'missing_service_jwt',
    });
    throw new BrokerAuthError('BROKER_AUTH_MISSING', 'Missing broker service token', 401, true);
  }

  const token = authHeader.slice(7);
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(token);
  } catch (error) {
    await writeBrokerAudit(c, {
      appId,
      status: 'denied',
      denialReason: 'invalid_jwt_format',
    });
    throw new BrokerAuthError('BROKER_AUTH_INVALID', 'Invalid broker service token format', 401, true);
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    await writeBrokerAudit(c, {
      appId,
      credentialKid: typeof header.kid === 'string' ? header.kid : undefined,
      status: 'denied',
      denialReason: 'unsupported_broker_jwt_header',
    });
    throw new BrokerAuthError('BROKER_AUTH_INVALID', 'Unsupported broker service token', 401, true);
  }

  const credential = await db.withBrokerSystemContext(async () => {
    const credentialResult = await db.query<BrokerCredentialRow>(
      `SELECT
         bc.id AS client_id,
         bc.slug AS client_slug,
         bcred.id AS credential_id,
         bcred.kid,
         bcred.public_key_jwk
       FROM broker_credential bcred
       JOIN broker_client bc ON bc.id = bcred.client_id
       WHERE bcred.kid = $1
         AND bcred.auth_type = 'service_jwt_rs256'
         AND bcred.status IN ('active', 'rotating')
         AND bc.status = 'active'
         AND (bcred.not_before IS NULL OR bcred.not_before <= NOW())
         AND (bcred.expires_at IS NULL OR bcred.expires_at > NOW())`,
      [header.kid]
    );

    return credentialResult.rows[0] ?? null;
  });

  if (!credential) {
    await writeBrokerAudit(c, {
      appId,
      credentialKid: header.kid,
      status: 'denied',
      denialReason: 'unknown_or_inactive_broker_credential',
    });
    throw new BrokerAuthError('BROKER_AUTH_INVALID', 'Unknown or inactive broker credential', 401, true);
  }

  let payload: jose.JWTPayload;
  try {
    const publicKey = await jose.importJWK(credential.public_key_jwk, 'RS256');
    const verified = await jose.jwtVerify(token, publicKey, {
      audience: config.auth.serverMintAudience,
      issuer: credential.client_slug,
      clockTolerance: '5 seconds',
    });
    payload = verified.payload;
  } catch {
    await writeBrokerAudit(c, {
      appId,
      clientId: credential.client_id,
      credentialId: credential.credential_id,
      clientSlug: credential.client_slug,
      credentialKid: credential.kid,
      status: 'denied',
      denialReason: 'invalid_broker_service_jwt',
    });
    throw new BrokerAuthError('BROKER_AUTH_INVALID', 'Invalid broker service token', 401, true);
  }

  const jti = typeof payload.jti === 'string' ? payload.jti : '';
  if (jti.length < 16 || jti.length > 255) {
    await writeBrokerAudit(c, {
      appId,
      clientId: credential.client_id,
      credentialId: credential.credential_id,
      clientSlug: credential.client_slug,
      credentialKid: credential.kid,
      status: 'denied',
      denialReason: 'invalid_broker_jti',
    });
    throw new BrokerAuthError('BROKER_AUTH_INVALID', 'Invalid broker service token ID', 401, true);
  }

  const issuedAt = typeof payload.iat === 'number' ? payload.iat : 0;
  const expiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1000);
  const clockSkewSeconds = 5;
  if (
    !issuedAt
    || !expiresAt
    || issuedAt > now + clockSkewSeconds
    || expiresAt > now + config.auth.serverMintJwtMaxLifetimeSeconds + clockSkewSeconds
    || expiresAt - issuedAt > config.auth.serverMintJwtMaxLifetimeSeconds
  ) {
    await writeBrokerAudit(c, {
      appId,
      clientId: credential.client_id,
      credentialId: credential.credential_id,
      clientSlug: credential.client_slug,
      credentialKid: credential.kid,
      tokenJti: jti,
      status: 'denied',
      denialReason: 'broker_jwt_lifetime_too_long',
    });
    throw new BrokerAuthError('BROKER_AUTH_INVALID', 'Broker service token lifetime is too long', 401, true);
  }

  triggerReplayCleanupAsynchronously();

  const replayResult = await db.withBrokerSystemContext(async () => {
    return db.query(
      `INSERT INTO broker_jwt_replay
         (credential_id, audience, environment, jti, expires_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5))
       ON CONFLICT (credential_id, jti) DO NOTHING
       RETURNING jti`,
      [
        credential.credential_id,
        config.auth.serverMintAudience,
        config.env || 'unknown',
        jti,
        expiresAt,
      ]
    );
  });
  if (replayResult.rows.length === 0) {
    await writeBrokerAudit(c, {
      appId,
      clientId: credential.client_id,
      credentialId: credential.credential_id,
      clientSlug: credential.client_slug,
      credentialKid: credential.kid,
      tokenJti: jti,
      status: 'denied',
      denialReason: 'broker_jwt_replay',
    });
    throw new BrokerAuthError('BROKER_AUTH_REPLAY', 'Broker service token replay detected', 401, true);
  }

  const scope = await db.withBrokerSystemContext(async () => {
    const scopeResult = await db.query<BrokerScopeRow>(
      `SELECT
         allowed_external_tenant_ids,
         allowed_user_id_prefixes,
         allowed_channel_id_prefixes,
         max_membership_fanout,
         allowed_origins,
         max_token_ttl_seconds,
         default_scopes,
         allowed_scopes
       FROM broker_app_scope
       WHERE credential_id = $1
         AND app_id = $2
         AND status = 'active'`,
      [credential.credential_id, appId]
    );
    return scopeResult.rows[0] ?? null;
  });

  if (!scope) {
    await writeBrokerAudit(c, {
      appId,
      clientId: credential.client_id,
      credentialId: credential.credential_id,
      clientSlug: credential.client_slug,
      credentialKid: credential.kid,
      tokenJti: jti,
      status: 'denied',
      denialReason: 'broker_scope_denied',
    });
    throw new BrokerAuthError('BROKER_SCOPE_DENIED', 'Broker credential is not scoped to this app', 403, true);
  }

  const origin = c.req.header('Origin');
  if (
    origin
    && (scope.allowed_origins ?? []).length > 0
    && !scope.allowed_origins.includes(origin)
  ) {
    await writeBrokerAudit(c, {
      appId,
      clientId: credential.client_id,
      credentialId: credential.credential_id,
      clientSlug: credential.client_slug,
      credentialKid: credential.kid,
      tokenJti: jti,
      status: 'denied',
      denialReason: 'broker_origin_denied',
    });
    throw new BrokerAuthError('BROKER_ORIGIN_DENIED', 'Broker credential is not allowed from this origin', 403, true);
  }

  return {
    clientId: credential.client_id,
    clientSlug: credential.client_slug,
    credentialId: credential.credential_id,
    credentialKid: credential.kid,
    appId,
    allowedExternalTenantIds: scope.allowed_external_tenant_ids ?? [],
    allowedUserIdPrefixes: scope.allowed_user_id_prefixes ?? [],
    allowedChannelIdPrefixes: scope.allowed_channel_id_prefixes ?? [],
    maxMembershipFanout: Number(scope.max_membership_fanout ?? 1000),
    allowedOrigins: scope.allowed_origins ?? [],
    maxTokenTtlSeconds: Number(scope.max_token_ttl_seconds ?? 900),
    defaultScopes: scope.default_scopes ?? [],
    allowedScopes: scope.allowed_scopes ?? [],
    tokenJti: jti,
  };
}

export async function writeBrokerAudit(
  c: Context,
  input: {
    clientId?: string;
    credentialId?: string;
    clientSlug?: string;
    credentialKid?: string;
    appId?: string;
    userId?: string;
    externalTenantId?: string;
    requestedScopes?: string[];
    grantedScopes?: string[];
    tokenJti?: string;
    sessionId?: string;
    status: 'success' | 'denied' | 'error';
    denialReason?: string;
  }
): Promise<void> {
  await db.withBrokerSystemContext(async () => {
    const verifiedAppId = await getExistingAppId(input.appId);
    await db.query(
      `INSERT INTO broker_mint_audit
         (
           client_id,
           credential_id,
           app_id,
           requested_app_id,
           client_slug,
           credential_kid,
           user_id,
           external_tenant_id,
           requested_scopes,
           granted_scopes,
           token_jti,
           session_id,
           status,
           denial_reason,
           request_id,
           external_request_id,
           trace_id,
           caller_ip,
           user_agent
         )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::inet, $19)`,
      [
        input.clientId ?? null,
        input.credentialId ?? null,
        verifiedAppId,
        truncate(input.appId, 255),
        truncate(input.clientSlug, 64),
        truncate(input.credentialKid, 255),
        truncate(input.userId, 255),
        truncate(input.externalTenantId, 255),
        input.requestedScopes?.slice(0, 50) ?? null,
        input.grantedScopes?.slice(0, 50) ?? null,
        truncate(input.tokenJti, 255),
        input.sessionId ?? null,
        input.status,
        truncate(input.denialReason, 1024),
        truncate(c.get('requestId'), 255),
        truncate(c.req.header('X-Request-ID'), 255),
        truncate(c.req.header('traceparent'), 255),
        getAuditCallerIp(c),
        truncate(c.req.header('User-Agent'), 512),
      ]
    );
  });
}

function getAuditCallerIp(c: Context): string | null {
  const directIp = getDirectRemoteAddress(c);
  const candidate = config.rateLimit.trustProxyHeaders
    ? c.req.header('CF-Connecting-IP')
      || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
      || c.req.header('X-Real-IP')
      || directIp
    : directIp;
  if (!candidate || isIP(candidate) === 0) {
    return null;
  }
  return candidate;
}

function getDirectRemoteAddress(c: Context): string | undefined {
  const env = c.env as Record<string, any> | undefined;
  return env?.incoming?.socket?.remoteAddress
    || env?.request?.socket?.remoteAddress
    || env?.remoteAddress;
}

async function getExistingAppId(appId?: string): Promise<string | null> {
  if (!appId) {
    return null;
  }
  const result = await db.query<{ id: string }>(
    `SELECT id FROM app WHERE id = $1`,
    [appId]
  );
  return result.rows[0]?.id ?? null;
}

function triggerReplayCleanupAsynchronously(): void {
  const now = Date.now();
  if (now - lastBrokerReplayCleanupAt < BROKER_REPLAY_CLEANUP_INTERVAL_MS) {
    return;
  }
  lastBrokerReplayCleanupAt = now;

  db.withBrokerSystemContext(async () => {
    await db.query(
      `DELETE FROM broker_jwt_replay
       WHERE expires_at < NOW() - INTERVAL '5 seconds'`
    );
  }).catch(() => {
    // Ignored background error
  });
}

export function assertBrokerScopeAllowsMembership(
  broker: BrokerAuthContext,
  input: {
    externalTenantId: string;
    userId: string;
    channelIds: string[];
  }
): void {
  if (
    broker.allowedExternalTenantIds.length > 0
    && !broker.allowedExternalTenantIds.includes(input.externalTenantId)
  ) {
    throw new BrokerAuthError('BROKER_TENANT_DENIED', 'Broker credential is not allowed for this external tenant', 403);
  }
  if (
    broker.allowedUserIdPrefixes.length > 0
    && !broker.allowedUserIdPrefixes.some(prefix => input.userId.startsWith(prefix))
  ) {
    throw new BrokerAuthError('BROKER_USER_DENIED', 'Broker credential is not allowed for this user', 403);
  }
  if (input.channelIds.length > broker.maxMembershipFanout) {
    throw new BrokerAuthError('BROKER_MEMBERSHIP_FANOUT_EXCEEDED', 'Membership snapshot exceeds broker fanout limit', 400);
  }
  if (
    broker.allowedChannelIdPrefixes.length > 0
    && input.channelIds.some(channelId => !broker.allowedChannelIdPrefixes.some(prefix => channelId.startsWith(prefix)))
  ) {
    throw new BrokerAuthError('BROKER_CHANNEL_DENIED', 'Broker credential is not allowed for one or more channels', 403);
  }
}

export function toBrokerHttpException(error: unknown): HTTPException {
  if (error instanceof BrokerAuthError) {
    return new HTTPException(error.status as 400 | 401 | 403 | 409 | 500, {
      message: error.message,
    });
  }
  return new HTTPException(500, { message: 'Broker request failed' });
}

function truncate(value: string | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
