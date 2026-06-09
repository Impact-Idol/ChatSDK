/**
 * Thread Routes
 * Threaded conversation support
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireScope, requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { sendInngestEvent } from '../inngest';
import { isChannelMember } from '../services/authorization';
import { enqueueRealtimeEvent, triggerRealtimeOutboxDrain } from '../services/realtime-outbox';
import { enqueueSearchIndexOperationTx } from '../services/search';
import { prepareMessageAttachments, refreshAttachmentMediaUrls } from '../services/media-urls';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';

export const threadRoutes = new Hono();

/**
 * Get thread replies for a parent message
 * GET /api/channels/:channelId/messages/:messageId/thread
 */
threadRoutes.get(
  '/',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const before = c.req.query('before');

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get parent message
  const parentResult = await db.query(
    `SELECT m.id, m.seq, m.text, m.deleted_at, m.hard_deleted_at, m.created_at, m.reply_count,
            u.id as user_id, u.name as user_name, u.image_url as user_image
     FROM message m
     JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
     WHERE m.id = $1 AND m.channel_id = $2 AND m.app_id = $3
       AND m.hard_deleted_at IS NULL`,
    [messageId, channelId, auth.appId]
  );

  if (parentResult.rows.length === 0) {
    return c.json({ error: { message: 'Parent message not found', code: 'NOT_FOUND' } }, 404);
  }

  const parent = parentResult.rows[0];

  // Build query for replies
  let query = `
    SELECT m.id, m.seq, m.text, m.attachments, m.created_at, m.edited_at, m.deleted_at,
           m.status, m.parent_id, m.hard_deleted_at,
           u.id as user_id, u.name as user_name, u.image_url as user_image
    FROM message m
    JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
    WHERE m.parent_id = $1 AND m.channel_id = $2 AND m.app_id = $3
      AND m.hard_deleted_at IS NULL
  `;

  const params: any[] = [messageId, channelId, auth.appId];

  if (before) {
    query += ` AND m.created_at < $4`;
    params.push(before);
  }

  query += ` ORDER BY m.created_at ASC LIMIT $${params.length + 1}`;
  params.push(limit + 1);

  const result = await db.query(query, params);

  const hasMore = result.rows.length > limit;
  const replies = result.rows.slice(0, limit).map((row) => ({
    id: row.id,
    cid: channelId,
    seq: row.seq,
    type: row.deleted_at ? 'deleted' : 'regular',
    text: row.deleted_at ? null : row.text,
    attachments: row.deleted_at ? [] : refreshAttachmentMediaUrls(c.req.url, {
      appId: auth.appId,
      userId: auth.userId!,
    }, row.attachments),
    user: {
      id: row.user_id,
      name: row.user_name,
      image: row.user_image,
    },
    parentId: row.parent_id,
    status: row.status,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
  }));

    return c.json({
      parent: {
        id: parent.id,
        seq: parent.seq,
        type: parent.deleted_at ? 'deleted' : 'regular',
        text: parent.deleted_at ? null : parent.text,
        user: {
          id: parent.user_id,
          name: parent.user_name,
          image: parent.user_image,
        },
        replyCount: parent.reply_count,
        createdAt: parent.created_at,
      },
      replies,
      hasMore,
    });
  }
);

/**
 * Reply to a message (create thread reply)
 * POST /api/channels/:channelId/messages/:messageId/thread
 */
const replySchema = z.object({
  text: z.string().min(1).max(10000),
  attachments: z.array(z.any()).optional(),
  clientMsgId: z.string().uuid().optional(),
});

