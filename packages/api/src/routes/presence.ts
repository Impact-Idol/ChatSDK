/**
 * Presence Routes
 * User online/offline status management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireScope, requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { centrifugo, getCentrifugo } from '../services/centrifugo';
import { isChannelMember } from '../services/authorization';

export const presenceRoutes = new Hono();

/**
 * Update user presence (heartbeat)
 * POST /api/presence/heartbeat
 */
presenceRoutes.post('/heartbeat', requireUser, requireScope('typing:write'), async (c) => {
  const auth = c.get('auth');

  // Update last_active_at
  await db.query(
    `UPDATE app_user SET last_active_at = NOW() WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  return c.json({ success: true });
});

/**
 * Set user online
 * POST /api/presence/online
 */
presenceRoutes.post('/online', requireUser, requireScope('typing:write'), async (c) => {
  const auth = c.get('auth');

  // Update user status
  await db.query(
    `UPDATE app_user
     SET last_active_at = NOW(),
         custom_data = custom_data || '{"online": true}'::jsonb
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  // Broadcast presence to all channels user is member of
  const memberships = await db.query(
    `SELECT channel_id FROM channel_member WHERE app_id = $1 AND user_id = $2`,
    [auth.appId, auth.userId]
  );

  for (const row of memberships.rows) {
    try {
      await centrifugo.publishPresence(auth.appId, auth.userId!, true);
    } catch (error) {
      console.warn('Failed to publish ephemeral presence event:', error);
    }
  }

  return c.json({ success: true });
});

/**
 * Set user offline
 * POST /api/presence/offline
 */
presenceRoutes.post('/offline', requireUser, requireScope('typing:write'), async (c) => {
  const auth = c.get('auth');

  // Update user status
  await db.query(
    `UPDATE app_user
     SET last_active_at = NOW(),
         custom_data = custom_data || '{"online": false}'::jsonb
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  // Broadcast presence to all channels user is member of
  const memberships = await db.query(
    `SELECT channel_id FROM channel_member WHERE app_id = $1 AND user_id = $2`,
    [auth.appId, auth.userId]
  );

  const lastSeen = new Date().toISOString();
  for (const row of memberships.rows) {
    try {
      await centrifugo.publishPresence(auth.appId, auth.userId!, false, lastSeen);
    } catch (error) {
      console.warn('Failed to publish ephemeral presence event:', error);
    }
  }

  return c.json({ success: true });
});

/**
 * Get presence for multiple users
 * POST /api/presence/query
 */
const queryPresenceSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
});

presenceRoutes.post(
  '/query',
  requireUser,
  requireScope('chat:read'),
  zValidator('json', queryPresenceSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    const result = await db.query(
      `SELECT DISTINCT u.id, u.name, u.image_url, u.last_active_at,
              COALESCE((u.custom_data->>'online')::boolean, false) as online
       FROM app_user u
       JOIN channel_member target_cm
         ON target_cm.app_id = u.app_id
        AND target_cm.user_id = u.id
       JOIN channel_member caller_cm
         ON caller_cm.app_id = target_cm.app_id
        AND caller_cm.channel_id = target_cm.channel_id
        AND caller_cm.user_id = $2
       WHERE u.app_id = $1 AND u.id = ANY($3)`,
      [auth.appId, auth.userId, body.userIds]
    );

    // Calculate online status (online within last 5 minutes)
    const now = Date.now();
    const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const presence: Record<string, {
      online: boolean;
      lastSeen: string | null;
      user: { id: string; name: string; image: string | null };
    }> = {};

    for (const row of result.rows) {
      const lastActiveAt = row.last_active_at ? new Date(row.last_active_at).getTime() : 0;
      const isRecent = now - lastActiveAt < ONLINE_THRESHOLD;

      presence[row.id] = {
        online: row.online && isRecent,
        lastSeen: row.last_active_at?.toISOString() || null,
        user: {
          id: row.id,
          name: row.name,
          image: row.image_url,
        },
      };
    }

    return c.json({ presence });
  }
);

/**
 * Get presence for a channel (who's online)
 * GET /api/channels/:channelId/presence
 */
export const channelPresenceRoutes = new Hono();

channelPresenceRoutes.get('/', requireUser, requireScope('chat:read'), async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get all members with their presence status
  const result = await db.query(
    `SELECT u.id, u.name, u.image_url, u.last_active_at,
            COALESCE((u.custom_data->>'online')::boolean, false) as online
     FROM channel_member cm
     JOIN app_user u ON u.app_id = cm.app_id AND u.id = cm.user_id
     WHERE cm.channel_id = $1 AND cm.app_id = $2
     ORDER BY u.last_active_at DESC NULLS LAST`,
    [channelId, auth.appId]
  );

  const now = Date.now();
  const ONLINE_THRESHOLD = 5 * 60 * 1000;

  const onlineUsers: any[] = [];
  const offlineUsers: any[] = [];

  for (const row of result.rows) {
    const lastActiveAt = row.last_active_at ? new Date(row.last_active_at).getTime() : 0;
    const isRecent = now - lastActiveAt < ONLINE_THRESHOLD;
    const isOnline = row.online && isRecent;

    const user = {
      id: row.id,
      name: row.name,
      image: row.image_url,
      online: isOnline,
      lastSeen: row.last_active_at?.toISOString() || null,
    };

    if (isOnline) {
      onlineUsers.push(user);
    } else {
      offlineUsers.push(user);
    }
  }

  return c.json({
    online: onlineUsers,
    offline: offlineUsers,
    totalOnline: onlineUsers.length,
    totalMembers: result.rows.length,
  });
});

/**
 * Get real-time presence from Centrifugo
 * GET /api/channels/:channelId/presence/live
 */
channelPresenceRoutes.get('/live', requireUser, requireScope('chat:read'), async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  try {
    const presence = await getCentrifugo().presence(`chat:${auth.appId}:${channelId}`);

    const clients = Object.values(presence.clients).map((client: any) => ({
      clientId: client.client,
      userId: client.user,
      connInfo: client.conn_info,
    }));

    return c.json({
      clients,
      count: clients.length,
    });
  } catch {
    return c.json({ clients: [], count: 0 });
  }
});
