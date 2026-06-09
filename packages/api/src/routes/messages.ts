/**
 * Message Routes
 * Message CRUD and reactions
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import type { PoolClient } from 'pg';
import { db } from '../services/database';
import { requireScope, requireUser } from '../middleware/auth';
import { sendInngestEvent } from '../inngest';
import { getChannelAccess, isChannelMember } from '../services/authorization';
import { enqueueRealtimeEvent, triggerRealtimeOutboxDrain } from '../services/realtime-outbox';
import {
  enqueueSearchIndexOperationTx,
  indexMessage,
  removeFromIndex,
  updateMessageIndex,
} from '../services/search';
import {
  prepareMessageAttachments,
  refreshAttachmentMediaUrls,
  type MediaUrlAuth,
} from '../services/media-urls';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';
import {
  hardPurgeMessage,
  purgeStorageKeys,
  softDeleteMessage,
} from '../services/data-lifecycle';

export const messageRoutes = new Hono();

const sendMessageSchema = z.object({
  text: z.string().min(1).max(10000),
  clientMsgId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'video', 'audio', 'file', 'giphy', 'voicenote']),
    url: z.string().url(),
    name: z.string().optional(),
    size: z.number().optional(),
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
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageSend, (c) => ({ channelId: c.req.param('channelId')! })),
  zValidator('json', sendMessageSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const body = c.req.valid('json');

    // Verify user is member of channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      // Check if this is a public channel - auto-join if so
      const channelCheck = await db.query(
        `SELECT c.type, c.workspace_id, wm.user_id as workspace_member_user_id
         FROM channel c
         LEFT JOIN workspace_member wm
           ON wm.app_id = c.app_id
          AND wm.workspace_id = c.workspace_id
          AND wm.user_id = $3
         WHERE c.id = $1 AND c.app_id = $2`,
        [channelId, auth.appId, auth.userId]
      );

      if (channelCheck.rows.length === 0) {
        return c.json({ error: { message: 'Channel not found' } }, 404);
      }

      const channelType = channelCheck.rows[0].type;
      const workspaceId = channelCheck.rows[0].workspace_id;
      const isWorkspaceMember = Boolean(channelCheck.rows[0].workspace_member_user_id);

      if ((channelType === 'public' || channelType === 'team') && (!workspaceId || isWorkspaceMember)) {
        // Auto-join public/team channels
        await db.query(
          `INSERT INTO channel_member (channel_id, app_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, 'member', NOW())
           ON CONFLICT (channel_id, app_id, user_id) DO NOTHING`,
          [channelId, auth.appId, auth.userId]
        );
      } else {
        // Private channels require explicit membership
        return c.json({ error: { message: 'Not a member of this channel' } }, 403);
      }
    }

    // Check for duplicate using clientMsgId
    if (body.clientMsgId) {
      const existingResult = await db.query(
        `SELECT id, seq FROM message
         WHERE channel_id = $1 AND app_id = $2 AND id = $3`,
        [channelId, auth.appId, body.clientMsgId]
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

    let storedAttachments = body.attachments ?? [];
    try {
      storedAttachments = await prepareMessageAttachments(c.req.url, {
        appId: auth.appId,
        channelId,
        attachments: storedAttachments,
      });
    } catch {
      return c.json({
        error: {
          message: 'Attachment media is not available in this channel',
          code: 'ATTACHMENT_FORBIDDEN',
        },
      }, 403);
    }

    // Create message in transaction
    const { message: outboxMessage, row: result } = await db.transaction(async (client) => {
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
          JSON.stringify(storedAttachments),
          body.parentId,
          body.replyToId,
        ]
      );

      // Update reply count if this is a thread reply
      if (body.parentId) {
        await client.query(
          `UPDATE message SET reply_count = reply_count + 1
           WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
          [body.parentId, channelId, auth.appId]
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

      const message = formatMessage(messageResult.rows[0], auth.user!);

      await enqueueRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'message',
        aggregateId: message.id,
        eventType: 'message.new',
        channels: [`chat:${auth.appId}:${channelId}`],
        payload: {
          type: 'message.new',
          payload: { channelId, message },
        },
        idempotencyKey: `message.new:${auth.appId}:${message.id}`,
      });
      await enqueueSearchIndexOperationTx(client, auth.appId, message.id, 'index');

      const memberUnreadCounts = await client.query(
        `SELECT cm.user_id, cm.unread_count,
                (SELECT COALESCE(SUM(unread_count), 0) FROM channel_member
                 WHERE app_id = $2 AND user_id = cm.user_id) as total_unread
         FROM channel_member cm
         WHERE cm.channel_id = $1 AND cm.app_id = $2 AND cm.user_id != $3`,
        [channelId, auth.appId, auth.userId]
      );

      for (const member of memberUnreadCounts.rows) {
        await enqueueRealtimeEvent(client, {
          appId: auth.appId,
          aggregateType: 'channel_member',
          aggregateId: `${channelId}:${member.user_id}`,
          eventType: 'channel.unread_changed',
          channels: [`user:${auth.appId}:${member.user_id}`],
          payload: {
            type: 'channel.unread_changed',
            payload: {
              channelId,
              count: member.unread_count,
            },
          },
          idempotencyKey: `channel.unread_changed:${auth.appId}:${message.id}:${member.user_id}`,
        });

        await enqueueRealtimeEvent(client, {
          appId: auth.appId,
          aggregateType: 'app_user',
          aggregateId: member.user_id,
          eventType: 'channel.total_unread_changed',
          channels: [`user:${auth.appId}:${member.user_id}`],
          payload: {
            type: 'channel.total_unread_changed',
            payload: {
              count: parseInt(member.total_unread, 10),
            },
          },
          idempotencyKey: `channel.total_unread_changed:${auth.appId}:${message.id}:${member.user_id}`,
        });
      }

      return { row: messageResult.rows[0], message };
    });

    // Format message for response
    const message = formatMessage(result, auth.user!, false, undefined, {
      requestUrl: c.req.url,
      auth: { appId: auth.appId, userId: auth.userId! },
    });

    triggerOutboxDrainSafely();
    void indexMessage(toSearchableMessage(result, auth.user!, auth.appId)).catch((err) => {
      console.warn('Failed to index message:', err);
    });

    let mentions: string[] = [];
    let channel: { name?: string; type?: 'messaging' | 'group' | 'public'; member_ids?: string[] } | undefined;

    try {
      // Get channel info and members for notifications
      const channelInfo = await db.query(
        `SELECT c.name, c.type, array_agg(cm.user_id) as member_ids
         FROM channel c
         JOIN channel_member cm ON c.id = cm.channel_id AND cm.app_id = c.app_id
         WHERE c.id = $1 AND c.app_id = $2
         GROUP BY c.id`,
        [channelId, auth.appId]
      );

      channel = channelInfo.rows[0];

      // Extract and store @mentions (resolves names to user IDs)
      const { storeMentions } = await import('./mentions');
      mentions = await storeMentions(
        result.id,
        channelId,
        auth.appId,
        auth.userId!,
        body.text
      );
    } catch (err) {
      console.warn('Failed to process post-commit message side effects:', err);
    }

    // Trigger Inngest notification event (async - don't await)
    sendInngestEvent({
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
    sendInngestEvent({
      name: 'chat/message.created',
      data: {
        messageId: result.id,
        appId: auth.appId,
        text: body.text,
      },
    }).catch((err) => {
      console.warn('Failed to send link preview event:', err);
    });

    // Add mentions to response
    return c.json({
      ...message,
      mentions,
      reactions: [],
    }, 201);
  }
);

/**
 * Query messages
 * GET /api/channels/:channelId/messages
 */
