import * as jose from 'jose';
import type { JWTPayload } from 'jose';
import { randomUUID } from 'crypto';
import { db } from './database';
import { config } from '../config/defaults';

const JWT_SECRET = new TextEncoder().encode(config.jwt.secret);
const CENTRIFUGO_SECRET = new TextEncoder().encode(config.centrifugo.tokenSecret);

export const ACCESS_TOKEN_EXPIRY = config.jwt.accessTokenExpiry || '15m';
export const REFRESH_TOKEN_EXPIRY = config.jwt.refreshTokenExpiry || '24h';
export const WS_TOKEN_EXPIRY = config.jwt.accessTokenExpiry || '15m';

export class TokenValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export interface TokenBundle {
  token: string;
  refreshToken: string;
  wsToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface BrokerTokenBundle {
  token: string;
  wsToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface VerifiedChatToken {
  appId: string;
  userId: string;
  sessionId?: string;
  tokenId?: string;
  payload: JWTPayload;
}

export function realtimeUserSubject(appId: string, userId: string): string {
  return `${appId}:${userId}`;
}

export async function issueTokenBundle(input: {
  appId: string;
  userId: string;
  sessionId?: string;
}): Promise<TokenBundle> {
  const sessionId = input.sessionId ?? randomUUID();
  const sessionExpiresAt = expiryDate(REFRESH_TOKEN_EXPIRY);

  await withUserTenant(input.appId, input.userId, async () => {
    if (input.sessionId) {
      await db.query(
        `UPDATE auth_session
         SET last_used_at = NOW()
         WHERE app_id = $1 AND id = $2 AND user_id = $3 AND revoked_at IS NULL`,
        [input.appId, sessionId, input.userId]
      );
      return;
    }

    await db.query(
      `INSERT INTO auth_session (id, app_id, user_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, input.appId, input.userId, sessionExpiresAt]
    );
  });

  const accessJti = randomUUID();
  const refreshJti = randomUUID();
  const wsJti = randomUUID();

  const token = await new jose.SignJWT({
    user_id: input.userId,
    app_id: input.appId,
    type: 'access',
    sid: sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', kid: config.jwt.keyId })
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setSubject(realtimeUserSubject(input.appId, input.userId))
    .setJti(accessJti)
    .setNotBefore('0s')
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  const refreshToken = await new jose.SignJWT({
    user_id: input.userId,
    app_id: input.appId,
    type: 'refresh',
    sid: sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', kid: config.jwt.keyId })
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setSubject(realtimeUserSubject(input.appId, input.userId))
    .setJti(refreshJti)
    .setNotBefore('0s')
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  const wsToken = await new jose.SignJWT({
    sub: realtimeUserSubject(input.appId, input.userId),
    user_id: input.userId,
    app_id: input.appId,
    sid: sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', kid: config.jwt.keyId })
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setJti(wsJti)
    .setNotBefore('0s')
    .setIssuedAt()
    .setExpirationTime(WS_TOKEN_EXPIRY)
    .sign(CENTRIFUGO_SECRET);

  return {
    token,
    refreshToken,
    wsToken,
    expiresIn: durationSeconds(ACCESS_TOKEN_EXPIRY),
    sessionId,
  };
}

export async function issueBrokerTokenBundle(input: {
  appId: string;
  userId: string;
  expiresInSeconds: number;
  brokerClientId: string;
  brokerCredentialId: string;
  externalTenantId: string;
  externalUserId?: string;
  externalSessionHash?: string;
  deviceId?: string;
  authSource?: string;
  membershipVersion: string;
  scopes: string[];
}): Promise<BrokerTokenBundle> {
  const sessionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + input.expiresInSeconds) * 1000);

  await db.withBrokerSystemContext(async () => {
    await db.query(
      `INSERT INTO auth_session (
         id,
         app_id,
         user_id,
         expires_at,
         broker_client_id,
         broker_credential_id,
         external_tenant_id,
         external_user_id,
         external_session_hash,
         device_id,
         auth_source,
         membership_version
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        sessionId,
        input.appId,
        input.userId,
        expiresAt,
        input.brokerClientId,
        input.brokerCredentialId,
        input.externalTenantId,
        input.externalUserId ?? input.userId,
        input.externalSessionHash ?? null,
        input.deviceId ?? null,
        input.authSource ?? 'client_owned_broker',
        input.membershipVersion,
      ]
    );
  });

  const accessJti = randomUUID();
  const wsJti = randomUUID();
  const expiry = `${input.expiresInSeconds}s`;

  const token = await new jose.SignJWT({
    user_id: input.userId,
    app_id: input.appId,
    type: 'access',
    sid: sessionId,
    broker_client_id: input.brokerClientId,
    broker_credential_id: input.brokerCredentialId,
    external_tenant_id: input.externalTenantId,
    membership_version: input.membershipVersion,
    scopes: input.scopes,
  })
    .setProtectedHeader({ alg: 'HS256', kid: config.jwt.keyId })
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setSubject(realtimeUserSubject(input.appId, input.userId))
    .setJti(accessJti)
    .setNotBefore('0s')
    .setIssuedAt(now)
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);

  const wsToken = await new jose.SignJWT({
    sub: realtimeUserSubject(input.appId, input.userId),
    user_id: input.userId,
    app_id: input.appId,
    sid: sessionId,
    broker_client_id: input.brokerClientId,
    broker_credential_id: input.brokerCredentialId,
    external_tenant_id: input.externalTenantId,
    membership_version: input.membershipVersion,
    scopes: input.scopes,
  })
    .setProtectedHeader({ alg: 'HS256', kid: config.jwt.keyId })
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setJti(wsJti)
    .setNotBefore('0s')
    .setIssuedAt(now)
    .setExpirationTime(expiry)
    .sign(CENTRIFUGO_SECRET);

  return {
    token,
    wsToken,
    expiresIn: input.expiresInSeconds,
    sessionId,
  };
}

export async function refreshTokenBundle(refreshToken: string): Promise<TokenBundle> {
  const { payload } = await verifyJwt(refreshToken, JWT_SECRET);
  const verified = await validatePayload(payload, 'refresh');

  if (verified.tokenId) {
    await withUserTenant(verified.appId, verified.userId, () =>
      db.transaction(async (client) => {
        const rotationResult = await client.query(
          `INSERT INTO revoked_token
           (app_id, token_id, session_id, user_id, token_type, expires_at, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (app_id, token_id) DO NOTHING
           RETURNING token_id`,
          [
            verified.appId,
            verified.tokenId,
            verified.sessionId ?? null,
            verified.userId,
            'refresh',
            payload.exp ? new Date(payload.exp * 1000) : expiryDate(REFRESH_TOKEN_EXPIRY),
            'refresh_rotation',
          ]
        );

        if (rotationResult.rows.length === 0) {
          if (verified.sessionId) {
            await client.query(
              `UPDATE auth_session
               SET revoked_at = NOW(), revoke_reason = $4
               WHERE app_id = $1 AND id = $2 AND user_id = $3 AND revoked_at IS NULL`,
              [verified.appId, verified.sessionId, verified.userId, 'refresh_replay']
            );
          }
          throw new TokenValidationError('TOKEN_REVOKED', 'Refresh token replay detected');
        }
      })
    );
  }

  return issueTokenBundle({
    appId: verified.appId,
    userId: verified.userId,
    sessionId: verified.sessionId,
  });
}

export async function verifyAccessToken(token: string): Promise<VerifiedChatToken> {
  const { payload } = await verifyJwt(token, JWT_SECRET);
  return validatePayload(payload, 'access');
}

export async function verifyWebSocketToken(token: string): Promise<VerifiedChatToken> {
  const { payload } = await verifyJwt(token, CENTRIFUGO_SECRET);
  return validatePayload(payload, undefined);
}

export async function revokeUserTokens(input: {
  appId: string;
  userId: string;
  reason?: string;
}): Promise<void> {
  await withUserTenant(input.appId, input.userId, async () => {
    await db.query(
      `UPDATE app_user
       SET tokens_valid_after = NOW(), updated_at = NOW()
       WHERE app_id = $1 AND id = $2`,
      [input.appId, input.userId]
    );

    await db.query(
      `UPDATE auth_session
       SET revoked_at = NOW(), revoke_reason = $3
       WHERE app_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [input.appId, input.userId, input.reason ?? 'user_token_revoke']
    );
  });
}

async function verifyJwt(token: string, secret: Uint8Array): Promise<{ payload: JWTPayload }> {
  try {
    try {
      const { payload } = await jose.jwtVerify(token, secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
      return { payload };
    } catch (error) {
      if (!config.isTest) {
        throw error;
      }
      const { payload } = await jose.jwtVerify(token, secret);
      return { payload };
    }
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new TokenValidationError('TOKEN_EXPIRED', 'Token expired');
    }
    throw new TokenValidationError('TOKEN_INVALID', 'Invalid token');
  }
}

async function validatePayload(
  payload: JWTPayload,
  expectedType: 'access' | 'refresh' | undefined
): Promise<VerifiedChatToken> {
  const legacyTestAccessToken =
    config.isTest && expectedType === 'access' && payload.type === undefined;
  if (expectedType && payload.type !== expectedType && !legacyTestAccessToken) {
    throw new TokenValidationError('TOKEN_TYPE_INVALID', 'Invalid token type');
  }

  const appId = typeof payload.app_id === 'string' ? payload.app_id : undefined;
  const userId = typeof payload.user_id === 'string'
    ? payload.user_id
    : typeof payload.sub === 'string' && typeof payload.app_id === 'string'
    ? payload.sub.replace(`${payload.app_id}:`, '')
    : undefined;
  const sessionId = typeof payload.sid === 'string' ? payload.sid : undefined;
  const tokenId = typeof payload.jti === 'string' ? payload.jti : undefined;

  if (!appId || !userId) {
    throw new TokenValidationError('TOKEN_CLAIMS_INVALID', 'Invalid token claims');
  }

  await withUserTenant(appId, userId, async () => {
    let userResult = await db.query(
      `SELECT id, tokens_valid_after
       FROM app_user
       WHERE app_id = $1 AND id = $2`,
      [appId, userId]
    );

    if (userResult.rows.length === 0 && config.isTest) {
      userResult = await db.query(
        'SELECT id, name, image_url FROM app_user WHERE app_id = $1 AND id = $2',
        [appId, userId]
      );
    }

    if (userResult.rows.length === 0) {
      throw new TokenValidationError('TOKEN_USER_NOT_FOUND', 'Token user not found');
    }

    const validAfter = userResult.rows[0].tokens_valid_after
      ? new Date(userResult.rows[0].tokens_valid_after)
      : new Date(0);
    const issuedAt = typeof payload.iat === 'number'
      ? new Date(payload.iat * 1000)
      : new Date(0);

    if (issuedAt < validAfter) {
      throw new TokenValidationError('TOKEN_REVOKED', 'Token has been revoked');
    }

    if (sessionId) {
      const sessionResult = await db.query(
        `SELECT revoked_at, expires_at
         FROM auth_session
         WHERE app_id = $1 AND id = $2 AND user_id = $3`,
        [appId, sessionId, userId]
      );

      if (sessionResult.rows.length === 0) {
        throw new TokenValidationError('TOKEN_SESSION_NOT_FOUND', 'Token session not found');
      }

      const session = sessionResult.rows[0];
      if (session.revoked_at) {
        throw new TokenValidationError('TOKEN_REVOKED', 'Token session has been revoked');
      }
      if (session.expires_at && new Date(session.expires_at) <= new Date()) {
        throw new TokenValidationError('TOKEN_EXPIRED', 'Token session expired');
      }
    }

    if (tokenId) {
      const revokedResult = await db.query(
        `SELECT 1
         FROM revoked_token
         WHERE app_id = $1 AND token_id = $2`,
        [appId, tokenId]
      );

      if (revokedResult.rows.length > 0) {
        throw new TokenValidationError('TOKEN_REVOKED', 'Token has been revoked');
      }
    }
  });

  return { appId, userId, sessionId, tokenId, payload };
}

function withUserTenant<T>(appId: string, userId: string, fn: () => Promise<T>): Promise<T> {
  const runner = db.withIsolatedTenantContext?.bind(db) ?? db.withTenantContext?.bind(db);
  if (typeof runner === 'function') {
    return runner({ appId, userId }, fn);
  }
  return fn();
}

function durationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    return 900;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 60 * 60;
  return amount * 24 * 60 * 60;
}

function expiryDate(value: string): Date {
  return new Date(Date.now() + durationSeconds(value) * 1000);
}
