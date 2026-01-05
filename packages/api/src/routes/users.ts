/**
 * User Routes
 * User management and presence
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';

export const userRoutes = new Hono();

/**
 * Get current user
 * GET /api/users/me
 */
userRoutes.get('/me', requireUser, async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT id, name, image_url, custom_data, last_active_at, created_at
     FROM app_user
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'User not found' } }, 404);
  }

  const user = result.rows[0];

  return c.json({
    id: user.id,
    name: user.name,
    image: user.image_url,
    email: user.custom_data?.email || null,
    custom: user.custom_data,
    lastActiveAt: user.last_active_at,
    createdAt: user.created_at,
  });
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
  custom: z.record(z.unknown()).optional(),
});

/**
 * Update current user
 * PATCH /api/users/me
 */
userRoutes.patch(
  '/me',
  requireUser,
  zValidator('json', updateUserSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    const result = await db.query(
      `UPDATE app_user
       SET name = COALESCE($3, name),
           image_url = COALESCE($4, image_url),
           custom_data = COALESCE($5, custom_data),
           updated_at = NOW()
       WHERE app_id = $1 AND id = $2
       RETURNING id, name, image_url, custom_data`,
      [auth.appId, auth.userId, body.name, body.image, body.custom]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'User not found' } }, 404);
    }

    const user = result.rows[0];

    return c.json({
      id: user.id,
      name: user.name,
      image: user.image_url,
      custom: user.custom_data,
    });
  }
);

/**
 * Get a specific user
 * GET /api/users/:userId
 */
userRoutes.get('/:userId', async (c) => {
  const auth = c.get('auth');
  const userId = c.req.param('userId');

  const result = await db.query(
    `SELECT id, name, image_url, custom_data, last_active_at
     FROM app_user
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, userId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'User not found' } }, 404);
  }

  const user = result.rows[0];

  return c.json({
    id: user.id,
    name: user.name,
    image: user.image_url,
    email: user.custom_data?.email || null,
    custom: user.custom_data,
    lastActiveAt: user.last_active_at,
    online: isOnline(user.last_active_at),
  });
});

/**
 * Query users
 * GET /api/users
 */
userRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const search = c.req.query('q');

  let query = `
    SELECT id, name, image_url, custom_data, last_active_at
    FROM app_user
    WHERE app_id = $1
  `;
  const params: any[] = [auth.appId];

  if (search) {
    query += ` AND name ILIKE $${params.length + 1}`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  return c.json({
    users: result.rows.map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image_url,
      email: user.custom_data?.email || null,
      custom: user.custom_data,
      lastActiveAt: user.last_active_at,
      online: isOnline(user.last_active_at),
    })),
  });
});

// Consider user online if active in last 5 minutes
function isOnline(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return false;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(lastActiveAt).getTime() > fiveMinutesAgo;
}

// ============================================================================
// User Blocking (Work Stream 7)
// ============================================================================

/**
 * Block a user
 * POST /api/users/:userId/block
 */
userRoutes.post('/:userId/block', requireUser, async (c) => {
  const auth = c.get('auth');
  const blockedUserId = c.req.param('userId');

  // Can't block yourself
  if (auth.userId === blockedUserId) {
    return c.json({ error: { message: 'Cannot block yourself' } }, 400);
  }

  // Verify target user exists
  const userCheck = await db.query(
    `SELECT id FROM app_user WHERE app_id = $1 AND id = $2`,
    [auth.appId, blockedUserId]
  );

  if (userCheck.rows.length === 0) {
    return c.json({ error: { message: 'User not found' } }, 404);
  }

  // Insert block (using ON CONFLICT to handle duplicate blocks)
  await db.query(
    `INSERT INTO user_block (app_id, blocker_user_id, blocked_user_id, blocked_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (app_id, blocker_user_id, blocked_user_id) DO NOTHING`,
    [auth.appId, auth.userId, blockedUserId]
  );

  return c.json({ success: true });
});

/**
 * Unblock a user
 * DELETE /api/users/:userId/block
 */
userRoutes.delete('/:userId/block', requireUser, async (c) => {
  const auth = c.get('auth');
  const blockedUserId = c.req.param('userId');

  await db.query(
    `DELETE FROM user_block
     WHERE app_id = $1 AND blocker_user_id = $2 AND blocked_user_id = $3`,
    [auth.appId, auth.userId, blockedUserId]
  );

  return c.json({ success: true });
});

/**
 * Get list of blocked users
 * GET /api/users/blocked
 */
userRoutes.get('/me/blocked', requireUser, async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT u.id, u.name, u.image_url, ub.blocked_at
     FROM user_block ub
     JOIN app_user u ON ub.app_id = u.app_id AND ub.blocked_user_id = u.id
     WHERE ub.app_id = $1 AND ub.blocker_user_id = $2
     ORDER BY ub.blocked_at DESC`,
    [auth.appId, auth.userId]
  );

  const blockedUsers = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    image: row.image_url,
    blockedAt: row.blocked_at,
  }));

  return c.json({ blockedUsers });
});

// ============================================================================
// User Deletion (for cleaning up seed/test data)
// ============================================================================

