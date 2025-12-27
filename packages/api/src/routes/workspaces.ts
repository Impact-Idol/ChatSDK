/**
 * Workspace Routes
 * Multi-workspace hierarchy for teams, projects, conferences
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';

export const workspaceRoutes = new Hono();

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['team', 'project', 'conference', 'chapter']).default('team'),
  image: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  config: z.record(z.unknown()).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  config: z.record(z.unknown()).optional(),
});

const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
});

/**
 * Create workspace
 * POST /api/workspaces
 */
workspaceRoutes.post(
  '/',
  requireUser,
  zValidator('json', createWorkspaceSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    const result = await db.query(
      `INSERT INTO workspace (app_id, name, type, image_url, config, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth.appId,
        body.name,
        body.type,
        body.image,
        JSON.stringify(body.config || {}),
        auth.userId,
        body.expiresAt,
      ]
    );

    const workspace = result.rows[0];

    // Add creator as owner
    await db.query(
      `INSERT INTO workspace_member (workspace_id, app_id, user_id, role, is_default)
       VALUES ($1, $2, $3, 'owner', TRUE)`,
      [workspace.id, auth.appId, auth.userId]
    );

    // Update member count
    await db.query(
      `UPDATE workspace SET member_count = 1 WHERE id = $1`,
      [workspace.id]
    );

    return c.json({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      image: workspace.image_url,
      memberCount: 1,
      channelCount: 0,
      expiresAt: workspace.expires_at,
      createdAt: workspace.created_at,
      createdBy: workspace.created_by,
    });
  }
);

/**
 * List user's workspaces
 * GET /api/workspaces
 */
workspaceRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT w.*, wm.role, wm.is_default
     FROM workspace w
     JOIN workspace_member wm ON w.id = wm.workspace_id
     WHERE wm.app_id = $1 AND wm.user_id = $2
     ORDER BY w.created_at DESC`,
    [auth.appId, auth.userId]
  );

  const workspaces = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    image: row.image_url,
    memberCount: row.member_count,
    channelCount: row.channel_count,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    role: row.role,
    isDefault: row.is_default,
  }));

  return c.json({ workspaces });
});

/**
 * Get workspace details
 * GET /api/workspaces/:id
 */
