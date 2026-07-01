/**
 * User Routes
 * User management and presence
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireApp, requireUser } from '../middleware/auth';
import { deleteSubscriber } from '../services/novu';
import { centrifugo } from '../services/centrifugo';
import { realtimeUserSubject, revokeUserTokens } from '../services/tokens';
import { anonymizeUser, createDataExport } from '../services/data-lifecycle';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';

export const userRoutes = new Hono();

const revokeTokensSchema = z.object({
  reason: z.string().max(255).optional(),
});

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
userRoutes.get('/:userId', requireUser, async (c) => {
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
userRoutes.get('/', requireUser, async (c) => {
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

/**
 * Export current user's chat data.
 * POST /api/users/me/export
 */
userRoutes.post(
  '/me/export',
  requireUser,
  rateLimitUser(RATE_LIMIT_POLICIES.exportCreate),
  async (c) => {
    const auth = c.get('auth');
    const result = await createDataExport({
      appId: auth.appId,
      requestedBy: auth.userId!,
      scopeType: 'user',
      scopeId: auth.userId!,
    });

    return c.json(result, 201);
  }
);

// ============================================================================
// User Deletion (for cleaning up seed/test data)
// ============================================================================

userRoutes.post(
  '/:userId/revoke-tokens',
  requireApp,
  zValidator('json', revokeTokensSchema),
  async (c) => {
    const auth = c.get('auth');
    const userId = c.req.param('userId');
    const body = c.req.valid('json');

    const userCheck = await db.query(
      `SELECT id FROM app_user WHERE app_id = $1 AND id = $2`,
      [auth.appId, userId]
    );

    if (userCheck.rows.length === 0) {
      return c.json({ error: { message: 'User not found' } }, 404);
    }

    await revokeUserTokens({
      appId: auth.appId,
      userId,
      reason: body.reason ?? 'server_revoke',
    });

    disconnectRealtimeUser(auth.appId, userId);

    return c.json({ success: true, revokedUserId: userId });
  }
);

/**
 * Export a user's chat data with app/server credentials.
 * POST /api/users/:userId/export
 */
userRoutes.post(
  '/:userId/export',
  requireApp,
  rateLimitUser(RATE_LIMIT_POLICIES.exportCreate, (c) => ({ key: c.req.param('userId') })),
  async (c) => {
    const auth = c.get('auth');
    const userId = c.req.param('userId');
    const result = await createDataExport({
      appId: auth.appId,
      requestedBy: 'app',
      scopeType: 'user',
      scopeId: userId,
    });

    return c.json(result, 201);
  }
);

/**
 * Delete/anonymize a user
 * DELETE /api/users/:userId
 *
 * P0 production lifecycle behavior anonymizes the user row and revokes tokens
 * instead of deleting message history or breaking message foreign keys.
 */
userRoutes.delete('/:userId', requireApp, async (c) => {
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

  await anonymizeUser({
    appId: auth.appId,
    userId,
    deletedBy: 'app',
    reason: 'app_user_delete',
  });

  await revokeUserTokens({
    appId: auth.appId,
    userId,
    reason: 'user_deleted',
  });

	  // Clean up Novu subscriber (non-blocking)
	  deleteSubscriber(userId);
	  disconnectRealtimeUser(auth.appId, userId);

  return c.json({ success: true, anonymizedUserId: userId });
});

/**
 * Bulk delete users
 * POST /api/users/bulk-delete
 *
 * Anonymize multiple users at once. Useful for cleaning up seed data.
 */
userRoutes.post(
  '/bulk-delete',
  requireApp,
  zValidator('json', z.object({
    userIds: z.array(z.string()).min(1).max(100),
  })),
  async (c) => {
    const auth = c.get('auth');
    const { userIds } = c.req.valid('json');

    const deletedIds: string[] = [];
    for (const userId of userIds) {
      const updated = await anonymizeUser({
        appId: auth.appId,
        userId,
        deletedBy: 'app',
        reason: 'bulk_user_delete',
      });
      if (!updated) {
        continue;
      }
      await revokeUserTokens({ appId: auth.appId, userId, reason: 'user_deleted' });
      deletedIds.push(userId);
    }

    // Clean up Novu subscribers (non-blocking, fire-and-forget)
    deletedIds.forEach((id) => deleteSubscriber(id));

    return c.json({
      success: true,
      anonymized: deletedIds,
      count: deletedIds.length,
    });
	  }
	);

function disconnectRealtimeUser(appId: string, userId: string): void {
  centrifugo.disconnect(realtimeUserSubject(appId, userId)).catch((error) => {
    console.warn('[Users] Failed to disconnect revoked realtime user:', error);
  });
}

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

const ensureUserSchema = z.object({
  userId: z.string().min(1).max(255),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  image: z.string().url().optional().nullable(),
  custom: z.record(z.unknown()).optional(),
});