threadRoutes.post(
  '/',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.messageSend, (c) => ({ channelId: c.req.param('channelId')! })),
  zValidator('json', replySchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const parentMessageId = c.req.param('messageId')!;
    const body = c.req.valid('json');

    // Verify membership
    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
    }

    // Verify parent message exists
    const parentCheck = await db.query(
      `SELECT id, user_id FROM message
       WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
      [parentMessageId, channelId, auth.appId]
    );

    if (parentCheck.rows.length === 0) {
      return c.json({ error: { message: 'Parent message not found', code: 'NOT_FOUND' } }, 404);
    }

    let storedAttachments = body.attachments || [];
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

    const reply = await db.transaction(async (client) => {
      const seqResult = await client.query(`SELECT next_channel_seq($1) as seq`, [channelId]);
      const seq = seqResult.rows[0].seq;
      const messageId = body.clientMsgId || crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO message (id, channel_id, app_id, user_id, seq, text, attachments, parent_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent')
         RETURNING id, seq, created_at`,
        [
          messageId,
          channelId,
          auth.appId,
          auth.userId,
          seq,
          body.text,
          JSON.stringify(storedAttachments),
          parentMessageId,
        ]
      );

      await client.query(
        `UPDATE message SET reply_count = reply_count + 1
         WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
        [parentMessageId, channelId, auth.appId]
      );

      const createdReply = {
        id: result.rows[0].id,
        cid: channelId,
        seq: result.rows[0].seq,
        type: 'regular',
        text: body.text,
        attachments: storedAttachments,
        user: {
          id: auth.userId!,
          name: auth.user?.name,
          image: auth.user?.image,
        },
        parentId: parentMessageId,
        status: 'sent',
        createdAt: result.rows[0].created_at,
        clientMsgId: body.clientMsgId,
      };

      await enqueueRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'message',
        aggregateId: createdReply.id,
        eventType: 'message.new',
        channels: [`chat:${auth.appId}:${channelId}`],
        payload: {
          type: 'message.new',
          payload: { channelId, message: createdReply },
        },
        idempotencyKey: `message.new:${auth.appId}:${createdReply.id}`,
      });

      await enqueueRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'message',
        aggregateId: createdReply.id,
        eventType: 'thread.reply',
        channels: [`chat:${auth.appId}:${channelId}`],
        payload: {
          type: 'thread.reply',
          payload: {
            channelId,
            parentId: parentMessageId,
            message: createdReply,
          },
        },
        idempotencyKey: `thread.reply:${auth.appId}:${createdReply.id}`,
      });
      await enqueueSearchIndexOperationTx(client, auth.appId, createdReply.id, 'index');

      return createdReply;
    });

    try {
      triggerRealtimeOutboxDrain();
    } catch (err) {
      console.warn('Failed to trigger realtime outbox drain:', err);
    }

    let channelName = 'Thread';
    let participantIds: string[] = [];
    try {
      const [channelInfo, participantsResult] = await Promise.all([
        db.query(
          `SELECT name FROM channel WHERE id = $1 AND app_id = $2`,
          [channelId, auth.appId]
        ),
        db.query(
          `SELECT DISTINCT user_id FROM message
           WHERE app_id = $1 AND channel_id = $2 AND (parent_id = $3 OR id = $3)`,
          [auth.appId, channelId, parentMessageId]
        ),
      ]);

      channelName = channelInfo.rows[0]?.name || 'Thread';
      participantIds = participantsResult.rows.map((r) => r.user_id);
    } catch (err) {
      console.warn('Failed to process post-commit thread side effects:', err);
    }

    // Trigger Inngest notification event for thread replies
    sendInngestEvent({
      name: 'chat/thread.reply',
      data: {
        threadId: parentMessageId,
        channelId,
        channelName,
        replierId: auth.userId!,
        replierName: auth.user?.name || 'Unknown',
        replyContent: body.text,
        threadParticipantIds: participantIds,
      },
    }).catch((err) => {
      console.warn('Failed to send thread reply Inngest event:', err);
    });

    return c.json({
      ...reply,
      attachments: refreshAttachmentMediaUrls(c.req.url, {
        appId: auth.appId,
        userId: auth.userId!,
      }, reply.attachments),
    }, 201);
  }
);

/**
 * Get thread participants
 * GET /api/channels/:channelId/messages/:messageId/thread/participants
 */
threadRoutes.get(
  '/participants',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId')!;

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get unique participants in thread
  const result = await db.query(
    `SELECT DISTINCT u.id, u.name, u.image_url,
            (SELECT COUNT(*) FROM message
             WHERE app_id = $2 AND channel_id = $3 AND parent_id = $1 AND user_id = u.id) as reply_count
     FROM message m
     JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
     WHERE m.app_id = $2 AND m.channel_id = $3 AND (m.parent_id = $1 OR m.id = $1)
     ORDER BY reply_count DESC`,
    [messageId, auth.appId, channelId]
  );

    return c.json({
      participants: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        image: row.image_url,
        replyCount: parseInt(row.reply_count, 10),
      })),
    });
  }
);
