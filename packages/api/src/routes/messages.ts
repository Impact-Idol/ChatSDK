/**
 * Message Routes
 * Message CRUD and reactions
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { db } from '../services/database';
import { centrifugo } from '../services/centrifugo';
import { requireUser } from '../middleware/auth';
import { inngest } from '../inngest';

export const messageRoutes = new Hono();

const sendMessageSchema = z.object({
  text: z.string().min(1).max(10000),
  clientMsgId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'video', 'audio', 'file', 'giphy', 'voicenote']),
    url: z.string().url(),
    title: z.string().optional(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    waveform: z.array(z.number()).optional(),
    thumbnailUrl: z.string().url().optional(),
  })).optional(),
  parentId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
});

/**
 * Send message
 * POST /api/channels/:channelId/messages
 */
messageRoutes.post(
  '/',
  requireUser,
  zValidator('json', sendMessageSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const body = c.req.valid('json');

    // Verify user is member of channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Check for duplicate using clientMsgId
    if (body.clientMsgId) {
      const existingResult = await db.query(
        `SELECT id, seq FROM message
         WHERE channel_id = $1 AND id = $2`,
        [channelId, body.clientMsgId]
      );

      if (existingResult.rows.length > 0) {
        // Return existing message (idempotent)
        const existing = existingResult.rows[0];
        return c.json({
          id: existing.id,
          seq: existing.seq,
          status: 'sent',
          duplicate: true,
        });
      }
    }

    // Create message in transaction
    const result = await db.transaction(async (client) => {
      // Get next sequence number (OpenIMSDK pattern)
      const seqResult = await client.query(
        'SELECT next_channel_seq($1) as seq',
        [channelId]
      );
      const seq = seqResult.rows[0].seq;

      // Generate message ID (use clientMsgId if provided for idempotency)
      const messageId = body.clientMsgId || uuidv7();

      // Insert message
      const messageResult = await client.query(
        `INSERT INTO message (
          id, channel_id, app_id, user_id, seq, text, attachments,
          parent_id, reply_to_id, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent', NOW())
        RETURNING *`,
        [
          messageId,
          channelId,
          auth.appId,
          auth.userId,
          seq,
          body.text,
          JSON.stringify(body.attachments ?? []),
          body.parentId,
          body.replyToId,
        ]
      );

      // Update reply count if this is a thread reply
      if (body.parentId) {
        await client.query(
          `UPDATE message SET reply_count = reply_count + 1
           WHERE id = $1`,
          [body.parentId]
        );
      }

      // Insert user_message for all channel members (Zulip pattern)
      await client.query(
        `INSERT INTO user_message (user_id, app_id, message_id, flags)
         SELECT user_id, app_id, $1, 0
         FROM channel_member
         WHERE channel_id = $2 AND app_id = $3`,
        [messageId, channelId, auth.appId]
      );

      // Mark as read for sender
      await client.query(
        `UPDATE user_message SET flags = flags | 1
         WHERE message_id = $1 AND user_id = $2 AND app_id = $3`,
        [messageId, auth.userId, auth.appId]
      );

      // Update unread counts for other members
      await client.query(
        `UPDATE channel_member
         SET unread_count = unread_count + 1
         WHERE channel_id = $1 AND app_id = $2 AND user_id != $3`,
        [channelId, auth.appId, auth.userId]
      );

      return messageResult.rows[0];
    });

    // Format message for response
    const message = formatMessage(result, auth.user!);

    // Publish to Centrifugo for real-time delivery
    await centrifugo.publishMessage(auth.appId, channelId, message);

    // Get channel info and members for notifications
    const channelInfo = await db.query(
      `SELECT c.name, c.type, array_agg(cm.user_id) as member_ids
       FROM channel c
       JOIN channel_member cm ON c.id = cm.channel_id
       WHERE c.id = $1 AND c.app_id = $2
       GROUP BY c.id`,
      [channelId, auth.appId]
    );

    const channel = channelInfo.rows[0];

    // Extract @mentions from message text
    const mentionRegex = /@(\w+)/g;
    const mentions = [...body.text.matchAll(mentionRegex)].map((m) => m[1]);

    // Trigger Inngest notification event (async - don't await)
    inngest.send({
      name: 'chat/message.sent',
      data: {
        messageId: result.id,
        channelId,
        channelName: channel?.name || 'Chat',
        channelType: channel?.type || 'messaging',
        senderId: auth.userId!,
        senderName: auth.user?.name || 'Unknown',
        senderAvatar: auth.user?.image,
        content: body.text,
        mentions,
        memberIds: channel?.member_ids || [],
        parentId: body.parentId,
      },
    }).catch((err) => {
      console.warn('Failed to send Inngest event:', err);
    });

    // Trigger link preview generation event (async - don't await)
    inngest.send({
      name: 'chat/message.created',
      data: {
        messageId: result.id,
        appId: auth.appId,
        text: body.text,
      },
    }).catch((err) => {
      console.warn('Failed to send link preview event:', err);
    });

    return c.json(message, 201);
  }
);