messageRoutes.get(
  '/',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;

  const sinceSeq = parseInt(c.req.query('since_seq') || '0', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 200);
  const before = c.req.query('before'); // message ID for cursor pagination
  const after = c.req.query('after');

  const access = await getChannelAccess(auth.appId, auth.userId!, channelId);
  if (!access.exists) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }
  if (!access.isMember && !access.isPublic) {
    return c.json({ error: { message: 'Not a member of this channel' } }, 403);
  }

  // Get current max seq for hasMore calculation
  const seqResult = await db.query(
    'SELECT current_seq FROM channel_seq WHERE channel_id = $1 AND app_id = $2',
    [channelId, auth.appId]
  );

  const maxSeq = seqResult.rows[0]?.current_seq ?? 0;

  // Build query based on pagination method
  let query: string;
  let params: any[];

  if (sinceSeq > 0) {
    // Sequence-based pagination (OpenIMSDK sync pattern)
    // Filter out thread replies (parent_id IS NULL) - they appear only in thread view
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2 AND m.seq > $3
        AND m.hard_deleted_at IS NULL AND m.parent_id IS NULL
      ORDER BY m.seq ASC
      LIMIT $4
    `;
    params = [channelId, auth.appId, sinceSeq, limit];
  } else if (before) {
    // Cursor-based pagination (for infinite scroll up)
    // Filter out thread replies (parent_id IS NULL) - they appear only in thread view
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2
        AND m.created_at < (
          SELECT created_at FROM message
          WHERE id = $3 AND channel_id = $1 AND app_id = $2
        )
        AND m.hard_deleted_at IS NULL AND m.parent_id IS NULL
      ORDER BY m.created_at DESC
      LIMIT $4
    `;
    params = [channelId, auth.appId, before, limit];
  } else if (after) {
    // Cursor-based pagination (for loading newer)
    // Filter out thread replies (parent_id IS NULL) - they appear only in thread view
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2
        AND m.created_at > (
          SELECT created_at FROM message
          WHERE id = $3 AND channel_id = $1 AND app_id = $2
        )
        AND m.hard_deleted_at IS NULL AND m.parent_id IS NULL
      ORDER BY m.created_at ASC
      LIMIT $4
    `;
    params = [channelId, auth.appId, after, limit];
  } else {
    // Default: get latest messages
    // Filter out thread replies (parent_id IS NULL) - they appear only in thread view
    query = `
      SELECT m.*, u.name as user_name, u.image_url as user_image
      FROM message m
      JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
      WHERE m.channel_id = $1 AND m.app_id = $2
        AND m.hard_deleted_at IS NULL AND m.parent_id IS NULL
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    params = [channelId, auth.appId, limit];
  }

  const result = await db.query(query, params);

  // Get reactions, mentions, pinned status, and polls for these messages
  const messageIds = result.rows.map((m) => m.id);
  const pollIds = result.rows.map((m) => m.poll_id);
  const reactions = await getReactionsForMessages(messageIds, auth.appId, auth.userId!);
  const mentions = await getMentionsForMessages(messageIds, auth.appId);
  const pinnedIds = await getPinnedMessageIds(messageIds, channelId, auth.appId);
  const polls = await getPollsForMessages(pollIds, auth.appId, auth.userId!);

  // Format messages
  const messages = result.rows.map((row) => ({
    ...formatMessage(row, {
      id: row.user_id,
      name: row.user_name,
      image: row.user_image,
    }, pinnedIds.has(row.id), row.poll_id ? polls[row.poll_id] : null, {
      requestUrl: c.req.url,
      auth: { appId: auth.appId, userId: auth.userId! },
    }),
    reactions: reactions[row.id] || [],
    mentions: mentions[row.id] || [],
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
  }
);

/**
 * Get single message
 * GET /api/channels/:channelId/messages/:messageId
 */
messageRoutes.get(
  '/:messageId',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;

  const access = await getChannelAccess(auth.appId, auth.userId!, channelId);
  if (!access.exists) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }
  if (!access.isMember && !access.isPublic) {
    return c.json({ error: { message: 'Not a member of this channel' } }, 403);
  }

  const result = await db.query(
    `SELECT m.*, u.name as user_name, u.image_url as user_image
     FROM message m
     JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
     WHERE m.id = $1 AND m.channel_id = $2 AND m.app_id = $3
       AND m.hard_deleted_at IS NULL`,
    [messageId, channelId, auth.appId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Message not found' } }, 404);
  }

  const row = result.rows[0];
  const reactions = await getReactionsForMessages([messageId], auth.appId, auth.userId!);
  const mentions = await getMentionsForMessages([messageId], auth.appId);

    return c.json({
      ...formatMessage(row, {
        id: row.user_id,
        name: row.user_name,
        image: row.user_image,
      }, false, undefined, {
        requestUrl: c.req.url,
        auth: { appId: auth.appId, userId: auth.userId! },
      }),
      reactions: reactions[messageId] || [],
      mentions: mentions[messageId] || [],
    });
  }
);

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
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  zValidator('json', updateMessageSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const messageId = c.req.param('messageId')!;
    const body = c.req.valid('json');

    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Check ownership
    const checkResult = await db.query(
      `SELECT user_id FROM message
       WHERE id = $1 AND channel_id = $2 AND app_id = $3
         AND deleted_at IS NULL
         AND hard_deleted_at IS NULL`,
      [messageId, channelId, auth.appId]
    );

    if (checkResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }

    if (checkResult.rows[0].user_id !== auth.userId) {
      return c.json({ error: { message: 'Can only edit own messages' } }, 403);
    }

    const { message, row: updatedRow } = await db.transaction(async (client) => {
      const result = await client.query(
        `UPDATE message
         SET text = $4, edited_at = NOW()
         WHERE id = $1 AND channel_id = $2 AND app_id = $3
           AND deleted_at IS NULL
           AND hard_deleted_at IS NULL
         RETURNING *`,
        [messageId, channelId, auth.appId, body.text]
      );
      if (result.rows.length === 0) {
        throw new Error('MESSAGE_NOT_FOUND');
      }
      const updatedMessage = formatMessage(result.rows[0], auth.user!);

      await enqueueMessageRealtimeEvent(client, {
        appId: auth.appId,
        channelId,
        aggregateId: messageId,
        eventType: 'message.updated',
        payload: { channelId, message: updatedMessage },
        idempotencyKey: `message.updated:${auth.appId}:${messageId}:${result.rows[0].edited_at}`,
      });
      await enqueueSearchIndexOperationTx(client, auth.appId, messageId, 'update');

      return { message: updatedMessage, row: result.rows[0] };
    });

    triggerOutboxDrainSafely();
    void updateMessageIndex(toSearchableMessage(updatedRow, auth.user!, auth.appId)).catch((err) => {
      console.warn('Failed to update message search index:', err);
    });

    return c.json(formatMessage(updatedRow, auth.user!, false, undefined, {
      requestUrl: c.req.url,
      auth: { appId: auth.appId, userId: auth.userId! },
    }));
  }
);

