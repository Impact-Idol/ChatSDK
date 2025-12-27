/**
 * Admin Routes
 * Super admin API for multi-tenant app management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { generateApiKey, generateSecretKey } from '../utils/crypto';

export const adminRoutes = new Hono();

// Admin authentication middleware
const requireAdmin = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    return c.json({ error: { message: 'Admin API not configured' } }, 503);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: { message: 'Missing admin authorization' } }, 401);
  }

  const token = authHeader.substring(7);

  if (token !== adminApiKey) {
    return c.json({ error: { message: 'Invalid admin credentials' } }, 401);
  }

  await next();
};

const createAppSchema = z.object({
  name: z.string().min(1).max(255),
  settings: z.object({
    ai_enabled: z.boolean().default(false),
    max_file_size: z.number().default(10485760), // 10MB
    allowed_file_types: z.array(z.string()).default(['image', 'video', 'audio', 'file']),
  }).optional(),
});

const updateAppSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Get all apps
 * GET /admin/apps
 */
adminRoutes.get('/apps', requireAdmin, async (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await db.query(
    `SELECT
      id,
      name,
      settings,
      created_at,
      updated_at,
      (SELECT COUNT(*) FROM app_user WHERE app_id = app.id) as user_count,
      (SELECT COUNT(*) FROM channel WHERE app_id = app.id) as channel_count,
      (SELECT COUNT(*) FROM message WHERE app_id = app.id) as message_count
     FROM app
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const totalResult = await db.query('SELECT COUNT(*) FROM app');
  const total = parseInt(totalResult.rows[0].count);

  return c.json({
    apps: result.rows.map((app) => ({
      id: app.id,
      name: app.name,
      settings: app.settings,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      stats: {
        userCount: parseInt(app.user_count),
        channelCount: parseInt(app.channel_count),
        messageCount: parseInt(app.message_count),
      },
    })),
    total,
    limit,
    offset,
  });
});

/**
 * Get app by ID
 * GET /admin/apps/:id
 */
adminRoutes.get('/apps/:id', requireAdmin, async (c) => {
  const appId = c.req.param('id');

  const result = await db.query(
    `SELECT
      id,
      name,
      api_key,
      secret_key,
      settings,
      created_at,
      updated_at,
      (SELECT COUNT(*) FROM app_user WHERE app_id = app.id) as user_count,
      (SELECT COUNT(*) FROM channel WHERE app_id = app.id) as channel_count,
      (SELECT COUNT(*) FROM message WHERE app_id = app.id) as message_count,
      (SELECT COUNT(*) FROM workspace WHERE app_id = app.id) as workspace_count
     FROM app
     WHERE id = $1`,
    [appId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'App not found' } }, 404);
  }

  const app = result.rows[0];

  return c.json({
    id: app.id,
    name: app.name,
    apiKey: app.api_key,
    secretKey: app.secret_key,
    settings: app.settings,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
    stats: {
      userCount: parseInt(app.user_count),
      channelCount: parseInt(app.channel_count),
      messageCount: parseInt(app.message_count),
      workspaceCount: parseInt(app.workspace_count),
    },
  });
});

/**
 * Create a new app
 * POST /admin/apps
 */
adminRoutes.post(
  '/apps',
  requireAdmin,
  zValidator('json', createAppSchema),
  async (c) => {
    const body = c.req.valid('json');

    const apiKey = generateApiKey();
    const secretKey = generateSecretKey();

    const result = await db.query(
      `INSERT INTO app (name, api_key, secret_key, settings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        body.name,
        apiKey,
        secretKey,
        JSON.stringify(body.settings || { ai_enabled: false }),
      ]
    );

    const app = result.rows[0];

    return c.json({
      id: app.id,
      name: app.name,
      apiKey: app.api_key,
      secretKey: app.secret_key,
      settings: app.settings,
      createdAt: app.created_at,
    }, 201);
  }
);

/**
 * Update app
 * PATCH /admin/apps/:id
 */
adminRoutes.patch(
  '/apps/:id',
  requireAdmin,
  zValidator('json', updateAppSchema),
  async (c) => {
    const appId = c.req.param('id');
    const body = c.req.valid('json');

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (body.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(body.name);
    }

    if (body.settings) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(body.settings));
    }

    if (updates.length === 0) {
      return c.json({ error: { message: 'No fields to update' } }, 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(appId);

    const result = await db.query(
      `UPDATE app SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'App not found' } }, 404);
    }

    const app = result.rows[0];

    return c.json({
      id: app.id,
      name: app.name,
      settings: app.settings,
      updatedAt: app.updated_at,
    });
  }
);

/**
 * Delete app (with cascade warning)
 * DELETE /admin/apps/:id
 */
adminRoutes.delete('/apps/:id', requireAdmin, async (c) => {
  const appId = c.req.param('id');

  // Get stats before deletion for confirmation
  const statsResult = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM app_user WHERE app_id = $1) as user_count,
      (SELECT COUNT(*) FROM channel WHERE app_id = $1) as channel_count,
      (SELECT COUNT(*) FROM message WHERE app_id = $1) as message_count
     FROM app WHERE id = $1`,
    [appId]
  );

  if (statsResult.rows.length === 0) {
    return c.json({ error: { message: 'App not found' } }, 404);
  }

  const stats = statsResult.rows[0];

  // Delete app (CASCADE will delete all related data)
  await db.query('DELETE FROM app WHERE id = $1', [appId]);

  return c.json({
    success: true,
    deleted: {
      users: parseInt(stats.user_count),
      channels: parseInt(stats.channel_count),
      messages: parseInt(stats.message_count),
    },
  });
});

/**
 * Regenerate API key for an app
 * POST /admin/apps/:id/regenerate-key
 */
adminRoutes.post('/apps/:id/regenerate-key', requireAdmin, async (c) => {
  const appId = c.req.param('id');

  const newApiKey = generateApiKey();

  const result = await db.query(
    `UPDATE app SET api_key = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, api_key`,
    [newApiKey, appId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'App not found' } }, 404);
  }

  const app = result.rows[0];

  return c.json({
    id: app.id,
    name: app.name,
    apiKey: app.api_key,
  });
});
