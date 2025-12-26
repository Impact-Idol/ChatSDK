/**
 * Channel Routes
 * Channel/conversation management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';

export const channelRoutes = new Hono();

const createChannelSchema = z.object({
  type: z.enum(['messaging', 'group', 'team', 'livestream']).default('messaging'),
  name: z.string().optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.string()).min(1),
  config: z.object({
    typingEvents: z.boolean().optional(),
    readEvents: z.boolean().optional(),
    reactions: z.boolean().optional(),
    replies: z.boolean().optional(),
  }).optional(),
});

/**
 * Create channel
 * POST /api/channels
 */
channelRoutes.post(
  '/',
  requireUser,
  zValidator('json', createChannelSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Generate channel ID and CID
    const channelId = uuidv7();

    // For DM channels, create deterministic CID
    let cid: string;
    if (body.type === 'messaging' && body.memberIds.length === 1) {
      const members = [auth.userId!, body.memberIds[0]].sort();
      cid = `messaging:${members.join('-')}`;
    } else {
      cid = `${body.type}:${channelId}`;
    }

    // Check if channel with this CID already exists (for DMs)
    const existingChannel = await db.query(
      'SELECT id FROM channel WHERE app_id = $1 AND cid = $2',
      [auth.appId, cid]
    );

    if (existingChannel.rows.length > 0) {
      // Return existing channel
      const channelId = existingChannel.rows[0].id;
      return c.redirect(`/api/channels/${channelId}`, 303);
    }

    // Create channel in transaction
    const result = await db.transaction(async (client) => {
      // Insert channel
      const channelResult = await client.query(
        `INSERT INTO channel (id, app_id, cid, type, name, image_url, config, created_by, member_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          channelId,
          auth.appId,
          cid,
          body.type,
          body.name,
          body.image,
          body.config ?? {},
          auth.userId,
          body.memberIds.length + 1, // +1 for creator
        ]
      );

      // Add creator as owner
      await client.query(
        `INSERT INTO channel_member (channel_id, app_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [channelId, auth.appId, auth.userId]
      );

      // Add other members
      for (const memberId of body.memberIds) {
        if (memberId !== auth.userId) {
          await client.query(
            `INSERT INTO channel_member (channel_id, app_id, user_id, role)
             VALUES ($1, $2, $3, 'member')
             ON CONFLICT DO NOTHING`,
            [channelId, auth.appId, memberId]
          );
        }
      }

      // Initialize channel sequence
      await client.query(
        `INSERT INTO channel_seq (channel_id, current_seq) VALUES ($1, 0)`,
        [channelId]
      );

      return channelResult.rows[0];
    });

    return c.json(formatChannel(result), 201);
  }
);

/**
 * Query channels
 * GET /api/channels
 */
channelRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const type = c.req.query('type');

  let query = `
    SELECT c.*, cm.last_read_seq, cm.unread_count, cm.muted
    FROM channel c
    JOIN channel_member cm ON c.id = cm.channel_id AND cm.app_id = c.app_id
    WHERE c.app_id = $1 AND cm.user_id = $2
  `;
  const params: any[] = [auth.appId, auth.userId];

  if (type) {
    query += ` AND c.type = $${params.length + 1}`;
    params.push(type);
  }

  query += ` ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`;
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  return c.json({
    channels: result.rows.map(formatChannel),
  });
});

/**
 * Get channel by ID
 * GET /api/channels/:channelId
 */
channelRoutes.get('/:channelId', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  const result = await db.query(
    `SELECT c.*, cm.last_read_seq, cm.unread_count, cm.muted, cm.role
     FROM channel c
     LEFT JOIN channel_member cm ON c.id = cm.channel_id AND cm.app_id = c.app_id AND cm.user_id = $3
     WHERE c.app_id = $1 AND c.id = $2`,
    [auth.appId, channelId, auth.userId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }

  const channel = result.rows[0];

  // Get members
  const membersResult = await db.query(
    `SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.image_url
     FROM channel_member cm
     JOIN app_user u ON cm.app_id = u.app_id AND cm.user_id = u.id
     WHERE cm.channel_id = $1 AND cm.app_id = $2
     LIMIT 100`,
    [channelId, auth.appId]
  );

  return c.json({
    ...formatChannel(channel),
    members: membersResult.rows.map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      user: {
        id: m.user_id,
        name: m.name,
        image: m.image_url,
      },
    })),
  });
});

const updateChannelSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

/**
 * Update channel
 * PATCH /api/channels/:channelId
 */
