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
  // Support standard types + common aliases (public/private)
  type: z.enum(['messaging', 'group', 'team', 'livestream', 'public', 'private']).default('messaging'),
  name: z.string().optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.string()).default([]), // Allow empty for group channels
  workspaceId: z.string().uuid().optional(), // Associate channel with a workspace
  config: z.object({
    typingEvents: z.boolean().optional(),
    readEvents: z.boolean().optional(),
    reactions: z.boolean().optional(),
    replies: z.boolean().optional(),
    private: z.boolean().optional(), // Channel privacy
  }).optional(),
}).refine(
  (data) => {
    // For DM channels, require exactly 1 member (the other person)
    if (data.type === 'messaging') {
      return data.memberIds.length === 1;
    }
    // For group channels, members are optional
    return true;
  },
  {
    message: 'Direct messages require exactly one member ID',
    path: ['memberIds'],
  }
);

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
        `INSERT INTO channel (id, app_id, cid, type, name, image_url, config, created_by, member_count, workspace_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
          body.workspaceId ?? null,
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

      // Update workspace channel_count if associated with a workspace
      if (body.workspaceId) {
        await client.query(
          `UPDATE workspace SET channel_count = channel_count + 1 WHERE id = $1`,
          [body.workspaceId]
        );
      }

      return channelResult.rows[0];
    });

    // Broadcast channel created event
    try {
      const { centrifugo } = await import('../services/centrifugo');
      await centrifugo.publishChannelCreated(auth.appId, formatChannel(result));
    } catch (error) {
      console.error('Failed to broadcast channel.created event:', error);
    }

    return c.json(formatChannel(result), 201);
  }
);

/**
 * Query channels
 * GET /api/channels
 *
 * Returns:
 * - All channels the user is a member of
 * - All public/team channels (visible to everyone in the app)
 */
channelRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');

  // Safe parsing with NaN fallback
  const rawLimit = parseInt(c.req.query('limit') || '50', 10);
  const limit = isNaN(rawLimit) ? 50 : Math.min(rawLimit, 100);

  const rawOffset = parseInt(c.req.query('offset') || '0', 10);
  const offset = isNaN(rawOffset) ? 0 : rawOffset;

  const type = c.req.query('type');
  const workspaceId = c.req.query('workspaceId');

  // Query combines:
  // 1. Channels where user is a member (with their membership data)
  // 2. Public/team channels user is NOT a member of (visible to discover)
  // Use subquery to deduplicate, then sort and paginate
  const params: any[] = [auth.appId, auth.userId];

  let innerWhere = `c.app_id = $1
      AND (
        cm.user_id IS NOT NULL  -- User is a member
        OR c.type IN ('public', 'team')  -- Or it's a public channel
      )`;

  if (type) {
    innerWhere += ` AND c.type = $${params.length + 1}`;
    params.push(type);
  }

  if (workspaceId) {
    innerWhere += ` AND c.workspace_id = $${params.length + 1}`;
    params.push(workspaceId);
  }

  let query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id) c.*, cm.last_read_seq, cm.unread_count, cm.muted, cm.starred, cm.role
      FROM channel c
      LEFT JOIN channel_member cm ON c.id = cm.channel_id AND cm.app_id = c.app_id AND cm.user_id = $2
      WHERE ${innerWhere}
      ORDER BY c.id
    ) sub
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
  `;

  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  // For messaging/DM and group channels, fetch members to include in response
  const channels = result.rows.map(formatChannel);
  const messagingChannelIds = result.rows
    .filter((row) => row.type === 'messaging' || row.type === 'group')
    .map((row) => row.id);

  if (messagingChannelIds.length > 0) {
    // Batch fetch members for all messaging and group channels
    const membersResult = await db.query(
      `SELECT cm.channel_id, cm.user_id, cm.role, u.name, u.image_url, u.custom_data->>'email' as email
       FROM channel_member cm
       LEFT JOIN app_user u ON cm.user_id = u.id AND cm.app_id = u.app_id
       WHERE cm.app_id = $1 AND cm.channel_id = ANY($2)
       ORDER BY cm.joined_at ASC`,
      [auth.appId, messagingChannelIds]
    );

    // Group members by channel_id
    const membersByChannel: Record<string, any[]> = {};
    for (const member of membersResult.rows) {
      if (!membersByChannel[member.channel_id]) {
        membersByChannel[member.channel_id] = [];
      }
      membersByChannel[member.channel_id].push({
        id: member.user_id,
        name: member.name,
        image: member.image_url,
        email: member.email,
        role: member.role,
      });
    }

    // Attach members to messaging and group channels
    for (const channel of channels) {
      if ((channel.type === 'messaging' || channel.type === 'group') && membersByChannel[channel.id]) {
        (channel as any).members = membersByChannel[channel.id];
      }
    }
  }

  return c.json({
    channels,
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
    `SELECT c.*, cm.last_read_seq, cm.unread_count, cm.muted, cm.starred, cm.role
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

    const updatedChannel = formatChannel(result.rows[0]);

    // Broadcast channel updated event
    try {
      const { centrifugo } = await import('../services/centrifugo');
      await centrifugo.publishChannelUpdated(auth.appId, channelId, updatedChannel);
    } catch (error) {
      console.error('Failed to broadcast channel.updated event:', error);
    }

    return c.json(updatedChannel);
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

  // Broadcast channel deleted event
  try {
    const { centrifugo } = await import('../services/centrifugo');
    await centrifugo.publishChannelDeleted(auth.appId, channelId);
  } catch (error) {
    console.error('Failed to broadcast channel.deleted event:', error);
  }

  return c.json({ success: true });
});

/**
 * Get channel members
 * GET /api/channels/:channelId/members
 */
channelRoutes.get('/:channelId/members', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member
     WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
    [channelId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel' } }, 403);
  }

  // Get all members
  const membersResult = await db.query(
    `SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.image_url, u.custom_data->>'email' as email
     FROM channel_member cm
     LEFT JOIN app_user u ON cm.user_id = u.id AND cm.app_id = u.app_id
     WHERE cm.channel_id = $1 AND cm.app_id = $2
     ORDER BY cm.joined_at ASC`,
    [channelId, auth.appId]
  );

  return c.json({
    members: membersResult.rows.map((m) => ({
      id: m.user_id,
      name: m.name,
      image: m.image_url,
      email: m.email,
      role: m.role,
      joinedAt: m.joined_at,
    })),
  });
});

/**
 * Add member(s) to channel
 * POST /api/channels/:channelId/members
 * Accepts either { userId: string } or { userIds: string[] }
 */
channelRoutes.post(
  '/:channelId/members',
  requireUser,
  zValidator(
    'json',
    z.object({
      userId: z.string().optional(),
      userIds: z.array(z.string()).optional(),
    }).refine((data) => data.userId || data.userIds, {
      message: 'Either userId or userIds must be provided',
    })
  ),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const body = c.req.valid('json');

    // Support both single userId and array of userIds
    const userIdsToAdd = body.userIds || (body.userId ? [body.userId] : []);

    if (userIdsToAdd.length === 0) {
      return c.json({ error: { message: 'No users to add' } }, 400);
    }

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

    // Add members (batch insert)
    for (const userId of userIdsToAdd) {
      await db.query(
        `INSERT INTO channel_member (channel_id, app_id, user_id, role)
         VALUES ($1, $2, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [channelId, auth.appId, userId]
      );

      // Broadcast channel member joined event for each user
      try {
        const { centrifugo } = await import('../services/centrifugo');
        await centrifugo.publishChannelMemberJoined(auth.appId, channelId, userId);
      } catch (error) {
        console.error('Failed to broadcast channel.member_joined event:', error);
      }
    }

    // Update member count
    await db.query(
      `UPDATE channel SET member_count = (
        SELECT COUNT(*) FROM channel_member WHERE channel_id = $1
       ) WHERE id = $1`,
      [channelId]
    );

    return c.json({ success: true, addedCount: userIdsToAdd.length });
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

  // Broadcast channel member left event
  try {
    const { centrifugo } = await import('../services/centrifugo');
    await centrifugo.publishChannelMemberLeft(auth.appId, channelId, userId);
  } catch (error) {
    console.error('Failed to broadcast channel.member_left event:', error);
  }

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

    await centrifugo.publishTyping(auth.appId, channelId, auth.user!, typing);

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
    await centrifugo.publishReadReceipt(auth.appId, channelId, auth.userId!, maxSeq);

    return c.json({ success: true, lastReadSeq: maxSeq });
  }
);

/**
 * Star/unstar channel
 * PATCH /api/channels/:channelId/star
 */
channelRoutes.patch(
  '/:channelId/star',
  requireUser,
  zValidator('json', z.object({ starred: z.boolean() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { starred } = c.req.valid('json');

    // Check if user is a member of the channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Update starred status
    await db.query(
      `UPDATE channel_member
       SET starred = $4
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId, starred]
    );

    return c.json({ success: true, starred });
  }
);

/**
 * Mute/unmute channel
 * PATCH /api/channels/:channelId/mute
 */
channelRoutes.patch(
  '/:channelId/mute',
  requireUser,
  zValidator('json', z.object({ muted: z.boolean() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { muted } = c.req.valid('json');

    // Check if user is a member of the channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Update muted status
    await db.query(
      `UPDATE channel_member
       SET muted = $4
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId, muted]
    );

    return c.json({ success: true, muted });
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
    workspaceId: row.workspace_id,
    // User-specific fields
    lastReadSeq: row.last_read_seq,
    unreadCount: row.unread_count,
    muted: row.muted,
    starred: row.starred,
    role: row.role,
  };
}
