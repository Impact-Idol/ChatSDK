/**
 * Custom Emoji Support Routes
 * Work Stream 18 - TIER 3
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';
import { uploadFile } from '../services/storage';

export const emojiRoutes = new Hono();

const createEmojiSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/), // Only lowercase, numbers, underscore, hyphen
  category: z.enum(['custom', 'brand', 'team']).default('custom'),
});

/**
 * Upload custom emoji
 * POST /api/emoji
 */
emojiRoutes.post(
  '/',
  requireUser,
  async (c) => {
    const auth = c.get('auth');

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspaceId') as string;
    const name = formData.get('name') as string;
    const category = (formData.get('category') as string) || 'custom';

    if (!file) {
      return c.json({ error: { message: 'No file provided' } }, 400);
    }

    if (!workspaceId || !name) {
      return c.json({ error: { message: 'workspaceId and name are required' } }, 400);
    }

    // Validate workspace exists
    const workspaceResult = await db.query(
      'SELECT id FROM workspace WHERE id = $1 AND app_id = $2',
      [workspaceId, auth.appId]
    );

    if (workspaceResult.rows.length === 0) {
      return c.json({ error: { message: 'Workspace not found' } }, 404);
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return c.json({ error: { message: 'Only image files are supported' } }, 400);
    }

    // Validate file size (max 1MB for emoji)
    if (file.size > 1024 * 1024) {
      return c.json({ error: { message: 'File size must be less than 1MB' } }, 400);
    }

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(buffer, {
      contentType: file.type,
      filename: `emoji_${name}_${Date.now()}.${file.type.split('/')[1]}`,
      channelId: workspaceId, // Use workspace ID as pseudo-channel ID
      userId: auth.userId,
      metadata: {
        'emoji-name': name,
        'workspace-id': workspaceId,
      },
    });

    // Create emoji record
    const result = await db.query(
      `INSERT INTO custom_emoji
       (app_id, workspace_id, name, image_url, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (app_id, workspace_id, name)
       DO UPDATE SET
         image_url = EXCLUDED.image_url,
         category = EXCLUDED.category,
         created_at = NOW()
       RETURNING *`,
      [auth.appId, workspaceId, name, uploaded.url, category, auth.userId]
    );

    const emoji = result.rows[0];

    return c.json({
      id: emoji.id,
      workspaceId: emoji.workspace_id,
      name: emoji.name,
      imageUrl: emoji.image_url,
      category: emoji.category,
      createdBy: emoji.created_by,
      usageCount: emoji.usage_count,
      createdAt: emoji.created_at,
    }, 201);
  }
);

/**
 * List custom emoji for workspace
 * GET /api/emoji
 */
emojiRoutes.get(
  '/',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const workspaceId = c.req.query('workspaceId');
    const category = c.req.query('category');

    if (!workspaceId) {
      return c.json({ error: { message: 'workspaceId is required' } }, 400);
    }

    let query = `
      SELECT e.*, u.name as created_by_name
      FROM custom_emoji e
      LEFT JOIN app_user u ON e.created_by = u.id AND e.app_id = u.app_id
      WHERE e.app_id = $1 AND e.workspace_id = $2
    `;
    const params: any[] = [auth.appId, workspaceId];
    let paramCount = 3;

    if (category) {
      query += ` AND e.category = $${paramCount++}`;
      params.push(category);
    }

    query += ' ORDER BY e.usage_count DESC, e.created_at DESC';

    const result = await db.query(query, params);

    return c.json({
      emoji: result.rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        imageUrl: row.image_url,
        category: row.category,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        usageCount: row.usage_count,
        createdAt: row.created_at,
      })),
    });
  }
);

/**
 * Get emoji by ID
 * GET /api/emoji/:id
 */
emojiRoutes.get(
  '/:id',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const emojiId = c.req.param('id');

    const result = await db.query(
      `SELECT e.*, u.name as created_by_name
       FROM custom_emoji e
       LEFT JOIN app_user u ON e.created_by = u.id AND e.app_id = u.app_id
       WHERE e.id = $1 AND e.app_id = $2`,
      [emojiId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Emoji not found' } }, 404);
    }

    const emoji = result.rows[0];

    return c.json({
      id: emoji.id,
      workspaceId: emoji.workspace_id,
      name: emoji.name,
      imageUrl: emoji.image_url,
      category: emoji.category,
      createdBy: emoji.created_by,
      createdByName: emoji.created_by_name,
      usageCount: emoji.usage_count,
      createdAt: emoji.created_at,
    });
  }
);

