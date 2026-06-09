/**
 * Token Routes
 * JWT token generation for client authentication
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { config } from '../config/defaults';
import {
  issueTokenBundle,
  refreshTokenBundle,
  TokenValidationError,
  verifyAccessToken,
  verifyWebSocketToken,
} from '../services/tokens';
import {
  applyRateLimits,
  getClientIp,
  RATE_LIMIT_POLICIES,
  rateLimitPublic,
} from '../services/rate-limit';

export const tokenRoutes = new Hono();

const createTokenSchema = z.object({
  userId: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
  custom: z.record(z.unknown()).optional(),
});

/**
 * Create user token
 * POST /tokens
 */
tokenRoutes.post(
  '/',
  rateLimitPublic(RATE_LIMIT_POLICIES.tokenConnectIp),
	  zValidator('json', createTokenSchema),
	  async (c) => {
	    const body = c.req.valid('json');
	    const apiKey = c.req.header('X-API-Key');

	    if (!config.auth.allowLegacyTokenEndpoint) {
	      return c.json({ error: { message: 'Legacy token endpoint is disabled' } }, 404);
	    }

    // Validate API key
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
    const appLimit = await applyRateLimits(c, [
      {
        policy: RATE_LIMIT_POLICIES.tokenConnectUser,
        scope: { appId, userId: body.userId, ip: getClientIp(c), key: apiKey },
      },
      {
        policy: RATE_LIMIT_POLICIES.appWrites,
        scope: { appId, global: true },
      },
    ]);
    if (appLimit) return appLimit;

    // Build custom_data with email if provided
    const customData = body.custom ?? {};
    if (body.email) {
      customData.email = body.email;
    }

    // Upsert user - always update when values are provided (not just when non-null)
    // This ensures client-provided names/images always take precedence over existing data
    await withTenantContext(appId, body.userId, () => db.query(
      `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (app_id, id) DO UPDATE SET
         name = CASE WHEN $3 IS NOT NULL THEN $3 ELSE app_user.name END,
         image_url = CASE WHEN $4 IS NOT NULL THEN $4 ELSE app_user.image_url END,
         custom_data = app_user.custom_data || $5::jsonb,
         last_active_at = NOW(),
         updated_at = NOW()`,
      [appId, body.userId, body.name, body.image, customData]
    ));

	    const tokens = await issueTokenBundle({ appId, userId: body.userId });

		    return c.json({
		      token: tokens.token,
		      refreshToken: tokens.refreshToken,
		      wsToken: tokens.wsToken,
		      user: {
	        id: body.userId,
        name: body.name,
        email: body.email,
        image: body.image,
      },
	      expiresIn: tokens.expiresIn,
	    });
	  }
);

/**
 * Refresh token
 * POST /tokens/refresh
 */
tokenRoutes.post('/refresh', rateLimitPublic(RATE_LIMIT_POLICIES.tokenRefresh), async (c) => {
	  const authHeader = c.req.header('Authorization');

	  if (!config.auth.allowLegacyTokenEndpoint) {
	    return c.json({ error: { message: 'Legacy token endpoint is disabled' } }, 404);
	  }

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { message: 'Missing token' } }, 401);
  }

  const oldToken = authHeader.slice(7);

		  try {
		    const tokens = await refreshTokenBundle(oldToken);

		    return c.json({
		      token: tokens.token,
		      refreshToken: tokens.refreshToken,
		      wsToken: tokens.wsToken,
		      expiresIn: tokens.expiresIn,
		    });
	  } catch (error) {
	    return c.json({
	      error: {
	        message: error instanceof TokenValidationError ? error.message : 'Invalid token',
	      },
	    }, 401);
	  }
	});

/**
 * Validate token
 * GET /tokens/validate
 *
 * Validates a JWT token and returns its payload if valid.
 * Useful for debugging token issues and checking if a token is still valid.
 */
tokenRoutes.get('/validate', rateLimitPublic(RATE_LIMIT_POLICIES.tokenValidate), async (c) => {
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
	    const { payload, appId, userId } = await verifyAccessToken(token);

	    // Check if user exists
	    const userResult = await withTenantContext(appId, userId, () => db.query(
      'SELECT id, name, image_url FROM app_user WHERE app_id = $1 AND id = $2',
      [appId, userId]
    ));

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
	    if (error instanceof TokenValidationError && error.code === 'TOKEN_EXPIRED') {
	      return c.json({
        valid: false,
        error: {
          message: 'Token expired',
          hint: 'Call POST /tokens/refresh to get a new token',
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

function withTenantContext<T>(appId: string, userId: string, fn: () => Promise<T>): Promise<T> {
  const runner = db.withTenantContext?.bind(db);
  if (typeof runner === 'function') {
    return runner({ appId, userId }, fn);
  }
  return fn();
}

/**
 * Validate WebSocket token
 * GET /tokens/validate-ws
 *
 * Validates a Centrifugo WebSocket token.
 */
tokenRoutes.get('/validate-ws', rateLimitPublic(RATE_LIMIT_POLICIES.tokenValidate), async (c) => {
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
	    const { payload } = await verifyWebSocketToken(token);

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
	    if (error instanceof TokenValidationError && error.code === 'TOKEN_EXPIRED') {
	      return c.json({
        valid: false,
        error: {
          message: 'WebSocket token expired',
          hint: 'Call POST /tokens to get new tokens',
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
