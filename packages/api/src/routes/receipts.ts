/**
 * Read Receipts Routes
 * Track message read status per user
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireScope, requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { isChannelMember } from '../services/authorization';
import {
  chatChannel,
  enqueueDomainRealtimeEvent,
  triggerRealtimeOutboxDrainSafely,
} from '../services/realtime-events';

export const receiptRoutes = new Hono();

/**
 * Mark messages as read
 * POST /api/channels/:channelId/read
 */
receiptRoutes.post(
  '/',
  requireUser,
  requireScope('chat:write'),
  zValidator(
    'json',
    z.object({
      messageId: z.string().uuid(), // Last read message ID
    })
  ),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const { messageId } = c.req.valid('json');

    // Verify membership
    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
    }

    // Get the message to find its seq
    const messageResult = await db.query(
      `SELECT seq, created_at FROM message
       WHERE id = $1 AND channel_id = $2 AND app_id = $3`,
      [messageId, channelId, auth.appId]
    );

    if (messageResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found', code: 'NOT_FOUND' } }, 404);
    }

    const message = messageResult.rows[0];
    const readAt = new Date().toISOString();

    await db.transaction(async (client) => {
      await client.query(
        `UPDATE channel_member
         SET last_read_message_id = CASE
               WHEN COALESCE(last_read_seq, 0) <= $4 THEN $3
               ELSE last_read_message_id
             END,
             last_read_seq = GREATEST(COALESCE(last_read_seq, 0), $4),
             unread_count = CASE
               WHEN COALESCE(last_read_seq, 0) <= $4 THEN 0
               ELSE unread_count
             END
         WHERE channel_id = $1 AND app_id = $2 AND user_id = $5`,
        [channelId, auth.appId, messageId, message.seq, auth.userId]
      );

      await client.query(
        `INSERT INTO read_receipt (message_id, app_id, user_id, read_at)
         SELECT m.id, $3, $2, $5
         FROM message m
         WHERE m.channel_id = $1
           AND m.app_id = $3
           AND m.created_at <= $4
           AND m.user_id != $2
         ON CONFLICT DO NOTHING`,
        [channelId, auth.userId, auth.appId, message.created_at, readAt]
      );

      await client.query(
        `UPDATE user_message
         SET flags = flags | 1
         WHERE app_id = $1
           AND user_id = $2
           AND message_id IN (
             SELECT id FROM message
             WHERE channel_id = $3 AND app_id = $1 AND created_at <= $4
           )`,
        [auth.appId, auth.userId, channelId, message.created_at]
      );

      await enqueueDomainRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'read_receipt',
        aggregateId: messageId,
        eventType: 'read_receipt',
        channels: [chatChannel(auth.appId, channelId)],
        payload: {
          channelId,
          userId: auth.userId,
          userName: auth.user?.name,
          messageId,
          readAt,
        },
        idempotencyKey: `read_receipt:${auth.appId}:${channelId}:${auth.userId}:${messageId}`,
      });
    });

    triggerRealtimeOutboxDrainSafely();

    return c.json({ success: true, lastReadMessageId: messageId });
  }
);

/**
 * Get read receipts for a message
 * GET /api/channels/:channelId/messages/:messageId/receipts
 */
receiptRoutes.get('/messages/:messageId/receipts', requireUser, requireScope('chat:read'), async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const messageId = c.req.param('messageId');

  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get all users who have read this message
  const result = await db.query(
    `SELECT r.user_id, r.read_at,
            u.name as user_name, u.image_url as user_image
     FROM read_receipt r
     JOIN message m ON m.id = r.message_id AND m.app_id = r.app_id
     JOIN app_user u ON r.app_id = u.app_id AND r.user_id = u.id
     WHERE r.message_id = $1 AND r.app_id = $2 AND m.channel_id = $3
     ORDER BY r.read_at DESC`,
    [messageId, auth.appId, channelId]
  );

  // Get total channel members for calculating unread
  const memberCount = await db.query(
    `SELECT COUNT(*) as count FROM channel_member WHERE channel_id = $1 AND app_id = $2`,
    [channelId, auth.appId]
  );

  const readBy = result.rows.map((row) => ({
    userId: row.user_id,
    name: row.user_name,
    image: row.user_image,
    readAt: row.read_at,
  }));

  return c.json({
    readBy,
    readCount: readBy.length,
    totalMembers: parseInt(memberCount.rows[0].count, 10),
  });
});

/**
 * Get read status for multiple messages
 * POST /api/channels/:channelId/receipts/query
 */
receiptRoutes.post(
  '/query',
  requireUser,
  requireScope('chat:read'),
  zValidator(
    'json',
    z.object({
      messageIds: z.array(z.string().uuid()).max(100),
    })
  ),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId')!;
    const { messageIds } = c.req.valid('json');

    if (messageIds.length === 0) {
      return c.json({ receipts: {} });
    }

    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
    }

    // Get read counts for each message
    const result = await db.query(
      `SELECT r.message_id,
              COUNT(*) as read_count,
              array_agg(json_build_object(
                'userId', r.user_id,
                'name', u.name,
                'image', u.image_url,
                'readAt', r.read_at
              )) as readers
       FROM read_receipt r
       JOIN message m ON m.id = r.message_id AND m.app_id = r.app_id
       JOIN app_user u ON r.app_id = u.app_id AND r.user_id = u.id
       WHERE r.message_id = ANY($1) AND r.app_id = $2 AND m.channel_id = $3
       GROUP BY r.message_id`,
      [messageIds, auth.appId, channelId]
    );

    const receipts: Record<string, any> = {};
    for (const row of result.rows) {
      receipts[row.message_id] = {
        readCount: parseInt(row.read_count, 10),
        readers: row.readers.slice(0, 10), // Limit to 10 readers
      };
    }

    // Fill in missing messages with empty receipts
    for (const id of messageIds) {
      if (!receipts[id]) {
        receipts[id] = { readCount: 0, readers: [] };
      }
    }

    return c.json({ receipts });
  }
);

/**
 * Get channel member read status (who has read up to which message)
 * GET /api/channels/:channelId/read-status
 */
receiptRoutes.get('/read-status', requireUser, requireScope('chat:read'), async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;

  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  const result = await db.query(
    `SELECT cm.user_id, cm.last_read_message_id, cm.last_read_seq,
            u.name as user_name, u.image_url as user_image
     FROM channel_member cm
     JOIN app_user u ON cm.app_id = u.app_id AND cm.user_id = u.id
     WHERE cm.channel_id = $1 AND cm.app_id = $2`,
    [channelId, auth.appId]
  );

  const members = result.rows.map((row) => ({
    userId: row.user_id,
    name: row.user_name,
    image: row.user_image,
    lastReadMessageId: row.last_read_message_id,
    lastReadSeq: row.last_read_seq,
  }));

  return c.json({ members });
});