/**
 * Query messages
 * GET /api/channels/:channelId/messages
 */
messageRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  const sinceSeq = parseInt(c.req.query('since_seq') || '0', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 200);
  const before = c.req.query('before'); // message ID for cursor pagination
  const after = c.req.query('after');

  // Get current max seq for hasMore calculation
  const seqResult = await db.query(
    'SELECT current_seq FROM channel_seq WHERE channel_id = $1',
    [channelId]
  );

  const maxSeq = seqResult.rows[0]?.current_seq ?? 0;

  // Build query based on pagination method
  let query: string;
  let params: any[];

  if (sinceSeq > 0) {
    // Sequence-based pagination (OpenIMSDK sync pattern)
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2 AND m.seq > $3 AND m.deleted_at IS NULL
      ORDER BY m.seq ASC
      LIMIT $4
    `;
    params = [channelId, auth.appId, sinceSeq, limit];
  } else if (before) {
    // Cursor-based pagination (for infinite scroll up)
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2
        AND m.created_at < (SELECT created_at FROM message WHERE id = $3)
        AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT $4
    `;
    params = [channelId, auth.appId, before, limit];
  } else if (after) {
    // Cursor-based pagination (for loading newer)
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2
        AND m.created_at > (SELECT created_at FROM message WHERE id = $3)
        AND m.deleted_at IS NULL
      ORDER BY m.created_at ASC
      LIMIT $4
    `;
    params = [channelId, auth.appId, after, limit];
  } else {
    // Default: get latest messages
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2 AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    params = [channelId, auth.appId, limit];
  }

  const result = await db.query(query, params);

  // Get reactions for these messages
  const messageIds = result.rows.map((m) => m.id);
  const reactions = await getReactionsForMessages(messageIds, auth.appId, auth.userId!);

  // Format messages
  const messages = result.rows.map((row) => ({
    ...formatMessage(row, {
      id: row.user_id,
      name: row.user_name,
      image: row.user_image,
    }),
    reactions: reactions[row.id] || [],
  }));

  // Reverse if we fetched in DESC order
  if (!sinceSeq && !after) {
    messages.reverse();
  }

  // Calculate hasMore
  const lastSeq = messages[messages.length - 1]?.seq ?? sinceSeq;
  const hasMore = lastSeq < maxSeq;

  return c.json({
    messages,
    maxSeq,
    hasMore,
  });
});

/**
 * Get single message
 * GET /api/channels/:channelId/messages/:messageId
 */
messageRoutes.get('/:messageId', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');

  const result = await db.query(
    `SELECT m.*, u.name as user_name, u.image_url as user_image
     FROM message m
     JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
     WHERE m.id = $1 AND m.channel_id = $2 AND m.app_id = $3`,
    [messageId, channelId, auth.appId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Message not found' } }, 404);
  }

  const row = result.rows[0];
  const reactions = await getReactionsForMessages([messageId], auth.appId, auth.userId!);

  return c.json({
    ...formatMessage(row, {
      id: row.user_id,
      name: row.user_name,
      image: row.user_image,
    }),
    reactions: reactions[messageId] || [],
  });
});

const updateMessageSchema = z.object({
  text: z.string().min(1).max(10000),
});

/**
 * Update message
 * PATCH /api/channels/:channelId/messages/:messageId
 */
messageRoutes.patch(
  '/:messageId',
  requireUser,
  zValidator('json', updateMessageSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const messageId = c.req.param('messageId');
    const body = c.req.valid('json');

    // Check ownership
    const checkResult = await db.query(
      `SELECT user_id FROM message
       WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
      [messageId, channelId, auth.appId]
    );

    if (checkResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }

    if (checkResult.rows[0].user_id !== auth.userId) {
      return c.json({ error: { message: 'Can only edit own messages' } }, 403);
    }

    // Update message
    const result = await db.query(
      `UPDATE message
       SET text = $4, edited_at = NOW()
       WHERE id = $1 AND channel_id = $2 AND app_id = $3
       RETURNING *`,
      [messageId, channelId, auth.appId, body.text]
    );

    const message = formatMessage(result.rows[0], auth.user!);

    // Publish update
    await centrifugo.publishMessageUpdate(auth.appId, channelId, message);

    return c.json(message);
  }
);

/**
 * Delete message
 * DELETE /api/channels/:channelId/messages/:messageId
 */