/**
 * Delete custom emoji
 * DELETE /api/emoji/:id
 */
emojiRoutes.delete(
  '/:id',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const emojiId = c.req.param('id');

    // Verify ownership or admin role
    const emojiResult = await db.query(
      'SELECT created_by FROM custom_emoji WHERE id = $1 AND app_id = $2',
      [emojiId, auth.appId]
    );

    if (emojiResult.rows.length === 0) {
      return c.json({ error: { message: 'Emoji not found' } }, 404);
    }

    // TODO: Check if user is workspace admin or emoji creator

    const result = await db.query(
      'DELETE FROM custom_emoji WHERE id = $1 AND app_id = $2 RETURNING id',
      [emojiId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Emoji not found' } }, 404);
    }

    return c.json({ success: true });
  }
);

/**
 * Track emoji usage
 * POST /api/emoji/:id/use
 */
emojiRoutes.post(
  '/:id/use',
  requireUser,
  zValidator('json', z.object({
    messageId: z.string().uuid(),
  })),
  async (c) => {
    const auth = c.get('auth');
    const emojiId = c.req.param('id');
    const { messageId } = c.req.valid('json');

    // Verify emoji exists
    const emojiResult = await db.query(
      'SELECT id FROM custom_emoji WHERE id = $1 AND app_id = $2',
      [emojiId, auth.appId]
    );

    if (emojiResult.rows.length === 0) {
      return c.json({ error: { message: 'Emoji not found' } }, 404);
    }

    // Verify message exists
    const messageResult = await db.query(
      'SELECT id FROM message WHERE id = $1 AND app_id = $2',
      [messageId, auth.appId]
    );

    if (messageResult.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }

    // Record usage
    await db.query(
      `INSERT INTO emoji_usage
       (emoji_id, message_id, app_id, user_id)
       VALUES ($1, $2, $3, $4)`,
      [emojiId, messageId, auth.appId, auth.userId]
    );

    // Increment usage count
    await db.query(
      'UPDATE custom_emoji SET usage_count = usage_count + 1 WHERE id = $1',
      [emojiId]
    );

    return c.json({ success: true });
  }
);

/**
 * Get emoji usage analytics
 * GET /api/emoji/:id/analytics
 */
emojiRoutes.get(
  '/:id/analytics',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const emojiId = c.req.param('id');

    // Total usage count
    const totalResult = await db.query(
      'SELECT COUNT(*) as total_uses FROM emoji_usage WHERE emoji_id = $1 AND app_id = $2',
      [emojiId, auth.appId]
    );

    // Top users
    const topUsersResult = await db.query(
      `SELECT
         eu.user_id,
         u.name as user_name,
         COUNT(*) as use_count
       FROM emoji_usage eu
       LEFT JOIN app_user u ON eu.user_id = u.id AND eu.app_id = u.app_id
       WHERE eu.emoji_id = $1 AND eu.app_id = $2
       GROUP BY eu.user_id, u.name
       ORDER BY use_count DESC
       LIMIT 10`,
      [emojiId, auth.appId]
    );

    // Usage over time (last 30 days)
    const timeSeriesResult = await db.query(
      `SELECT
         DATE(used_at) as date,
         COUNT(*) as uses
       FROM emoji_usage
       WHERE emoji_id = $1 AND app_id = $2 AND used_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(used_at)
       ORDER BY date DESC`,
      [emojiId, auth.appId]
    );

    return c.json({
      emojiId,
      totalUses: parseInt(totalResult.rows[0].total_uses),
      topUsers: topUsersResult.rows.map((row) => ({
        userId: row.user_id,
        userName: row.user_name,
        useCount: parseInt(row.use_count),
      })),
      usageOverTime: timeSeriesResult.rows.map((row) => ({
        date: row.date,
        uses: parseInt(row.uses),
      })),
    });
  }
);

/**
 * Search emoji by name
 * GET /api/emoji/search
 */
emojiRoutes.get(
  '/search/query',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const query = c.req.query('q');
    const workspaceId = c.req.query('workspaceId');

    if (!query || !workspaceId) {
      return c.json({ error: { message: 'q and workspaceId are required' } }, 400);
    }

    const result = await db.query(
      `SELECT *
       FROM custom_emoji
       WHERE app_id = $1
         AND workspace_id = $2
         AND name ILIKE $3
       ORDER BY usage_count DESC
       LIMIT 20`,
      [auth.appId, workspaceId, `%${query}%`]
    );

    return c.json({
      emoji: result.rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        imageUrl: row.image_url,
        category: row.category,
        usageCount: row.usage_count,
      })),
    });
  }
);