channelRoutes.patch(
  '/:channelId',
  requireUser,
  zValidator('json', updateChannelSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const body = c.req.valid('json');

    // Check if user is admin/owner
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const role = memberResult.rows[0].role;
    if (!['owner', 'admin'].includes(role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    const result = await db.query(
      `UPDATE channel
       SET name = COALESCE($3, name),
           image_url = COALESCE($4, image_url),
           config = COALESCE($5, config),
           updated_at = NOW()
       WHERE app_id = $1 AND id = $2
       RETURNING *`,
      [auth.appId, channelId, body.name, body.image, body.config]
    );

    return c.json(formatChannel(result.rows[0]));
  }
);

/**
 * Delete channel
 * DELETE /api/channels/:channelId
 */
channelRoutes.delete('/:channelId', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Check if user is owner
  const memberResult = await db.query(
    `SELECT role FROM channel_member
     WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
    [channelId, auth.appId, auth.userId]
  );

  if (memberResult.rows.length === 0) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }

  if (memberResult.rows[0].role !== 'owner') {
    return c.json({ error: { message: 'Only owner can delete channel' } }, 403);
  }

  await db.query(
    'DELETE FROM channel WHERE app_id = $1 AND id = $2',
    [auth.appId, channelId]
  );

  return c.json({ success: true });
});

/**
 * Add member to channel
 * POST /api/channels/:channelId/members
 */
channelRoutes.post(
  '/:channelId/members',
  requireUser,
  zValidator('json', z.object({ userId: z.string() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { userId } = c.req.valid('json');

    // Check permission
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const role = memberResult.rows[0].role;
    if (!['owner', 'admin', 'moderator'].includes(role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    // Add member
    await db.query(
      `INSERT INTO channel_member (channel_id, app_id, user_id, role)
       VALUES ($1, $2, $3, 'member')
       ON CONFLICT DO NOTHING`,
      [channelId, auth.appId, userId]
    );

    // Update member count
    await db.query(
      `UPDATE channel SET member_count = (
        SELECT COUNT(*) FROM channel_member WHERE channel_id = $1
       ) WHERE id = $1`,
      [channelId]
    );

    return c.json({ success: true });
  }
);

/**
 * Remove member from channel
 * DELETE /api/channels/:channelId/members/:userId
 */
channelRoutes.delete('/:channelId/members/:userId', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const userId = c.req.param('userId');

  // Check permission (can remove self, or admin can remove others)
  if (userId !== auth.userId) {
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const role = memberResult.rows[0].role;
    if (!['owner', 'admin', 'moderator'].includes(role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }
  }

  // Remove member
  await db.query(
    `DELETE FROM channel_member
     WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
    [channelId, auth.appId, userId]
  );

  // Update member count
  await db.query(
    `UPDATE channel SET member_count = (
      SELECT COUNT(*) FROM channel_member WHERE channel_id = $1
     ) WHERE id = $1`,
    [channelId]
  );

  return c.json({ success: true });
});

/**
 * Send typing indicator
 * POST /api/channels/:channelId/typing
 */
channelRoutes.post(
  '/:channelId/typing',
  requireUser,
  zValidator('json', z.object({ typing: z.boolean() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { typing } = c.req.valid('json');

    // Import here to avoid circular dependency
    const { centrifugo } = await import('../services/centrifugo');

    await centrifugo.publishTyping(channelId, auth.user!, typing);

    return c.json({ success: true });
  }
);

/**
 * Mark channel as read
 * POST /api/channels/:channelId/read
 */
channelRoutes.post(
  '/:channelId/read',
  requireUser,
  zValidator('json', z.object({ messageId: z.string().optional() }).optional()),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');

    // Get current max seq
    const seqResult = await db.query(
      'SELECT current_seq FROM channel_seq WHERE channel_id = $1',
      [channelId]
    );

    if (seqResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const maxSeq = seqResult.rows[0].current_seq;

    // Update read state
    await db.query(
      `UPDATE channel_member
       SET last_read_seq = $4, unread_count = 0
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId, maxSeq]
    );

    // Publish read receipt
    const { centrifugo } = await import('../services/centrifugo');
    await centrifugo.publishReadReceipt(channelId, auth.userId!, maxSeq);

    return c.json({ success: true, lastReadSeq: maxSeq });
  }
);

function formatChannel(row: any) {
  return {
    id: row.id,
    cid: row.cid,
    type: row.type,
    name: row.name,
    image: row.image_url,
    memberCount: row.member_count,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    config: row.config,
    // User-specific fields
    lastReadSeq: row.last_read_seq,
    unreadCount: row.unread_count,
    muted: row.muted,
    role: row.role,
  };
}
