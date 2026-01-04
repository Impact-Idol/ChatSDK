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

    // Upsert user
    await db.query(
      `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (app_id, id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, app_user.name),
         image_url = COALESCE(EXCLUDED.image_url, app_user.image_url),
         custom_data = COALESCE(EXCLUDED.custom_data, app_user.custom_data),
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
