/**
 * Mentions Routes
 * Handle @user mentions in messages
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';

export const mentionRoutes = new Hono();

/**
 * Get mentions for the current user
 * GET /api/mentions
 */
mentionRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const before = c.req.query('before');
  const unreadOnly = c.req.query('unread') === 'true';

  let query = `
    SELECT m.id as mention_id, m.created_at as mentioned_at,
           msg.id as message_id, msg.channel_id, msg.text, msg.created_at as message_created_at,
           mentioner.id as mentioner_id, mentioner.name as mentioner_name, mentioner.image_url as mentioner_image,
           ch.name as channel_name, ch.type as channel_type,
           um.flags
    FROM mention m
    JOIN message msg ON m.message_id = msg.id
    JOIN app_user mentioner ON m.app_id = mentioner.app_id AND m.mentioner_user_id = mentioner.id
    JOIN channel ch ON msg.channel_id = ch.id
    LEFT JOIN user_message um ON um.message_id = msg.id AND um.user_id = $2
    WHERE m.app_id = $1 AND m.mentioned_user_id = $2
  `;

  const params: any[] = [auth.appId, auth.userId];

  if (unreadOnly) {
    query += ` AND (um.flags IS NULL OR (um.flags & 1) = 0)`;
  }

  if (before) {
    query += ` AND m.created_at < $${params.length + 1}`;
    params.push(before);
  }

  query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);

  const result = await db.query(query, params);

  const hasMore = result.rows.length > limit;
  const mentions = result.rows.slice(0, limit).map((row) => ({
    id: row.mention_id,
    mentionedAt: row.mentioned_at,
    message: {
      id: row.message_id,
      channelId: row.channel_id,
      text: row.text,
      createdAt: row.message_created_at,
    },
    mentioner: {
      id: row.mentioner_id,
      name: row.mentioner_name,
      image: row.mentioner_image,
    },
    channel: {
      id: row.channel_id,
      name: row.channel_name,
      type: row.channel_type,
    },
    read: row.flags ? (row.flags & 1) !== 0 : false,
  }));

  return c.json({ mentions, hasMore });
});

/**
 * Get unread mention count
 * GET /api/mentions/unread-count
 */
mentionRoutes.get('/unread-count', requireUser, async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM mention m
     JOIN message msg ON m.message_id = msg.id
     LEFT JOIN user_message um ON um.message_id = msg.id AND um.user_id = $2
     WHERE m.app_id = $1
       AND m.mentioned_user_id = $2
       AND (um.flags IS NULL OR (um.flags & 1) = 0)`,
    [auth.appId, auth.userId]
  );

  return c.json({ count: parseInt(result.rows[0].count, 10) });
});

/**
 * Search for users to mention
 * GET /api/mentions/search?q=query&channelId=xxx
 */
mentionRoutes.get('/search', requireUser, async (c) => {
  const auth = c.get('auth');
  const query = c.req.query('q') || '';
  const channelId = c.req.query('channelId');
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);

  if (query.length < 1) {
    return c.json({ users: [] });
  }

  let sqlQuery: string;
  let params: any[];

  if (channelId) {
    // Search within channel members only
    sqlQuery = `
      SELECT u.id, u.name, u.image_url as image
      FROM app_user u
      JOIN channel_member cm ON cm.app_id = u.app_id AND cm.user_id = u.id
      WHERE u.app_id = $1
        AND cm.channel_id = $2
        AND u.id != $3
        AND (u.name ILIKE $4 OR u.id ILIKE $4)
      ORDER BY
        CASE WHEN u.name ILIKE $5 THEN 0 ELSE 1 END,
        u.name
      LIMIT $6
    `;
    params = [auth.appId, channelId, auth.userId, `%${query}%`, `${query}%`, limit];
  } else {
    // Search all app users
    sqlQuery = `
      SELECT u.id, u.name, u.image_url as image
      FROM app_user u
      WHERE u.app_id = $1
        AND u.id != $2
        AND (u.name ILIKE $3 OR u.id ILIKE $3)
      ORDER BY
        CASE WHEN u.name ILIKE $4 THEN 0 ELSE 1 END,
        u.name
      LIMIT $5
    `;
    params = [auth.appId, auth.userId, `%${query}%`, `${query}%`, limit];
  }

  const result = await db.query(sqlQuery, params);

  return c.json({
    users: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
    })),
  });
});

/**
 * Store mentions when a message is sent
 * This is called internally from the message route
 */
export async function storeMentions(
  messageId: string,
  channelId: string,
  appId: string,
  senderUserId: string,
  text: string
): Promise<string[]> {
  // Extract @mentions from text
  // Supports @username and @[User Name] formats
  const mentionPatterns = [
    /@(\w+)/g, // @username
    /@\[([^\]]+)\]/g, // @[User Name]
  ];

  const mentionedNames: Set<string> = new Set();

  for (const pattern of mentionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      mentionedNames.add(match[1]);
    }
  }

  if (mentionedNames.size === 0) {
    return [];
  }

  // Find users by name or ID within the channel
  const result = await db.query(
    `SELECT u.id, u.name
     FROM app_user u
     JOIN channel_member cm ON cm.app_id = u.app_id AND cm.user_id = u.id
     WHERE u.app_id = $1
       AND cm.channel_id = $2
       AND u.id != $3
       AND (u.name = ANY($4) OR u.id = ANY($4))`,
    [appId, channelId, senderUserId, Array.from(mentionedNames)]
  );

  const mentionedUserIds: string[] = [];

  // Store mentions
  for (const user of result.rows) {
    await db.query(
      `INSERT INTO mention (message_id, app_id, mentioned_user_id, mentioner_user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [messageId, appId, user.id, senderUserId]
    );

    // Set mentioned flag in user_message
    await db.query(
      `UPDATE user_message
       SET flags = flags | 2
       WHERE message_id = $1 AND app_id = $2 AND user_id = $3`,
      [messageId, appId, user.id]
    );

    mentionedUserIds.push(user.id);
  }

  return mentionedUserIds;
}
