import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as jose from 'jose';
import { requireScope, requireUser } from '../middleware/auth';
import {
  getChannelAccess,
  isAppAdmin,
  isWorkspaceMember,
} from '../services/authorization';
import { config } from '../config/defaults';
import { realtimeUserSubject } from '../services/tokens';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';

const CENTRIFUGO_SECRET = config.centrifugo.tokenSecret;

const subscriptionTokenSchema = z.object({
  channel: z.string().min(1).max(255),
});

export const realtimeRoutes = new Hono();

realtimeRoutes.post(
  '/subscription-token',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.realtimeSubscription),
  zValidator('json', subscriptionTokenSchema),
  async (c) => {
    const auth = c.get('auth');
    const { channel } = c.req.valid('json');

    await authorizeRealtimeChannel(auth.appId, auth.userId!, channel);

    const secret = new TextEncoder().encode(CENTRIFUGO_SECRET);
	    const token = await new jose.SignJWT({
	      sub: realtimeUserSubject(auth.appId, auth.userId!),
	      user_id: auth.userId!,
	      channel,
	      app_id: auth.appId,
	    })
	      .setProtectedHeader({ alg: 'HS256', kid: config.jwt.keyId })
	      .setIssuer(config.jwt.issuer)
	      .setAudience(config.jwt.audience)
	      .setNotBefore('0s')
	      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    return c.json({
      token,
      expiresIn: 900,
    });
  }
);

async function authorizeRealtimeChannel(
  appId: string,
  userId: string,
  channel: string
): Promise<void> {
  const parts = channel.split(':');
  if (parts.length < 2) {
    throw new HTTPException(400, { message: 'Invalid realtime channel' });
  }

  const [namespace, channelAppId, resourceId] = parts;
  if (channelAppId !== appId) {
    throw new HTTPException(403, { message: 'Realtime channel belongs to another app' });
  }

  if (namespace === 'user') {
    if (parts.length !== 3 || resourceId !== userId) {
      throw new HTTPException(403, { message: 'Cannot subscribe to another user channel' });
    }
    return;
  }

  if (namespace === 'chat') {
    if (parts.length !== 3 || !resourceId) {
      throw new HTTPException(400, { message: 'Invalid chat channel' });
    }

    const access = await getChannelAccess(appId, userId, resourceId);
    if (!access.exists) {
      throw new HTTPException(404, { message: 'Channel not found' });
    }
    if (!access.isMember && !access.isPublic) {
      throw new HTTPException(403, { message: 'Not a member of this channel' });
    }
    return;
  }

  if (namespace === 'workspace') {
    if (parts.length !== 3 || !resourceId) {
      throw new HTTPException(400, { message: 'Invalid workspace channel' });
    }

    if (!(await isWorkspaceMember(appId, userId, resourceId))) {
      throw new HTTPException(403, { message: 'Not a member of this workspace' });
    }
    return;
  }

  if (namespace === 'app') {
    if (parts.length !== 2) {
      throw new HTTPException(400, { message: 'Invalid app channel' });
    }

    if (!(await isAppAdmin(appId, userId))) {
      throw new HTTPException(403, { message: 'App realtime channel requires admin access' });
    }
    return;
  }

  throw new HTTPException(403, { message: 'Realtime channel namespace is not allowed' });
}
