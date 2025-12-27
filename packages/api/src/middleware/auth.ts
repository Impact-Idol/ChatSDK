/**
 * Auth Middleware
 * JWT validation and API key authentication
 */

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import { db } from '../services/database';

const JWT_SECRET = process.env.JWT_SECRET || 'chatsdk-dev-secret-key-change-in-production';

export interface AuthContext {
  appId: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/**
 * Auth middleware - validates API key and optional JWT token
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  // Check for API key in header
  const apiKey = c.req.header('X-API-Key');

  // Debug logging
  console.log('[Auth] Request to:', c.req.path, 'X-API-Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

  if (!apiKey) {
    throw new HTTPException(401, { message: 'Missing API key' });
  }

  // Validate API key and get app
  const appResult = await db.query(
    'SELECT id, name, settings FROM app WHERE api_key = $1',
    [apiKey]
  );

  if (appResult.rows.length === 0) {
    console.log('[Auth] API key not found in database:', apiKey.substring(0, 20) + '...');
    throw new HTTPException(401, { message: 'Invalid API key' });
  }

  const app = appResult.rows[0];
  const auth: AuthContext = {
    appId: app.id,
  };

  // Check for Bearer token
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      if (payload.app_id !== app.id) {
        throw new HTTPException(401, { message: 'Token app mismatch' });
      }

      auth.userId = payload.user_id as string;

      // Get user info
      const userResult = await db.query(
        'SELECT id, name, image_url FROM app_user WHERE app_id = $1 AND id = $2',
        [app.id, auth.userId]
      );

      if (userResult.rows.length > 0) {
        auth.user = {
          id: userResult.rows[0].id,
          name: userResult.rows[0].name,
          image: userResult.rows[0].image_url,
        };
      }
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw new HTTPException(401, { message: 'Token expired' });
      }
      throw new HTTPException(401, { message: 'Invalid token' });
    }
  }

  c.set('auth', auth);
  await next();
});

/**
 * Require user authentication (not just API key)
 */
export const requireUser = createMiddleware(async (c, next) => {
  const auth = c.get('auth');

  if (!auth?.userId) {
    throw new HTTPException(401, { message: 'User authentication required' });
  }

  await next();
});
