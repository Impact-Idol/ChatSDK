/**
 * Auth Routes - ChatSDK 2.0 Single Token Authentication
 *
 * Simplified authentication endpoint that generates both REST and WebSocket tokens
 * in a single API call, reducing integration complexity from dual-token to single-token.
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
} from '../services/tokens';
import {
  applyRateLimits,
  getClientIp,
  RATE_LIMIT_POLICIES,
  rateLimitPublic,
} from '../services/rate-limit';

export const authRoutes = new Hono();

const connectSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  displayName: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Single Token Authentication Endpoint
 * POST /api/auth/connect
 *
 * ChatSDK 2.0 simplified authentication flow:
 * 1. Developer provides API key in header
 * 2. Provides user info in body (userId, displayName, avatar, metadata)
 * 3. We create/update user + generate both tokens internally
 * 4. Return single access token + refresh token + internal wsToken
 *
 * This reduces integration from:
 *   Before: fetchToken() → extract token + wsToken → client.connectUser(user, {token, wsToken})
 *   After:  ChatSDK.connect({apiKey, userId, displayName})
 */
authRoutes.post(
  '/connect',
  rateLimitPublic(RATE_LIMIT_POLICIES.tokenConnectIp),
	  zValidator('json', connectSchema),
	  async (c) => {
	    const body = c.req.valid('json');
	    const apiKey = c.req.header('X-API-Key');

	    if (!config.auth.allowApiKeyTokenBroker) {
	      return c.json({
	        error: {
	          code: 'TOKEN_BROKER_DISABLED',
	          message: 'API-key user token broker is disabled',
	        },
	      }, 404);
	    }

	    // 1. Validate API key
    if (!apiKey) {
      return c.json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'Missing API key',
          suggestion: 'Include X-API-Key header with your ChatSDK API key',
          docsUrl: 'https://docs.chatsdk.dev/authentication#api-key',
        },
      }, 401);
    }

    // 2. Get app from API key
    const appResult = await db.query(
      'SELECT id, name FROM app WHERE api_key = $1',
      [apiKey]
    );

    if (appResult.rows.length === 0) {
      return c.json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          suggestion: 'Check that your API key is correct. You can find it in the ChatSDK dashboard.',
          docsUrl: 'https://docs.chatsdk.dev/authentication#api-key',
        },
      }, 401);
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

    // 3. Build metadata with email
    const metadata = body.metadata ?? {};
    if (body.email) {
      metadata.email = body.email;
    }

    // 4. Create or update user
    try {
      await withTenantContext(appId, body.userId, () => db.query(
        `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (app_id, id) DO UPDATE SET
           name = COALESCE($3, app_user.name),
           image_url = COALESCE($4, app_user.image_url),
           custom_data = app_user.custom_data || COALESCE($5, '{}'::jsonb),
           last_active_at = NOW(),
         updated_at = NOW()
         RETURNING id, name, image_url, custom_data`,
        [appId, body.userId, body.displayName, body.avatar, JSON.stringify(metadata)]
      ));
    } catch (error) {
      console.error('[Auth] Failed to create/update user:', error);
      return c.json({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create user',
          suggestion: 'This is a server error. Please try again or contact support.',
        },
      }, 500);
    }

	    const tokens = await issueTokenBundle({ appId, userId: body.userId });

    // 8. Return response
    // The SDK will use accessToken for API calls, refreshToken for renewal,
    // and wsToken (in _internal) for WebSocket connections
    return c.json({
      user: {
        id: body.userId,
        displayName: body.displayName || body.userId,
        avatar: body.avatar || null,
        metadata: metadata,
      },
	      token: tokens.token,
	      refreshToken: tokens.refreshToken,
	      expiresIn: tokens.expiresIn,
	      _internal: {
	        wsToken: tokens.wsToken,
	      },
	    });
	  }
);

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 *
 * Exchanges refresh token for new access token + refresh token
 */
