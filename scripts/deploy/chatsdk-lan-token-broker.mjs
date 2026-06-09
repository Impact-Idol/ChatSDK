import http from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import * as jose from 'jose';

const { Pool } = pg;

const port = Number(process.env.TOKEN_BROKER_PORT || 5511);
const databaseUrl = requireEnv('DATABASE_URL');
const jwtSecret = new TextEncoder().encode(requireEnv('JWT_SECRET'));
const centrifugoSecret = new TextEncoder().encode(requireEnv('CENTRIFUGO_TOKEN_SECRET'));
const jwtKeyId = requireEnv('JWT_KEY_ID');
const jwtIssuer = process.env.JWT_ISSUER || 'chatsdk-api';
const jwtAudience = process.env.JWT_AUDIENCE || 'chatsdk-users';
const accessTokenExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const refreshTokenExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY || '24h';
const brokerAppId = process.env.CHATSDK_BROKER_APP_ID || '';
const allowedOrigins = parseList(
  process.env.TOKEN_BROKER_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || ''
);
const allowedUsers = new Set(parseList(process.env.TOKEN_BROKER_USER_ALLOWLIST || ''));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.TOKEN_BROKER_DB_POOL_MAX || 4),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

const ipHits = new Map();

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  applyCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(isOriginAllowed(origin) ? 204 : 403);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url !== '/api/chatsdk-token' || req.method !== 'POST') {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  if (!isOriginAllowed(origin)) {
    sendJson(res, 403, { error: 'origin_not_allowed' });
    return;
  }

  if (!consumeRateLimit(req.socket.remoteAddress || 'unknown')) {
    sendJson(res, 429, { error: 'rate_limited' });
    return;
  }

  try {
    const body = await readJson(req);
    const userId = normalizeId(body.userId);
    const displayName = normalizeOptionalString(body.displayName || body.name) || userId;

    if (!userId) {
      sendJson(res, 400, { error: 'userId_required' });
      return;
    }

    if (allowedUsers.size > 0 && !allowedUsers.has(userId)) {
      sendJson(res, 403, { error: 'user_not_allowed' });
      return;
    }

    const appId = brokerAppId || await getDefaultAppId();
    const sessionId = randomUUID();
    const sessionExpiresAt = expiryDate(refreshTokenExpiry);
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {};
    if (typeof body.email === 'string' && body.email) {
      metadata.email = body.email;
    }

    await pool.query('BEGIN');
    try {
      await pool.query(
        `SELECT
           set_config('app.current_app_id', $1, true),
           set_config('app.current_user_id', $2, true),
           set_config('app.system_context', 'false', true)`,
        [appId, userId]
      );
      await pool.query(
        `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
         ON CONFLICT (app_id, id) DO UPDATE SET
           name = COALESCE($3, app_user.name),
           image_url = COALESCE($4, app_user.image_url),
           custom_data = app_user.custom_data || COALESCE($5::jsonb, '{}'::jsonb),
           last_active_at = NOW(),
           updated_at = NOW()`,
        [appId, userId, displayName, normalizeOptionalString(body.avatar), JSON.stringify(metadata)]
      );
      await pool.query(
        `INSERT INTO auth_session (id, app_id, user_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, appId, userId, sessionExpiresAt]
      );
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    const tokens = await issueTokenBundle({ appId, userId, sessionId });
    sendJson(res, 200, {
      user: { id: userId, displayName, avatar: body.avatar || null, metadata },
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      wsToken: tokens.wsToken,
      expiresIn: tokens.expiresIn,
      _internal: { wsToken: tokens.wsToken },
    });
  } catch (error) {
    console.error('[token-broker] mint failed', error);
    sendJson(res, 500, { error: 'token_mint_failed' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`hardened LAN token broker ready on :${port}`);
});

async function getDefaultAppId() {
  const result = await pool.query('SELECT id FROM app ORDER BY created_at LIMIT 1');
  if (!result.rows[0]?.id) {
    throw new Error('No ChatSDK app exists for token broker');
  }
  return result.rows[0].id;
}

async function issueTokenBundle({ appId, userId, sessionId }) {
  const subject = `${appId}:${userId}`;
  const sharedClaims = { user_id: userId, app_id: appId, sid: sessionId };
  const token = await sign(jwtSecret, { ...sharedClaims, type: 'access' }, subject, accessTokenExpiry);
  const refreshToken = await sign(jwtSecret, { ...sharedClaims, type: 'refresh' }, subject, refreshTokenExpiry);
  const wsToken = await sign(centrifugoSecret, { ...sharedClaims, sub: subject }, subject, accessTokenExpiry);

  return {
    token,
    refreshToken,
    wsToken,
    expiresIn: durationSeconds(accessTokenExpiry),
  };
}

function sign(secret, claims, subject, expiresIn) {
  return new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', kid: jwtKeyId })
    .setIssuer(jwtIssuer)
    .setAudience(jwtAudience)
    .setSubject(subject)
    .setJti(randomUUID())
    .setNotBefore('0s')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 32_768) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function applyCors(res, origin) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (isOriginAllowed(origin) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
}

function isOriginAllowed(origin) {
  return !origin || allowedOrigins.includes(origin);
}

function consumeRateLimit(key) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = Number(process.env.TOKEN_BROKER_RATE_LIMIT_PER_MINUTE || 60);
  const hits = (ipHits.get(key) || []).filter((ts) => now - ts < windowMs);
  if (hits.length >= max) {
    ipHits.set(key, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(key, hits);
  return true;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function normalizeId(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^[A-Za-z0-9._:@-]{1,255}$/.test(trimmed) ? trimmed : '';
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseList(value) {
  return value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
}

function expiryDate(duration) {
  return new Date(Date.now() + durationSeconds(duration) * 1000);
}

function durationSeconds(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  return value * ({ s: 1, m: 60, h: 3600, d: 86400 }[unit] || 1);
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}
