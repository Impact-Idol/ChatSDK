/**
 * Presence Routes
 * User online/offline status management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { centrifugo, getCentrifugo } from '../services/centrifugo';

export const presenceRoutes = new Hono();

/**
 * Update user presence (heartbeat)
 * POST /api/presence/heartbeat
 */
presenceRoutes.post('/heartbeat', requireUser, async (c) => {
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
presenceRoutes.post('/online', requireUser, async (c) => {
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
    await centrifugo.publishPresence(auth.appId, auth.userId!, true);
  }

  return c.json({ success: true });
});

/**
 * Set user offline
 * POST /api/presence/offline
 */
presenceRoutes.post('/offline', requireUser, async (c) => {
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
    await centrifugo.publishPresence(auth.appId, auth.userId!, false, lastSeen);
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
  zValidator('json', queryPresenceSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    const result = await db.query(
      `SELECT id, name, image_url, last_active_at,
              COALESCE((custom_data->>'online')::boolean, false) as online
       FROM app_user
       WHERE app_id = $1 AND id = ANY($2)`,
      [auth.appId, body.userIds]
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

channelPresenceRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get all members with their presence status
  const result = await db.query(
    `SELECT u.id, u.name, u.image_url, u.last_active_at,
            COALESCE((u.custom_data->>'online')::boolean, false) as online
     FROM channel_member cm
     JOIN app_user u ON u.app_id = cm.app_id AND u.id = cm.user_id
     WHERE cm.channel_id = $1
     ORDER BY u.last_active_at DESC NULLS LAST`,
    [channelId]
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
channelPresenceRoutes.get('/live', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  try {
    const presence = await getCentrifugo().presence(`chat:${channelId}`);

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