authRoutes.post('/refresh', rateLimitPublic(RATE_LIMIT_POLICIES.tokenRefresh), async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      error: {
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Missing refresh token',
        suggestion: 'Include Authorization: Bearer <refresh_token> header',
      },
    }, 401);
  }

  const oldRefreshToken = authHeader.slice(7);

  try {
	    const tokens = await refreshTokenBundle(oldRefreshToken);

	    return c.json({
	      token: tokens.token,
	      refreshToken: tokens.refreshToken,
	      expiresIn: tokens.expiresIn,
	      _internal: {
	        wsToken: tokens.wsToken,
	      },
	    });
	  } catch (error) {
	    if (error instanceof TokenValidationError && error.code === 'TOKEN_EXPIRED') {
	      return c.json({
	        error: {
	          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token expired',
          suggestion: 'Please log in again using ChatSDK.connect()',
        },
      }, 401);
    }

	    return c.json({
	      error: {
	        code: 'INVALID_REFRESH_TOKEN',
	        message: error instanceof TokenValidationError ? error.message : 'Invalid refresh token',
	        suggestion: 'The refresh token is invalid or corrupted. Please log in again.',
	      },
	    }, 401);
  }
});

/**
 * Development Mode - Connect Without API Key
 * POST /api/auth/connect-dev
 *
 * ONLY ENABLED IN EXPLICIT DEVELOPMENT MODE
 * Allows developers to test without API keys
 */
if (config.isDevelopment && process.env.ALLOW_DEV_AUTH === 'true') {
  authRoutes.post(
    '/connect-dev',
    rateLimitPublic(RATE_LIMIT_POLICIES.tokenConnectIp),
    zValidator('json', connectSchema),
    async (c) => {
      console.warn('[Auth] Using development mode authentication (no API key required)');
      const body = c.req.valid('json');
      const devLimit = await applyRateLimits(c, [
        {
          policy: RATE_LIMIT_POLICIES.tokenConnectIp,
          scope: { appId: 'dev', userId: body.userId, ip: getClientIp(c) },
        },
        {
          policy: RATE_LIMIT_POLICIES.appWrites,
          scope: { appId: 'dev', global: true },
        },
      ]);
      if (devLimit) return devLimit;

      // Use default dev app or create one
      let appResult = await db.query(
        "SELECT id FROM app WHERE api_key = 'dev-api-key'"
      );

      let appId: string;
      if (appResult.rows.length === 0) {
        // Create dev app
        const createResult = await db.query(
          `INSERT INTO app (name, api_key, settings)
           VALUES ('Development App', 'dev-api-key', '{}')
           RETURNING id`
        );
        appId = createResult.rows[0].id;
      } else {
        appId = appResult.rows[0].id;
      }

      const metadata = body.metadata ?? {};
      if (body.email) {
        metadata.email = body.email;
      }

      // Create/update user
      await withTenantContext(appId, body.userId, () => db.query(
        `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (app_id, id) DO UPDATE SET
           name = COALESCE($3, app_user.name),
           image_url = COALESCE($4, app_user.image_url),
           custom_data = app_user.custom_data || COALESCE($5, '{}'::jsonb),
           last_active_at = NOW(),
           updated_at = NOW()`,
        [appId, body.userId, body.displayName, body.avatar, JSON.stringify(metadata)]
      ));

	      const tokens = await issueTokenBundle({ appId, userId: body.userId });

      return c.json({
        user: {
          id: body.userId,
          displayName: body.displayName || body.userId,
          avatar: body.avatar || null,
          metadata: metadata,
        },
	        token: tokens.token,
	        refreshToken: tokens.refreshToken,
	        expiresIn: tokens.expiresIn,
	        _internal: {
	          wsToken: tokens.wsToken,
	        },
        _dev: {
          warning: 'Development mode - API key not required',
          apiKey: 'dev-api-key',
        },
      });
    }
  );
}

function withTenantContext<T>(appId: string, userId: string, fn: () => Promise<T>): Promise<T> {
  const runner = db.withTenantContext?.bind(db);
  if (typeof runner === 'function') {
    return runner({ appId, userId }, fn);
  }
  return fn();
}