/**
 * Delete message
 * DELETE /api/channels/:channelId/messages/:messageId
 */
messageRoutes.delete(
  '/:messageId',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;

  // Check ownership or admin
  const checkResult = await db.query(
    `SELECT m.user_id, cm.role
     FROM message m
     JOIN channel_member cm
       ON cm.app_id = m.app_id
      AND cm.channel_id = m.channel_id
      AND cm.user_id = $4
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

  let storageKeys: string[] = [];
  try {
    await db.transaction(async (client) => {
      const result = await softDeleteMessage(client, {
        appId: auth.appId,
        channelId,
        messageId,
        deletedBy: auth.userId!,
        reason: 'message_delete',
      });
      storageKeys = result.storageKeys;

      await enqueueMessageRealtimeEvent(client, {
        appId: auth.appId,
        channelId,
        aggregateId: messageId,
        eventType: 'message.deleted',
        payload: { channelId, messageId },
        idempotencyKey: `message.deleted:${auth.appId}:${messageId}:${result.deletedAt}`,
      });
      await enqueueSearchIndexOperationTx(client, auth.appId, messageId, 'delete');
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'LEGAL_HOLD_ACTIVE') {
      return c.json({ error: { message: 'Legal hold blocks deletion', code: 'LEGAL_HOLD_ACTIVE' } }, 423);
    }
    throw error;
  }

  triggerOutboxDrainSafely();
  void removeFromIndex(messageId, auth.appId).catch((err) => {
    console.warn('Failed to remove message from search index:', err);
  });
  void purgeStorageKeys(auth.appId, storageKeys).catch((err) => {
    console.warn('Failed to purge deleted message attachments:', err);
  });

    return c.json({ success: true });
  }
);

/**
 * Hard purge a message body and attachments.
 * DELETE /api/channels/:channelId/messages/:messageId/purge
 */
messageRoutes.delete(
  '/:messageId/purge',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const messageId = c.req.param('messageId')!;

    const checkResult = await db.query(
      `SELECT m.id, cm.role
       FROM message m
       JOIN channel_member cm
         ON cm.app_id = m.app_id
        AND cm.channel_id = m.channel_id
        AND cm.user_id = $4
       WHERE m.id = $1 AND m.channel_id = $2 AND m.app_id = $3`,
      [messageId, channelId, auth.appId, auth.userId]
    );

    if (checkResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }
    if (!['owner', 'admin', 'moderator'].includes(checkResult.rows[0].role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    try {
      const result = await hardPurgeMessage({
        appId: auth.appId,
        messageId,
        purgedBy: auth.userId!,
        reason: 'admin_hard_purge',
      });
      if (!result.purged) {
        return c.json({ error: { message: 'Message not found' } }, 404);
      }
      void purgeStorageKeys(auth.appId, result.storageKeys).catch((err) => {
        console.warn('Failed to purge hard-deleted message attachments:', err);
      });
      void removeFromIndex(messageId, auth.appId).catch((err) => {
        console.warn('Failed to remove purged message from search index:', err);
      });
      return c.json({ success: true, purged: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'LEGAL_HOLD_ACTIVE') {
        return c.json({ error: { message: 'Legal hold blocks purge', code: 'LEGAL_HOLD_ACTIVE' } }, 423);
      }
      throw error;
    }
  }
);

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
  requireScope('reaction:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.reactionWrite, (c) => ({ channelId: c.req.param('channelId')! })),
  zValidator('json', z.object({ emoji: z.string().min(1).max(50) })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const messageId = c.req.param('messageId')!;
    const { emoji } = c.req.valid('json');

    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Get message author info before inserting reaction
    const messageResult = await db.query(
      `SELECT user_id, text FROM message
       WHERE id = $1 AND app_id = $2 AND channel_id = $3`,
      [messageId, auth.appId, channelId]
    );

    if (messageResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }

    const messageAuthorId = messageResult.rows[0].user_id;
    const messagePreview = messageResult.rows[0].text;

    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO reaction (message_id, app_id, user_id, emoji)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [messageId, auth.appId, auth.userId, emoji]
      );

      await enqueueMessageRealtimeEvent(client, {
        appId: auth.appId,
        channelId,
        aggregateId: messageId,
        eventType: 'reaction.added',
        payload: {
          channelId,
          messageId,
          reaction: { type: emoji, userId: auth.userId, user: auth.user },
        },
        idempotencyKey: `reaction.added:${auth.appId}:${messageId}:${auth.userId}:${emoji}`,
      });
    });

    triggerOutboxDrainSafely();

    // Trigger Inngest notification event for reactions (don't notify self-reactions)
    if (messageAuthorId !== auth.userId) {
      sendInngestEvent({
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
messageRoutes.delete(
  '/:messageId/reactions/:emoji',
  requireUser,
  requireScope('reaction:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.reactionWrite, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;
  const emoji = decodeURIComponent(c.req.param('emoji')!);

  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel' } }, 403);
  }

  const messageResult = await db.query(
    `SELECT id FROM message WHERE id = $1 AND app_id = $2 AND channel_id = $3`,
    [messageId, auth.appId, channelId]
  );

  if (messageResult.rows.length === 0) {
    return c.json({ error: { message: 'Message not found' } }, 404);
  }

  await db.transaction(async (client) => {
    await client.query(
      `DELETE FROM reaction
       WHERE message_id = $1 AND app_id = $2 AND user_id = $3 AND emoji = $4`,
      [messageId, auth.appId, auth.userId, emoji]
    );

    await enqueueMessageRealtimeEvent(client, {
      appId: auth.appId,
      channelId,
      aggregateId: messageId,
      eventType: 'reaction.removed',
      payload: {
        channelId,
        messageId,
        reaction: { type: emoji, userId: auth.userId, user: auth.user },
      },
      idempotencyKey: `reaction.removed:${auth.appId}:${messageId}:${auth.userId}:${emoji}`,
    });
  });

  triggerOutboxDrainSafely();

    return c.json({ success: true });
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

function triggerOutboxDrainSafely(): void {
  try {
    triggerRealtimeOutboxDrain();
  } catch (err) {
    console.warn('Failed to trigger realtime outbox drain:', err);
  }
}

function toSearchableMessage(row: any, user: any, appId: string) {
  const attachments = Array.isArray(row.attachments) ? row.attachments : [];

  return {
    id: row.id,
    channelId: row.channel_id,
    appId,
    userId: user.id,
    userName: user.name || 'Unknown',
    text: row.deleted_at ? '' : row.text || '',
    createdAt: new Date(row.created_at).getTime(),
    attachmentTypes: attachments.map((attachment: any) => attachment.type).filter(Boolean),
  };
}

async function enqueueMessageRealtimeEvent(
  client: PoolClient,
  input: {
    appId: string;
    channelId: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
    idempotencyKey: string;
  }
): Promise<void> {
  await enqueueRealtimeEvent(client, {
    appId: input.appId,
    aggregateType: 'message',
    aggregateId: input.aggregateId,
    eventType: input.eventType,
    channels: [`chat:${input.appId}:${input.channelId}`],
    payload: {
      type: input.eventType,
      payload: input.payload,
    },
    idempotencyKey: input.idempotencyKey,
  });
}

function formatMessageUser(user: any, fallbackTimestamp: string) {
  return {
    id: user.id,
    name: user.name,
    image: user.image ?? user.image_url ?? null,
    custom: user.custom ?? user.custom_data ?? null,
    lastActiveAt: user.lastActiveAt ?? user.last_active_at ?? null,
    createdAt: user.createdAt ?? user.created_at ?? fallbackTimestamp,
    updatedAt: user.updatedAt ?? user.updated_at ?? user.createdAt ?? user.created_at ?? fallbackTimestamp,
  };
}

function formatMessage(
  row: any,
  user: any,
  isPinned: boolean = false,
  poll?: any,
  mediaContext?: { requestUrl: string; auth: MediaUrlAuth }
) {
  const createdAt = row.created_at;
  const updatedAt = row.edited_at || row.updated_at || row.created_at;
  const attachments = row.deleted_at
    ? []
    : mediaContext
    ? refreshAttachmentMediaUrls(mediaContext.requestUrl, mediaContext.auth, row.attachments || [])
    : row.attachments || [];

  return {
    id: row.id,
    channelId: row.channel_id,
    cid: row.channel_id,
    userId: user.id,
    type: row.deleted_at ? 'deleted' : 'regular',
    text: row.deleted_at ? null : row.text,
    seq: parseInt(row.seq, 10),
    clientMsgId: row.id, // Using ID as clientMsgId for now
    user: formatMessageUser(user, createdAt),
    attachments,
    parentId: row.parent_id,
    replyToId: row.reply_to_id,
    reactionCount: parseInt(row.reaction_count ?? '0', 10),
    replyCount: parseInt(row.reply_count ?? '0', 10),
    threadCount: row.reply_count || 0,
    status: row.status,
    pinned: isPinned,
    pinnedAt: row.pinned_at || null,
    pinnedBy: row.pinned_by || null,
    linkPreviews: row.deleted_at ? [] : (row.link_previews || []),
    pollId: row.poll_id || null,
    poll: poll || null,
    createdAt,
    updatedAt,
    deletedAt: row.deleted_at,
    hardDeletedAt: row.hard_deleted_at,
    // Legacy snake_case fields for backward compatibility
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: row.deleted_at,
    hard_deleted_at: row.hard_deleted_at,
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

async function getMentionsForMessages(
  messageIds: string[],
  appId: string
): Promise<Record<string, string[]>> {
  if (messageIds.length === 0) return {};

  const result = await db.query(
    `SELECT m.message_id, array_agg(m.mentioned_user_id) as mentioned_users
     FROM mention m
     WHERE m.message_id = ANY($1) AND m.app_id = $2
     GROUP BY m.message_id`,
    [messageIds, appId]
  );

  const mentions: Record<string, string[]> = {};

  for (const row of result.rows) {
    mentions[row.message_id] = row.mentioned_users || [];
  }

  return mentions;
}

async function getPinnedMessageIds(
  messageIds: string[],
  channelId: string,
  appId: string
): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();

  const result = await db.query(
    `SELECT message_id FROM pinned_message
     WHERE message_id = ANY($1) AND channel_id = $2 AND app_id = $3`,
    [messageIds, channelId, appId]
  );

  return new Set(result.rows.map((row) => row.message_id));
}

async function getPollsForMessages(
  pollIds: (string | null)[],
  appId: string,
  userId: string
): Promise<Record<string, any>> {
  const validPollIds = pollIds.filter((id): id is string => id !== null);
  if (validPollIds.length === 0) return {};

  // Get polls with their options
  const pollResult = await db.query(
    `SELECT p.id, p.question, p.options, p.is_anonymous, p.is_multi_choice,
            p.total_votes, p.ends_at, p.created_at
     FROM poll p
     WHERE p.id = ANY($1) AND p.app_id = $2`,
    [validPollIds, appId]
  );

  // Get user's votes for these polls
  const userVotesResult = await db.query(
    `SELECT poll_id, option_id FROM poll_vote
     WHERE poll_id = ANY($1) AND app_id = $2 AND user_id = $3`,
    [validPollIds, appId, userId]
  );

  const userVotesMap: Record<string, string[]> = {};
  for (const row of userVotesResult.rows) {
    if (!userVotesMap[row.poll_id]) {
      userVotesMap[row.poll_id] = [];
    }
    userVotesMap[row.poll_id].push(row.option_id);
  }

  // Get vote counts per option
  const voteCountsResult = await db.query(
    `SELECT poll_id, option_id, COUNT(*) as count
     FROM poll_vote
     WHERE poll_id = ANY($1) AND app_id = $2
     GROUP BY poll_id, option_id`,
    [validPollIds, appId]
  );

  const voteCountsMap: Record<string, Record<string, number>> = {};
  for (const row of voteCountsResult.rows) {
    if (!voteCountsMap[row.poll_id]) {
      voteCountsMap[row.poll_id] = {};
    }
    voteCountsMap[row.poll_id][row.option_id] = parseInt(row.count, 10);
  }

  const polls: Record<string, any> = {};
  for (const row of pollResult.rows) {
    const optionsWithCounts = row.options.map((opt: any) => ({
      ...opt,
      voteCount: voteCountsMap[row.id]?.[opt.id] || 0,
    }));

    polls[row.id] = {
      id: row.id,
      question: row.question,
      options: optionsWithCounts,
      isAnonymous: row.is_anonymous,
      isMultiChoice: row.is_multi_choice,
      totalVotes: row.total_votes || 0,
      userVotes: userVotesMap[row.id] || [],
      endsAt: row.ends_at,
      createdAt: row.created_at,
    };
  }

  return polls;
}

// ============================================================================
// Work Stream 10: Pinned Messages
// ============================================================================

/**
 * Pin a message
 * POST /api/messages/:messageId/pin
 */
messageRoutes.post(
  '/:messageId/pin',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;

  // Get channel type and user's role
  const memberCheck = await db.query(
    `SELECT cm.role, c.type as channel_type
     FROM channel_member cm
     JOIN channel c ON cm.channel_id = c.id AND cm.app_id = c.app_id
     WHERE cm.channel_id = $1 AND cm.app_id = $2 AND cm.user_id = $3`,
    [channelId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a channel member' } }, 403);
  }

  const userRole = memberCheck.rows[0].role;
  const channelType = memberCheck.rows[0].channel_type;
  const isDMOrGroupDM = channelType === 'messaging';
  const isChannelAdmin = ['owner', 'admin', 'moderator'].includes(userRole);

  // Allow pin if: channel admin OR participant in DM/group DM
  if (!isChannelAdmin && !isDMOrGroupDM) {
    return c.json({ error: { message: 'Only admins can pin messages' } }, 403);
  }

  // Check pin limit (max 25 pins per channel)
  const pinCount = await db.query(
    `SELECT COUNT(*) as count FROM pinned_message WHERE channel_id = $1 AND app_id = $2`,
    [channelId, auth.appId]
  );

  if (parseInt(pinCount.rows[0].count) >= 25) {
    return c.json({ error: { message: 'Pin limit reached (max 25 pins per channel)' } }, 400);
  }

  // Verify message exists in this channel
  const messageCheck = await db.query(
    `SELECT id FROM message WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
    [messageId, channelId, auth.appId]
  );

  if (messageCheck.rows.length === 0) {
    return c.json({ error: { message: 'Message not found' } }, 404);
  }

  await db.transaction(async (client) => {
    await client.query(
      `INSERT INTO pinned_message (channel_id, message_id, app_id, pinned_by, pinned_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (channel_id, message_id) DO NOTHING`,
      [channelId, messageId, auth.appId, auth.userId]
    );

    await enqueueMessageRealtimeEvent(client, {
      appId: auth.appId,
      channelId,
      aggregateId: messageId,
      eventType: 'message.updated',
      payload: {
        channelId,
        message: { id: messageId, channelId, pinned: true },
      },
      idempotencyKey: `message.pinned:${auth.appId}:${messageId}`,
    });
  });

  triggerOutboxDrainSafely();

    return c.json({ success: true });
  }
);

