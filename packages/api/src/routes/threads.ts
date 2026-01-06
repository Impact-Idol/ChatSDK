/**
 * Thread Routes
 * Threaded conversation support
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { centrifugo, getCentrifugo } from '../services/centrifugo';
import { inngest } from '../inngest';

export const threadRoutes = new Hono();

/**
 * Get thread replies for a parent message
 * GET /api/channels/:channelId/messages/:messageId/thread
 */
threadRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const before = c.req.query('before');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get parent message
  const parentResult = await db.query(
    `SELECT m.id, m.seq, m.text, m.created_at, m.reply_count,
            u.id as user_id, u.name as user_name, u.image_url as user_image
     FROM message m
     JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
     WHERE m.id = $1 AND m.channel_id = $2`,
    [messageId, channelId]
  );

  if (parentResult.rows.length === 0) {
    return c.json({ error: { message: 'Parent message not found', code: 'NOT_FOUND' } }, 404);
  }

  const parent = parentResult.rows[0];

  // Build query for replies
  let query = `
    SELECT m.id, m.seq, m.text, m.attachments, m.created_at, m.edited_at, m.deleted_at,
           m.status, m.parent_id,
           u.id as user_id, u.name as user_name, u.image_url as user_image
    FROM message m
    JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
    WHERE m.parent_id = $1 AND m.channel_id = $2
  `;

  const params: any[] = [messageId, channelId];

  if (before) {
    query += ` AND m.created_at < $3`;
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
    text: row.text,
    attachments: row.attachments,
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
      text: parent.text,
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
});

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
  zValidator('json', replySchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const parentMessageId = c.req.param('messageId');
    const body = c.req.valid('json');

    // Verify membership
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
      [channelId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
    }

    // Verify parent message exists
    const parentCheck = await db.query(
      `SELECT id, user_id FROM message WHERE id = $1 AND channel_id = $2`,
      [parentMessageId, channelId]
    );

    if (parentCheck.rows.length === 0) {
      return c.json({ error: { message: 'Parent message not found', code: 'NOT_FOUND' } }, 404);
    }

    // Get next sequence number
    const seqResult = await db.query(`SELECT next_channel_seq($1) as seq`, [channelId]);
    const seq = seqResult.rows[0].seq;

    // Create reply message
    const messageId = body.clientMsgId || crypto.randomUUID();
    const result = await db.query(
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
        JSON.stringify(body.attachments || []),
        parentMessageId,
      ]
    );

    // Increment reply count on parent
    await db.query(
      `UPDATE message SET reply_count = reply_count + 1 WHERE id = $1`,
      [parentMessageId]
    );

    const reply = {
      id: result.rows[0].id,
      cid: channelId,
      seq: result.rows[0].seq,
      type: 'regular',
      text: body.text,
      attachments: body.attachments || [],
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

    // Publish to real-time
    await centrifugo.publishMessage(auth.appId, channelId, reply);

    // Also publish thread-specific event
    await getCentrifugo().publish(`chat:${auth.appId}:${channelId}`, {
      type: 'thread.reply',
      payload: {
        channelId,
        parentId: parentMessageId,
        message: reply,
      },
    });

    // Get channel info and thread participants for notification
    const [channelInfo, participantsResult] = await Promise.all([
      db.query(
        `SELECT name FROM channel WHERE id = $1 AND app_id = $2`,
        [channelId, auth.appId]
      ),
      db.query(
        `SELECT DISTINCT user_id FROM message WHERE parent_id = $1 OR id = $1`,
        [parentMessageId]
      ),
    ]);

    const channelName = channelInfo.rows[0]?.name || 'Thread';
    const participantIds = participantsResult.rows.map((r) => r.user_id);

    // Trigger Inngest notification event for thread replies
    inngest.send({
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

    return c.json(reply, 201);
  }
);

/**
 * Get thread participants
 * GET /api/channels/:channelId/messages/:messageId/thread/participants
 */
threadRoutes.get('/participants', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const messageId = c.req.param('messageId');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Get unique participants in thread
  const result = await db.query(
    `SELECT DISTINCT u.id, u.name, u.image_url,
            (SELECT COUNT(*) FROM message WHERE parent_id = $1 AND user_id = u.id) as reply_count
     FROM message m
     JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
     WHERE m.parent_id = $1 OR m.id = $1
     ORDER BY reply_count DESC`,
    [messageId]
  );

  return c.json({
    participants: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image_url,
      replyCount: parseInt(row.reply_count, 10),
    })),
  });
});