workspaceRoutes.get('/:id', requireUser, async (c) => {
  const auth = c.get('auth');
  const workspaceId = c.req.param('id');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT role FROM workspace_member
     WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
    [workspaceId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this workspace' } }, 403);
  }

  const result = await db.query(
    `SELECT * FROM workspace WHERE id = $1 AND app_id = $2`,
    [workspaceId, auth.appId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Workspace not found' } }, 404);
  }

  const workspace = result.rows[0];

  return c.json({
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    image: workspace.image_url,
    memberCount: workspace.member_count,
    channelCount: workspace.channel_count,
    config: workspace.config,
    expiresAt: workspace.expires_at,
    createdAt: workspace.created_at,
    createdBy: workspace.created_by,
    role: memberCheck.rows[0].role,
  });
});

/**
 * Update workspace
 * PUT /api/workspaces/:id
 */
workspaceRoutes.put(
  '/:id',
  requireUser,
  zValidator('json', updateWorkspaceSchema),
  async (c) => {
    const auth = c.get('auth');
    const workspaceId = c.req.param('id');
    const body = c.req.valid('json');

    // Verify admin/owner permission
    const memberCheck = await db.query(
      `SELECT role FROM workspace_member
       WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
      [workspaceId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (body.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(body.name);
    }
    if (body.image !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(body.image);
    }
    if (body.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramCount++}`);
      values.push(body.expiresAt);
    }
    if (body.config) {
      updates.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(body.config));
    }

    if (updates.length === 0) {
      return c.json({ error: { message: 'No fields to update' } }, 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(workspaceId, auth.appId);

    const result = await db.query(
      `UPDATE workspace SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND app_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Workspace not found' } }, 404);
    }

    const workspace = result.rows[0];

    return c.json({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      image: workspace.image_url,
      memberCount: workspace.member_count,
      channelCount: workspace.channel_count,
      expiresAt: workspace.expires_at,
      updatedAt: workspace.updated_at,
    });
  }
);

/**
 * Delete workspace
 * DELETE /api/workspaces/:id
 */
workspaceRoutes.delete('/:id', requireUser, async (c) => {
  const auth = c.get('auth');
  const workspaceId = c.req.param('id');

  // Verify owner permission
  const memberCheck = await db.query(
    `SELECT role FROM workspace_member
     WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
    [workspaceId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'owner') {
    return c.json({ error: { message: 'Permission denied. Only owners can delete workspaces' } }, 403);
  }

  await db.query(
    `DELETE FROM workspace WHERE id = $1 AND app_id = $2`,
    [workspaceId, auth.appId]
  );

  return c.json({ success: true });
});

/**
 * Add members to workspace
 * POST /api/workspaces/:id/members
 */
workspaceRoutes.post(
  '/:id/members',
  requireUser,
  zValidator('json', addMembersSchema),
  async (c) => {
    const auth = c.get('auth');
    const workspaceId = c.req.param('id');
    const body = c.req.valid('json');

    // Verify admin/owner permission
    const memberCheck = await db.query(
      `SELECT role FROM workspace_member
       WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
      [workspaceId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    // Add members
    const added = [];
    for (const userId of body.userIds) {
      try {
        await db.query(
          `INSERT INTO workspace_member (workspace_id, app_id, user_id, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [workspaceId, auth.appId, userId, body.role]
        );
        added.push(userId);
      } catch (error) {
        // User doesn't exist or other error - skip
        console.error(`Failed to add user ${userId}:`, error);
      }
    }

    // Update member count
    await db.query(
      `UPDATE workspace
       SET member_count = (SELECT COUNT(*) FROM workspace_member WHERE workspace_id = $1)
       WHERE id = $1`,
      [workspaceId]
    );

    return c.json({ added, count: added.length });
  }
);

/**
 * Remove member from workspace
 * DELETE /api/workspaces/:id/members/:userId
 */
workspaceRoutes.delete('/:id/members/:userId', requireUser, async (c) => {
  const auth = c.get('auth');
  const workspaceId = c.req.param('id');
  const targetUserId = c.req.param('userId');

  // Verify admin/owner permission or self-removal
  const memberCheck = await db.query(
    `SELECT role FROM workspace_member
     WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
    [workspaceId, auth.appId, auth.userId]
  );

  const isSelf = auth.userId === targetUserId;
  const isAdmin = memberCheck.rows.length > 0 && ['owner', 'admin'].includes(memberCheck.rows[0].role);

  if (!isSelf && !isAdmin) {
    return c.json({ error: { message: 'Permission denied' } }, 403);
  }

  // Don't allow removing the last owner
  if (!isSelf) {
    const targetRole = await db.query(
      `SELECT role FROM workspace_member
       WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
      [workspaceId, auth.appId, targetUserId]
    );

    if (targetRole.rows.length > 0 && targetRole.rows[0].role === 'owner') {
      const ownerCount = await db.query(
        `SELECT COUNT(*) as count FROM workspace_member
         WHERE workspace_id = $1 AND role = 'owner'`,
        [workspaceId]
      );

      if (parseInt(ownerCount.rows[0].count) <= 1) {
        return c.json({ error: { message: 'Cannot remove the last owner' } }, 400);
      }
    }
  }

  await db.query(
    `DELETE FROM workspace_member
     WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
    [workspaceId, auth.appId, targetUserId]
  );

  // Update member count
  await db.query(
    `UPDATE workspace
     SET member_count = (SELECT COUNT(*) FROM workspace_member WHERE workspace_id = $1)
     WHERE id = $1`,
    [workspaceId]
  );

  return c.json({ success: true });
});

/**
 * Get workspace channels
 * GET /api/workspaces/:id/channels
 */
workspaceRoutes.get('/:id/channels', requireUser, async (c) => {
  const auth = c.get('auth');
  const workspaceId = c.req.param('id');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM workspace_member
     WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
    [workspaceId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this workspace' } }, 403);
  }

  const result = await db.query(
    `SELECT c.*, cm.last_read_seq, cm.unread_count
     FROM channel c
     LEFT JOIN channel_member cm ON c.id = cm.channel_id AND cm.user_id = $3
     WHERE c.workspace_id = $1 AND c.app_id = $2
     ORDER BY c.last_message_at DESC NULLS LAST`,
    [workspaceId, auth.appId, auth.userId]
  );

  const channels = result.rows.map((row) => ({
    id: row.id,
    cid: row.cid,
    name: row.name,
    type: row.type,
    image: row.image_url,
    memberCount: row.member_count,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count || 0,
    lastReadSeq: row.last_read_seq || 0,
  }));

  return c.json({ channels });
});