/**
 * Unpin a message
 * DELETE /api/messages/:messageId/pin
 */
messageRoutes.delete(
  '/:messageId/pin',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;

  // Get channel type and user's role
  const memberCheck = await db.query(
    `SELECT cm.role, c.type as channel_type
     FROM channel_member cm
     JOIN channel c ON cm.channel_id = c.id AND cm.app_id = c.app_id
     WHERE cm.channel_id = $1 AND cm.app_id = $2 AND cm.user_id = $3`,
    [channelId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a channel member' } }, 403);
  }

  const userRole = memberCheck.rows[0].role;
  const channelType = memberCheck.rows[0].channel_type;
  const isDMOrGroupDM = channelType === 'messaging';
  const isChannelAdmin = ['owner', 'admin', 'moderator'].includes(userRole);

  // Allow unpin if: channel admin OR participant in DM/group DM
  if (!isChannelAdmin && !isDMOrGroupDM) {
    return c.json({ error: { message: 'Only admins can unpin messages' } }, 403);
  }

  await db.transaction(async (client) => {
    await client.query(
      `DELETE FROM pinned_message WHERE channel_id = $1 AND message_id = $2 AND app_id = $3`,
      [channelId, messageId, auth.appId]
    );

    await enqueueMessageRealtimeEvent(client, {
      appId: auth.appId,
      channelId,
      aggregateId: messageId,
      eventType: 'message.updated',
      payload: {
        channelId,
        message: { id: messageId, channelId, pinned: false },
      },
      idempotencyKey: `message.unpinned:${auth.appId}:${messageId}`,
    });
  });

  triggerOutboxDrainSafely();

    return c.json({ success: true });
  }
);

