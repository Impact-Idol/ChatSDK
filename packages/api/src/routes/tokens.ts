/**
 * Token Routes
 * JWT token generation for client authentication
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as jose from 'jose';
import { db } from '../services/database';

const JWT_SECRET = process.env.JWT_SECRET || 'chatsdk-dev-secret-key-change-in-production';
// Support both CENTRIFUGO_TOKEN_SECRET (documented) and CENTRIFUGO_SECRET (legacy) for backward compatibility
const CENTRIFUGO_SECRET = process.env.CENTRIFUGO_TOKEN_SECRET || process.env.CENTRIFUGO_SECRET || 'chatsdk-dev-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

export const tokenRoutes = new Hono();

const createTokenSchema = z.object({
  userId: z.string().min(1),
  name: z.string().optional(),
  image: z.string().url().optional(),
  custom: z.record(z.unknown()).optional(),
});

/**
 * Create user token
 * POST /tokens
 */
tokenRoutes.post(
  '/',
  zValidator('json', createTokenSchema),
  async (c) => {
    // Validate API key
    const apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      return c.json({ error: { message: 'Missing API key' } }, 401);
    }

    // Get app
    const appResult = await db.query(
      'SELECT id FROM app WHERE api_key = $1',
      [apiKey]
    );

    if (appResult.rows.length === 0) {
      return c.json({ error: { message: 'Invalid API key' } }, 401);
    }

    const appId = appResult.rows[0].id;
    const body = c.req.valid('json');

    // Upsert user - always update when values are provided (not just when non-null)
    // This ensures client-provided names/images always take precedence over existing data
    await db.query(
      `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (app_id, id) DO UPDATE SET
         name = CASE WHEN $3 IS NOT NULL THEN $3 ELSE app_user.name END,
         image_url = CASE WHEN $4 IS NOT NULL THEN $4 ELSE app_user.image_url END,
         custom_data = CASE WHEN $5::jsonb != '{}'::jsonb THEN $5 ELSE app_user.custom_data END,
         last_active_at = NOW(),
         updated_at = NOW()`,
      [appId, body.userId, body.name, body.image, body.custom ?? {}]
    );

    // Generate JWT token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new jose.SignJWT({
      user_id: body.userId,
      app_id: appId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(secret);

    // Generate Centrifugo token
    const centrifugoSecret = new TextEncoder().encode(CENTRIFUGO_SECRET);
    const wsToken = await new jose.SignJWT({
      sub: body.userId,
      app_id: appId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(centrifugoSecret);

    return c.json({
      token,
      wsToken,
      user: {
        id: body.userId,
        name: body.name,
        image: body.image,
      },
      expiresIn: 86400, // 24 hours in seconds
    });
  }
);

/**
 * Refresh token
 * POST /tokens/refresh
 */
tokenRoutes.post('/refresh', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { message: 'Missing token' } }, 401);
  }

  const oldToken = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(oldToken, secret, {
      // Allow expired tokens for refresh
      clockTolerance: 86400, // 24 hours grace period
    });

    // Generate new tokens
    const token = await new jose.SignJWT({
      user_id: payload.user_id,
      app_id: payload.app_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(secret);

    const centrifugoSecret = new TextEncoder().encode(CENTRIFUGO_SECRET);
    const wsToken = await new jose.SignJWT({
      sub: payload.user_id as string,
      app_id: payload.app_id as string,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(centrifugoSecret);

    return c.json({
      token,
      wsToken,
      expiresIn: 86400,
    });
  } catch (error) {
    return c.json({ error: { message: 'Invalid token' } }, 401);
  }
});

/**
 * Validate token
 * GET /tokens/validate
 *
 * Validates a JWT token and returns its payload if valid.
 * Useful for debugging token issues and checking if a token is still valid.
 */
tokenRoutes.get('/validate', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      valid: false,
      error: {
        message: 'Missing token',
        hint: 'Include Authorization: Bearer <token> header',
      },
    }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // Check if user exists
    const userResult = await db.query(
      'SELECT id, name, image_url FROM app_user WHERE app_id = $1 AND id = $2',
      [payload.app_id, payload.user_id]
    );

    const user = userResult.rows[0] || null;

    return c.json({
      valid: true,
      payload: {
        userId: payload.user_id,
        appId: payload.app_id,
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      },
      user: user ? {
        id: user.id,
        name: user.name,
        image: user.image_url,
      } : null,
    });
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return c.json({
        valid: false,
        error: {
          message: 'Token expired',
          hint: 'Call POST /api/tokens/refresh to get a new token',
        },
      }, 401);
    }

    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return c.json({
        valid: false,
        error: {
          message: 'Invalid token signature',
          hint: 'The token was signed with a different secret. Ensure JWT_SECRET is consistent.',
        },
      }, 401);
    }

    return c.json({
      valid: false,
      error: {
        message: 'Invalid token',
        hint: 'The token format is invalid or corrupted',
      },
    }, 401);
  }
});

/**
 * Validate WebSocket token
 * GET /tokens/validate-ws
 *
 * Validates a Centrifugo WebSocket token.
 */
tokenRoutes.get('/validate-ws', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      valid: false,
      error: {
        message: 'Missing token',
        hint: 'Include Authorization: Bearer <wsToken> header',
      },
    }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(CENTRIFUGO_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    return c.json({
      valid: true,
      payload: {
        userId: payload.sub,
        appId: payload.app_id,
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      },
    });
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return c.json({
        valid: false,
        error: {
          message: 'WebSocket token expired',
          hint: 'Call POST /api/tokens to get new tokens',
        },
      }, 401);
    }

    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return c.json({
        valid: false,
        error: {
          message: 'Invalid WebSocket token signature',
          hint: 'Ensure CENTRIFUGO_TOKEN_SECRET matches between API server and Centrifugo config',
        },
      }, 401);
    }

    return c.json({
      valid: false,
      error: {
        message: 'Invalid WebSocket token',
        hint: 'The token format is invalid or corrupted',
      },
    }, 401);
  }
});