const bulkEnsureUsersSchema = z.object({
  users: z.array(ensureUserSchema).min(1).max(1000),
});

type EnsureUserInput = z.infer<typeof ensureUserSchema>;

function buildCustomPatch(input: Pick<EnsureUserInput, 'email' | 'custom'>): Record<string, unknown> {
  const customPatch: Record<string, unknown> = { ...(input.custom ?? {}) };
  if (input.email) {
    customPatch.email = input.email;
  }
  return customPatch;
}

function serializeUser(row: {
  id: string;
  name: string | null;
  image_url: string | null;
  custom_data: Record<string, unknown> | null;
  last_active_at?: Date | string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}) {
  const custom = row.custom_data ?? {};
  return {
    id: row.id,
    name: row.name,
    image: row.image_url,
    email: typeof custom.email === 'string' ? custom.email : null,
    custom,
    lastActiveAt: row.last_active_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

type EnsureUserRow = {
  id: string;
  name: string | null;
  image_url: string | null;
  custom_data: Record<string, unknown> | null;
  last_active_at: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  inserted: boolean;
  existed_before: boolean;
  changed: boolean;
};

async function ensureAppUser(appId: string, input: EnsureUserInput) {
  const customPatch = buildCustomPatch(input);
  const hasProfilePatch = Boolean(
    input.name !== undefined ||
    input.image !== undefined ||
    Object.keys(customPatch).length > 0
  );
  const customJson = JSON.stringify(customPatch);

  const result = await db.query<EnsureUserRow>(
    `WITH existing AS (
       SELECT id, name, image_url, custom_data
       FROM app_user
       WHERE app_id = $1 AND id = $2
     ),
     upserted AS (
       INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
       VALUES ($1, $2, COALESCE($3, $2), $4, $5::jsonb, NOW())
       ON CONFLICT (app_id, id) DO UPDATE SET
         name = COALESCE($3, app_user.name),
         image_url = COALESCE($4, app_user.image_url),
         custom_data = app_user.custom_data || $5::jsonb,
         updated_at = CASE WHEN $6 THEN NOW() ELSE app_user.updated_at END
       RETURNING
         id,
         name,
         image_url,
         custom_data,
         last_active_at,
         created_at,
         updated_at,
         (xmax = 0) AS inserted
     )
     SELECT
       upserted.*,
       EXISTS (SELECT 1 FROM existing) AS existed_before,
       EXISTS (
         SELECT 1
         FROM existing
         WHERE
           ($3::text IS NOT NULL AND existing.name IS DISTINCT FROM $3)
           OR ($4::text IS NOT NULL AND existing.image_url IS DISTINCT FROM $4)
           OR ($5::jsonb <> '{}'::jsonb AND NOT COALESCE(existing.custom_data, '{}'::jsonb) @> $5::jsonb)
       ) AS changed
     FROM upserted`,
    [
      appId,
      input.userId,
      input.name ?? null,
      input.image ?? null,
      customJson,
      hasProfilePatch,
    ]
  );

  const row = result.rows[0];
  const action = row.inserted
    ? 'created'
    : row.changed
    ? 'updated'
    : 'existing';

  return {
    action,
    created: action === 'created',
    updated: action === 'updated',
    user: serializeUser(row),
  };
}

/**
 * Ensure a single user exists with app/server credentials.
 * POST /api/users/ensure
 *
 * This is intended for server-side app integrations such as Vouch signup,
 * login, and DM creation. It is intentionally not available to browser bearer
 * tokens.
 */
userRoutes.post(
  '/ensure',
  requireApp,
  zValidator('json', ensureUserSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');
    const result = await ensureAppUser(auth.appId, body);

    return c.json(result, result.created ? 201 : 200);
  }
);

/**
 * Ensure multiple users exist with app/server credentials.
 * POST /api/users/bulk-ensure
 *
 * Useful for backfilling eligible active adult users before launch.
 */
userRoutes.post(
  '/bulk-ensure',
  requireApp,
  zValidator('json', bulkEnsureUsersSchema),
  async (c) => {
    const auth = c.get('auth');
    const { users } = c.req.valid('json');
    const ensured: Array<Awaited<ReturnType<typeof ensureAppUser>>> = [];
    const errors: { userId: string; error: string }[] = [];

    for (const user of users) {
      try {
        ensured.push(await ensureAppUser(auth.appId, user));
      } catch (error) {
        errors.push({
          userId: user.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return c.json({
      ensured,
      count: ensured.length,
      created: ensured.filter((result) => result.action === 'created').length,
      updated: ensured.filter((result) => result.action === 'updated').length,
      existing: ensured.filter((result) => result.action === 'existing').length,
      errors,
    }, errors.length > 0 ? 207 : 200);
  }
);

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
  requireApp,
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
  requireApp,
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