/**
 * Get pinned messages for a channel
 * GET /api/channels/:channelId/pins
 */
messageRoutes.get(
  '/pins',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a channel member' } }, 403);
  }

  const result = await db.query(
    `SELECT m.*, pm.pinned_by, pm.pinned_at, u.name as user_name, u.image_url as user_image
     FROM pinned_message pm
     JOIN message m ON pm.message_id = m.id AND pm.app_id = m.app_id
     JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
     WHERE pm.channel_id = $1 AND pm.app_id = $2
     ORDER BY pm.pinned_at DESC`,
    [channelId, auth.appId]
  );

  const messages = result.rows.map((row) => ({
    id: row.id,
    text: row.text,
    attachments: refreshAttachmentMediaUrls(c.req.url, {
      appId: auth.appId,
      userId: auth.userId!,
    }, row.attachments),
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
  }
);

// ============================================================================
// Work Stream 11: Saved Messages
// ============================================================================

/**
 * Save/bookmark a message
 * POST /api/messages/:messageId/save
 */
messageRoutes.post(
  '/:messageId/save',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;

  // Verify message exists and user has access
  const messageCheck = await db.query(
    `SELECT m.id
     FROM message m
     JOIN channel_member cm
       ON cm.app_id = m.app_id
      AND cm.channel_id = m.channel_id
      AND cm.user_id = $3
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
  }
);

/**
 * Unsave/remove bookmark from a message
 * DELETE /api/messages/:messageId/save
 */
messageRoutes.delete(
  '/:messageId/save',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageMutation, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const messageId = c.req.param('messageId')!;

  await db.query(
    `DELETE FROM saved_message WHERE app_id = $1 AND user_id = $2 AND message_id = $3`,
    [auth.appId, auth.userId, messageId]
  );

    return c.json({ success: true });
  }
);

/**
 * Get user's saved messages
 * GET /api/users/me/saved
 */
messageRoutes.get(
  '/me/saved',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory),
  async (c) => {
  const auth = c.get('auth');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await db.query(
    `SELECT m.*, sm.saved_at, u.name as user_name, u.image_url as user_image,
            c.name as channel_name, c.id as channel_id
     FROM saved_message sm
     JOIN message m ON sm.message_id = m.id AND sm.app_id = m.app_id
     JOIN channel_member cm
       ON cm.app_id = m.app_id
      AND cm.channel_id = m.channel_id
      AND cm.user_id = sm.user_id
     JOIN app_user u ON m.app_id = u.app_id AND m.user_id = u.id
     JOIN channel c ON m.app_id = c.app_id AND m.channel_id = c.id
     WHERE sm.app_id = $1 AND sm.user_id = $2
     ORDER BY sm.saved_at DESC
     LIMIT $3 OFFSET $4`,
    [auth.appId, auth.userId, limit, offset]
  );

  const messages = result.rows.map((row) => ({
    id: row.id,
    text: row.text,
    attachments: refreshAttachmentMediaUrls(c.req.url, {
      appId: auth.appId,
      userId: auth.userId!,
    }, row.attachments),
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
  }
);