/**
 * Delete a user
 * DELETE /api/users/:userId
 *
 * Removes a user and all their associated data (messages, reactions, etc.).
 * Use this to clean up seed/test users or remove inactive accounts.
 *
 * Note: This is a destructive operation. Messages from deleted users
 * will have their user_id set to NULL (orphaned).
 */
userRoutes.delete('/:userId', requireUser, async (c) => {
  const auth = c.get('auth');
  const userId = c.req.param('userId');

  // Check if target user exists
  const userCheck = await db.query(
    `SELECT id FROM app_user WHERE app_id = $1 AND id = $2`,
    [auth.appId, userId]
  );

  if (userCheck.rows.length === 0) {
    return c.json({ error: { message: 'User not found' } }, 404);
  }

  // Delete user (cascades to channel_member, reactions, etc. via FK constraints)
  await db.query(
    `DELETE FROM app_user WHERE app_id = $1 AND id = $2`,
    [auth.appId, userId]
  );

  return c.json({ success: true, deletedUserId: userId });
});

/**
 * Bulk delete users
 * POST /api/users/bulk-delete
 *
 * Delete multiple users at once. Useful for cleaning up seed data.
 */
userRoutes.post(
  '/bulk-delete',
  requireUser,
  zValidator('json', z.object({
    userIds: z.array(z.string()).min(1).max(100),
  })),
  async (c) => {
    const auth = c.get('auth');
    const { userIds } = c.req.valid('json');

    const result = await db.query(
      `DELETE FROM app_user WHERE app_id = $1 AND id = ANY($2) RETURNING id`,
      [auth.appId, userIds]
    );

    return c.json({
      success: true,
      deleted: result.rows.map((r) => r.id),
      count: result.rowCount,
    });
  }
);

// ============================================================================
// User Sync (Bulk User Management)
// ============================================================================

const syncUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  image: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  custom: z.record(z.unknown()).optional(),
});

const syncUsersSchema = z.object({
  users: z.array(syncUserSchema).min(1).max(100),
});

/**
 * Sync users (bulk create/update)
 * POST /api/users/sync
 *
 * Allows clients to sync their user database with ChatSDK.
 * Users are created if they don't exist, or updated if they do.
 * This ensures ChatSDK always has the latest user data from your system.
 *
 * Request body:
 * {
 *   "users": [
 *     { "id": "user-1", "name": "Alice", "image": "https://...", "email": "alice@example.com" },
 *     { "id": "user-2", "name": "Bob", "image": "https://...", "custom": { "role": "admin" } }
 *   ]
 * }
 */
userRoutes.post(
  '/sync',
  requireUser,
  zValidator('json', syncUsersSchema),
  async (c) => {
    const auth = c.get('auth');
    const { users } = c.req.valid('json');

    const results = {
      synced: 0,
      created: 0,
      updated: 0,
      errors: [] as { id: string; error: string }[],
    };

    for (const user of users) {
      try {
        // Store email in custom_data if provided
        const customData = user.custom || {};
        if (user.email) {
          customData.email = user.email;
        }

        // Upsert user with RETURNING to determine if created or updated
        const result = await db.query(
          `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (app_id, id) DO UPDATE SET
             name = CASE WHEN $3 IS NOT NULL THEN $3 ELSE app_user.name END,
             image_url = CASE WHEN $4 IS NOT NULL THEN $4 ELSE app_user.image_url END,
             custom_data = app_user.custom_data || $5::jsonb,
             last_active_at = NOW(),
             updated_at = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [auth.appId, user.id, user.name, user.image, customData]
        );

        results.synced++;
        if (result.rows[0]?.inserted) {
          results.created++;
        } else {
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          id: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return c.json(results);
  }
);

/**
 * Sync single user
 * PUT /api/users/:userId
 *
 * Create or update a single user. Useful for real-time sync when a user
 * updates their profile in your system.
 */
userRoutes.put(
  '/:userId',
  requireUser,
  zValidator('json', z.object({
    name: z.string().optional(),
    image: z.string().url().optional().nullable(),
    email: z.string().email().optional().nullable(),
    custom: z.record(z.unknown()).optional(),
  })),
  async (c) => {
    const auth = c.get('auth');
    const userId = c.req.param('userId');
    const body = c.req.valid('json');

    // Store email in custom_data if provided
    const customData = body.custom || {};
    if (body.email) {
      customData.email = body.email;
    }

    const result = await db.query(
      `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (app_id, id) DO UPDATE SET
         name = CASE WHEN $3 IS NOT NULL THEN $3 ELSE app_user.name END,
         image_url = CASE WHEN $4 IS NOT NULL THEN $4 ELSE app_user.image_url END,
         custom_data = app_user.custom_data || $5::jsonb,
         updated_at = NOW()
       RETURNING id, name, image_url, custom_data`,
      [auth.appId, userId, body.name, body.image, customData]
    );

    const user = result.rows[0];

    return c.json({
      id: user.id,
      name: user.name,
      image: user.image_url,
      email: user.custom_data?.email,
      custom: user.custom_data,
    });
  }
);