messageRoutes.delete('/:messageId', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');

  // Check ownership or admin
  const checkResult = await db.query(
    `SELECT m.user_id, cm.role
     FROM message m
     JOIN channel_member cm ON cm.channel_id = m.channel_id AND cm.user_id = $4
     WHERE m.id = $1 AND m.channel_id = $2 AND m.app_id = $3`,
    [messageId, channelId, auth.appId, auth.userId]
  );

  if (checkResult.rows.length === 0) {
    return c.json({ error: { message: 'Message not found' } }, 404);
  }

  const row = checkResult.rows[0];
  const isOwner = row.user_id === auth.userId;
  const isAdmin = ['owner', 'admin', 'moderator'].includes(row.role);

  if (!isOwner && !isAdmin) {
    return c.json({ error: { message: 'Permission denied' } }, 403);
  }

  // Soft delete
  await db.query(
    `UPDATE message SET deleted_at = NOW()
     WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
    [messageId, channelId, auth.appId]
  );

  // Publish delete
  await centrifugo.publishMessageDelete(auth.appId, channelId, messageId);

  return c.json({ success: true });
});

// ============================================================================
// Reactions
// ============================================================================

/**
 * Add reaction
 * POST /api/channels/:channelId/messages/:messageId/reactions
 */
messageRoutes.post(
  '/:messageId/reactions',
  requireUser,
  zValidator('json', z.object({ emoji: z.string().min(1).max(50) })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const messageId = c.req.param('messageId');
    const { emoji } = c.req.valid('json');

    // Get message author info before inserting reaction
    const messageResult = await db.query(
      `SELECT user_id, text FROM message WHERE id = $1 AND app_id = $2`,
      [messageId, auth.appId]
    );

    if (messageResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }

    const messageAuthorId = messageResult.rows[0].user_id;
    const messagePreview = messageResult.rows[0].text;

    // Insert reaction (upsert)
    await db.query(
      `INSERT INTO reaction (message_id, app_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [messageId, auth.appId, auth.userId, emoji]
    );

    // Publish reaction event
    await centrifugo.publishReaction(
      auth.appId,
      channelId,
      messageId,
      { type: emoji, userId: auth.userId, user: auth.user },
      true
    );

    // Trigger Inngest notification event for reactions (don't notify self-reactions)
    if (messageAuthorId !== auth.userId) {
      inngest.send({
        name: 'chat/message.reaction',
        data: {
          messageId,
          channelId,
          reactorId: auth.userId!,
          reactorName: auth.user?.name || 'Unknown',
          emoji,
          messageAuthorId,
          messagePreview: messagePreview?.slice(0, 100) || '',
        },
      }).catch((err) => {
        console.warn('Failed to send reaction Inngest event:', err);
      });
    }

    return c.json({ success: true });
  }
);

/**
 * Remove reaction
 * DELETE /api/channels/:channelId/messages/:messageId/reactions/:emoji
 */
