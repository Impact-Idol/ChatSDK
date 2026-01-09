/**
 * Auth Routes - ChatSDK 2.0 Single Token Authentication
 *
 * Simplified authentication endpoint that generates both REST and WebSocket tokens
 * in a single API call, reducing integration complexity from dual-token to single-token.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as jose from 'jose';
import { db } from '../services/database';

const JWT_SECRET = process.env.JWT_SECRET || 'chatsdk-dev-secret-key-change-in-production';
const CENTRIFUGO_SECRET = process.env.CENTRIFUGO_TOKEN_SECRET || process.env.CENTRIFUGO_SECRET || 'chatsdk-dev-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

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
  zValidator('json', connectSchema),
  async (c) => {
    // 1. Validate API key
    const apiKey = c.req.header('X-API-Key');
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
    const body = c.req.valid('json');

    // 3. Build metadata with email
    const metadata = body.metadata ?? {};
    if (body.email) {
      metadata.email = body.email;
    }

    // 4. Create or update user
    try {
      await db.query(
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
      );
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

    // 5. Generate JWT access token (for REST API calls)
    const secret = new TextEncoder().encode(JWT_SECRET);
    const accessToken = await new jose.SignJWT({
      user_id: body.userId,
      app_id: appId,
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m') // Short-lived access token (15 minutes)
      .sign(secret);

    // 6. Generate refresh token (24 hours)
    const refreshToken = await new jose.SignJWT({
      user_id: body.userId,
      app_id: appId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY) // 24 hours
      .sign(secret);

    // 7. Generate Centrifugo WebSocket token (24 hours)
    const centrifugoSecret = new TextEncoder().encode(CENTRIFUGO_SECRET);
    const wsToken = await new jose.SignJWT({
      sub: body.userId,
      app_id: appId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(centrifugoSecret);

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
      token: accessToken, // 15-minute access token
      refreshToken: refreshToken, // 24-hour refresh token
      expiresIn: 900, // 15 minutes in seconds
      _internal: {
        wsToken: wsToken, // WebSocket token (SDK uses internally)
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
authRoutes.post('/refresh', async (c) => {
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
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(oldRefreshToken, secret);

    // Verify it's a refresh token
    if (payload.type !== 'refresh') {
      return c.json({
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type',
          suggestion: 'This endpoint requires a refresh token, not an access token',
        },
      }, 401);
    }

    // Generate new access token
    const accessToken = await new jose.SignJWT({
      user_id: payload.user_id,
      app_id: payload.app_id,
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    // Generate new refresh token
    const refreshToken = await new jose.SignJWT({
      user_id: payload.user_id,
      app_id: payload.app_id,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(secret);

    return c.json({
      token: accessToken,
      refreshToken: refreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
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
        message: 'Invalid refresh token',
        suggestion: 'The refresh token is invalid or corrupted. Please log in again.',
      },
    }, 401);
  }
});

/**
 * Development Mode - Connect Without API Key
 * POST /api/auth/connect-dev
 *
 * ONLY ENABLED IN DEVELOPMENT (when NODE_ENV !== 'production')
 * Allows developers to test without API keys
 */
if (process.env.NODE_ENV !== 'production') {
  authRoutes.post(
    '/connect-dev',
    zValidator('json', connectSchema),
    async (c) => {
      console.warn('[Auth] Using development mode authentication (no API key required)');

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

      const body = c.req.valid('json');

      const metadata = body.metadata ?? {};
      if (body.email) {
        metadata.email = body.email;
      }

      // Create/update user
      await db.query(
        `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (app_id, id) DO UPDATE SET
           name = COALESCE($3, app_user.name),
           image_url = COALESCE($4, app_user.image_url),
           custom_data = app_user.custom_data || COALESCE($5, '{}'::jsonb),
           last_active_at = NOW(),
           updated_at = NOW()`,
        [appId, body.userId, body.displayName, body.avatar, JSON.stringify(metadata)]
      );

      // Generate tokens
      const secret = new TextEncoder().encode(JWT_SECRET);
      const accessToken = await new jose.SignJWT({
        user_id: body.userId,
        app_id: appId,
        type: 'access',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Longer in dev mode
        .sign(secret);

      const refreshToken = await new jose.SignJWT({
        user_id: body.userId,
        app_id: appId,
        type: 'refresh',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // 7 days in dev mode
        .sign(secret);

      const centrifugoSecret = new TextEncoder().encode(CENTRIFUGO_SECRET);
      const wsToken = await new jose.SignJWT({
        sub: body.userId,
        app_id: appId,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(centrifugoSecret);

      return c.json({
        user: {
          id: body.userId,
          displayName: body.displayName || body.userId,
          avatar: body.avatar || null,
          metadata: metadata,
        },
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: 86400, // 24 hours
        _internal: {
          wsToken: wsToken,
        },
        _dev: {
          warning: 'Development mode - API key not required',
          apiKey: 'dev-api-key',
        },
      });
    }
  );
}