messageRoutes.delete('/:messageId/reactions/:emoji', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');
  const emoji = decodeURIComponent(c.req.param('emoji'));

  // Delete reaction
  await db.query(
    `DELETE FROM reaction
     WHERE message_id = $1 AND app_id = $2 AND user_id = $3 AND emoji = $4`,
    [messageId, auth.appId, auth.userId, emoji]
  );

  // Publish reaction removed event
  await centrifugo.publishReaction(
    auth.appId,
    channelId,
    messageId,
    { type: emoji, userId: auth.userId, user: auth.user },
    false
  );

  return c.json({ success: true });
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatMessage(row: any, user: any) {
  return {
    id: row.id,
    cid: row.channel_id,
    type: row.deleted_at ? 'deleted' : 'regular',
    text: row.deleted_at ? null : row.text,
    seq: row.seq,
    clientMsgId: row.id, // Using ID as clientMsgId for now
    user: user,
    attachments: row.attachments || [],
    parentId: row.parent_id,
    replyToId: row.reply_to_id,
    replyCount: row.reply_count || 0,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.edited_at,
    deleted_at: row.deleted_at,
  };
}

async function getReactionsForMessages(
  messageIds: string[],
  appId: string,
  userId: string
): Promise<Record<string, any[]>> {
  if (messageIds.length === 0) return {};

  const result = await db.query(
    `SELECT r.message_id, r.emoji, COUNT(*) as count,
            bool_or(r.user_id = $2) as own,
            array_agg(json_build_object('id', u.id, 'name', u.name)) as users
     FROM reaction r
     JOIN app_user u ON r.app_id = u.app_id AND r.user_id = u.id
     WHERE r.message_id = ANY($1) AND r.app_id = $3
     GROUP BY r.message_id, r.emoji`,
    [messageIds, userId, appId]
  );

  const reactions: Record<string, any[]> = {};

  for (const row of result.rows) {
    if (!reactions[row.message_id]) {
      reactions[row.message_id] = [];
    }
    reactions[row.message_id].push({
      type: row.emoji,
      count: parseInt(row.count, 10),
      own: row.own,
      users: row.users.slice(0, 5), // Limit users shown
    });
  }

  return reactions;
}

// ============================================================================
// Work Stream 10: Pinned Messages
// ============================================================================

/**
 * Pin a message
 * POST /api/messages/:messageId/pin
 */
messageRoutes.post('/:messageId/pin', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');

  // Verify user has admin/owner role in channel (simplified check)
  // In production, you should have proper channel role management
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a channel member' } }, 403);
  }

  // Verify message exists in this channel
  const messageCheck = await db.query(
    `SELECT id FROM message WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
    [messageId, channelId, auth.appId]
  );

  if (messageCheck.rows.length === 0) {
    return c.json({ error: { message: 'Message not found' } }, 404);
  }

  // Pin message
  await db.query(
    `INSERT INTO pinned_message (channel_id, message_id, app_id, pinned_by, pinned_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (channel_id, message_id) DO NOTHING`,
    [channelId, messageId, auth.appId, auth.userId]
  );

  return c.json({ success: true });
});

/**
 * Unpin a message
 * DELETE /api/messages/:messageId/pin
 */
messageRoutes.delete('/:messageId/pin', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');

  await db.query(
    `DELETE FROM pinned_message WHERE channel_id = $1 AND message_id = $2 AND app_id = $3`,
    [channelId, messageId, auth.appId]
  );

  return c.json({ success: true });
});

/**
 * Get pinned messages for a channel
 * GET /api/channels/:channelId/pins
 */
messageRoutes.get('/pins', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a channel member' } }, 403);
  }

  const result = await db.query(
    `SELECT m.*, pm.pinned_by, pm.pinned_at, u.name as user_name, u.image_url as user_image
     FROM pinned_message pm
     JOIN message m ON pm.message_id = m.id
     JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
     WHERE pm.channel_id = $1 AND pm.app_id = $2
     ORDER BY pm.pinned_at DESC`,
    [channelId, auth.appId]
  );

  const messages = result.rows.map((row) => ({
    id: row.id,
    text: row.text,
    attachments: row.attachments,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      name: row.user_name,
      image: row.user_image,
    },
    pinnedBy: row.pinned_by,
    pinnedAt: row.pinned_at,
  }));

  return c.json({ messages });
});

// ============================================================================
// Work Stream 11: Saved Messages
// ============================================================================

/**
 * Save/bookmark a message
 * POST /api/messages/:messageId/save
 */
messageRoutes.post('/:messageId/save', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');

  // Verify message exists and user has access
  const messageCheck = await db.query(
    `SELECT m.id
     FROM message m
     JOIN channel_member cm ON m.channel_id = cm.channel_id AND cm.user_id = $3
     WHERE m.id = $1 AND m.channel_id = $2 AND m.app_id = $4`,
    [messageId, channelId, auth.userId, auth.appId]
  );

  if (messageCheck.rows.length === 0) {
    return c.json({ error: { message: 'Message not found or no access' } }, 404);
  }

  // Save message
  await db.query(
    `INSERT INTO saved_message (app_id, user_id, message_id, saved_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (app_id, user_id, message_id) DO NOTHING`,
    [auth.appId, auth.userId, messageId]
  );

  return c.json({ success: true });
});

/**
 * Unsave/remove bookmark from a message
 * DELETE /api/messages/:messageId/save
 */
messageRoutes.delete('/:messageId/save', requireUser, async (c) => {
  const auth = c.get('auth');
  const messageId = c.req.param('messageId');

  await db.query(
    `DELETE FROM saved_message WHERE app_id = $1 AND user_id = $2 AND message_id = $3`,
    [auth.appId, auth.userId, messageId]
  );

  return c.json({ success: true });
});

/**
 * Get user's saved messages
 * GET /api/users/me/saved
 */
messageRoutes.get('/me/saved', requireUser, async (c) => {
  const auth = c.get('auth');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await db.query(
    `SELECT m.*, sm.saved_at, u.name as user_name, u.image_url as user_image,
            c.name as channel_name, c.id as channel_id
     FROM saved_message sm
     JOIN message m ON sm.message_id = m.id
     JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
     JOIN channel c ON m.channel_id = c.id
     WHERE sm.app_id = $1 AND sm.user_id = $2
     ORDER BY sm.saved_at DESC
     LIMIT $3 OFFSET $4`,
    [auth.appId, auth.userId, limit, offset]
  );

  const messages = result.rows.map((row) => ({
    id: row.id,
    text: row.text,
    attachments: row.attachments,
    createdAt: row.created_at,
    savedAt: row.saved_at,
    user: {
      id: row.user_id,
      name: row.user_name,
      image: row.user_image,
    },
    channel: {
      id: row.channel_id,
      name: row.channel_name,
    },
  }));

  return c.json({ messages });
});
