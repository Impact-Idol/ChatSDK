/**
 * Workspace Routes
 * Multi-workspace hierarchy for teams, projects, conferences
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { logger } from '../services/logger';

/**
 * Check if the request is a trusted server-side call via API key.
 * The authMiddleware validates the API key before any route handler runs,
 * so if we reach a handler, the API key is guaranteed valid.
 * API-key-authenticated requests bypass per-user role checks for
 * workspace management operations (add/remove members, update, delete).
 */
function isAppLevelAuth(c: Context): boolean {
  return !!c.req.header('X-API-Key');
}

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

    const formattedWorkspace = {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      image: workspace.image_url,
      memberCount: 1,
      channelCount: 0,
      expiresAt: workspace.expires_at,
      createdAt: workspace.created_at,
      createdBy: workspace.created_by,
    };

    // Broadcast workspace created event
    try {
      const { centrifugo } = await import('../services/centrifugo');
      await centrifugo.publishWorkspaceCreated(auth.appId, formattedWorkspace);
    } catch (error) {
      console.error('Failed to broadcast workspace.created event:', error);
    }

    return c.json(formattedWorkspace);
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

    if (isAppLevelAuth(c)) {
      logger.info({ type: 'workspace_admin', op: 'update', app_id: auth.appId, workspace_id: workspaceId, user_id: auth.userId }, 'API key authorized workspace update');
    } else {
      const memberCheck = await db.query(
        `SELECT role FROM workspace_member
         WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
        [workspaceId, auth.appId, auth.userId]
      );

      if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
        return c.json({ error: { message: 'Permission denied' } }, 403);
      }
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

    const formattedWorkspace = {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      image: workspace.image_url,
      memberCount: workspace.member_count,
      channelCount: workspace.channel_count,
      expiresAt: workspace.expires_at,
      updatedAt: workspace.updated_at,
    };

    // Broadcast workspace updated event
    try {
      const { centrifugo } = await import('../services/centrifugo');
      await centrifugo.publishWorkspaceUpdated(auth.appId, workspaceId, formattedWorkspace);
    } catch (error) {
      console.error('Failed to broadcast workspace.updated event:', error);
    }

    return c.json(formattedWorkspace);
  }
);

/**
 * Delete workspace
 * DELETE /api/workspaces/:id
 */
workspaceRoutes.delete('/:id', requireUser, async (c) => {
  const auth = c.get('auth');
  const workspaceId = c.req.param('id');

  if (isAppLevelAuth(c)) {
    logger.info({ type: 'workspace_admin', op: 'delete', app_id: auth.appId, workspace_id: workspaceId, user_id: auth.userId }, 'API key authorized workspace deletion');
  } else {
    const memberCheck = await db.query(
      `SELECT role FROM workspace_member
       WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
      [workspaceId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'owner') {
      return c.json({ error: { message: 'Permission denied. Only owners can delete workspaces' } }, 403);
    }
  }

  await db.query(
    `DELETE FROM workspace WHERE id = $1 AND app_id = $2`,
    [workspaceId, auth.appId]
  );

  // Broadcast workspace deleted event
  try {
    const { centrifugo } = await import('../services/centrifugo');
    await centrifugo.publishWorkspaceDeleted(auth.appId, workspaceId);
  } catch (error) {
    console.error('Failed to broadcast workspace.deleted event:', error);
  }

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

    if (isAppLevelAuth(c)) {
      logger.info({ type: 'workspace_admin', op: 'add_members', app_id: auth.appId, workspace_id: workspaceId, user_id: auth.userId }, 'API key authorized member management');
    } else {
      const memberCheck = await db.query(
        `SELECT role FROM workspace_member
         WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
        [workspaceId, auth.appId, auth.userId]
      );

      if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
        return c.json({ error: { message: 'Permission denied' } }, 403);
      }
    }

    // Verify workspace exists and belongs to this app
    const wsCheck = await db.query(
      `SELECT 1 FROM workspace WHERE id = $1 AND app_id = $2`,
      [workspaceId, auth.appId]
    );
    if (wsCheck.rows.length === 0) {
      return c.json({ error: { message: 'Workspace not found' } }, 404);
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

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

/**
 * Update workspace member role
 * PATCH /api/workspaces/:id/members/:userId
 */
workspaceRoutes.patch(
  '/:id/members/:userId',
  requireUser,
  zValidator('json', updateMemberRoleSchema),
  async (c) => {
    const auth = c.get('auth');
    const workspaceId = c.req.param('id');
    const targetUserId = c.req.param('userId');
    const body = c.req.valid('json');

    if (isAppLevelAuth(c)) {
      logger.info({
        type: 'workspace_admin',
        op: 'update_member_role',
        app_id: auth.appId,
        workspace_id: workspaceId,
        target_user_id: targetUserId,
        user_id: auth.userId,
      }, 'API key authorized member role update');
    } else {
      const memberCheck = await db.query(
        `SELECT role FROM workspace_member
         WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
        [workspaceId, auth.appId, auth.userId]
      );

      if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
        return c.json({ error: { message: 'Permission denied' } }, 403);
      }
    }

    // Verify workspace exists
    const wsCheck = await db.query(
      `SELECT 1 FROM workspace WHERE id = $1 AND app_id = $2`,
      [workspaceId, auth.appId]
    );
    if (wsCheck.rows.length === 0) {
      return c.json({ error: { message: 'Workspace not found' } }, 404);
    }

    // Verify target member exists
    const targetRole = await db.query(
      `SELECT role FROM workspace_member
       WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
      [workspaceId, auth.appId, targetUserId]
    );

    if (targetRole.rows.length === 0) {
      return c.json({ error: { message: 'Member not found' } }, 404);
    }

    // Prevent demoting the last owner
    if (targetRole.rows[0].role === 'owner' && body.role !== 'owner') {
      const ownerCount = await db.query(
        `SELECT COUNT(*) as count FROM workspace_member
         WHERE workspace_id = $1 AND role = 'owner'`,
        [workspaceId]
      );

      if (parseInt(ownerCount.rows[0].count) <= 1) {
        return c.json({ error: { message: 'Cannot demote the last owner' } }, 400);
      }
    }

    // Update role
    await db.query(
      `UPDATE workspace_member SET role = $4
       WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
      [workspaceId, auth.appId, targetUserId, body.role]
    );

    return c.json({ success: true, role: body.role });
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

  if (isAppLevelAuth(c)) {
    logger.info({ type: 'workspace_admin', op: 'remove_member', app_id: auth.appId, workspace_id: workspaceId, target_user_id: targetUserId, user_id: auth.userId }, 'API key authorized member removal');
  } else {
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
  }

  // Verify workspace exists and belongs to this app
  const wsCheck = await db.query(
    `SELECT 1 FROM workspace WHERE id = $1 AND app_id = $2`,
    [workspaceId, auth.appId]
  );
  if (wsCheck.rows.length === 0) {
    return c.json({ error: { message: 'Workspace not found' } }, 404);
  }

  // Don't allow removing the last owner (applies to all auth paths)
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

/**
 * Invite users to workspace via email
 * POST /api/workspaces/:id/invite
 */
const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  message: z.string().max(500).optional(),
});

workspaceRoutes.post(
  '/:id/invite',
  requireUser,
  zValidator('json', inviteSchema),
  async (c) => {
    const auth = c.get('auth');
    const workspaceId = c.req.param('id');
    const body = c.req.valid('json');

    if (isAppLevelAuth(c)) {
      logger.info({ type: 'workspace_admin', op: 'invite', app_id: auth.appId, workspace_id: workspaceId, user_id: auth.userId }, 'API key authorized workspace invite');
    } else {
      const memberResult = await db.query(
        `SELECT role FROM workspace_member
         WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
        [workspaceId, auth.appId, auth.userId]
      );

      if (memberResult.rows.length === 0) {
        return c.json({ error: { message: 'Workspace not found' } }, 404);
      }

      const role = memberResult.rows[0].role;
      if (!['owner', 'admin'].includes(role)) {
        return c.json({ error: { message: 'Only admins can invite members' } }, 403);
      }
    }

    // Get workspace details
    const workspaceResult = await db.query(
      `SELECT name FROM workspace WHERE id = $1 AND app_id = $2`,
      [workspaceId, auth.appId]
    );

    if (workspaceResult.rows.length === 0) {
      return c.json({ error: { message: 'Workspace not found' } }, 404);
    }

    const workspaceName = workspaceResult.rows[0].name;

    // Generate invite tokens for each email
    const invites = [];
    const { generateToken } = await import('../utils/crypto');

    for (const email of body.emails) {
      const token = generateToken(32); // 64 hex chars

      // Check if there's already a pending invite for this email
      const existingInvite = await db.query(
        `SELECT id FROM workspace_invite
         WHERE workspace_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()`,
        [workspaceId, email]
      );

      if (existingInvite.rows.length > 0) {
        // Update existing invite with new token
        await db.query(
          `UPDATE workspace_invite
           SET token = $1, invited_by = $2, message = $3, created_at = NOW(), expires_at = NOW() + INTERVAL '7 days'
           WHERE id = $4`,
          [token, auth.userId, body.message, existingInvite.rows[0].id]
        );
      } else {
        // Create new invite
        await db.query(
          `INSERT INTO workspace_invite (workspace_id, app_id, email, token, invited_by, role, message)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [workspaceId, auth.appId, email, token, auth.userId, body.role, body.message]
        );
      }

      invites.push({
        email,
        token,
        inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${token}`,
      });
    }

    // Trigger email sending via Inngest
    try {
      const { inngest } = await import('../inngest');
      await inngest.send({
        name: 'workspace/invite.sent',
        data: {
          workspaceId,
          workspaceName,
          invites,
          inviterUserId: auth.userId,
          message: body.message,
        },
      });
    } catch (error) {
      console.error('Failed to send invite emails:', error);
      // Don't fail the request if email sending fails
    }

    return c.json({
      success: true,
      invites: invites.map((inv) => ({
        email: inv.email,
        inviteUrl: inv.inviteUrl,
      })),
    });
  }
);

/**
 * Accept workspace invite
 * GET /api/workspaces/invites/:token
 */
workspaceRoutes.get('/invites/:token', requireUser, async (c) => {
  const auth = c.get('auth');
  const token = c.req.param('token');

  // Find the invite
  const inviteResult = await db.query(
    `SELECT * FROM workspace_invite
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
    [token]
  );

  if (inviteResult.rows.length === 0) {
    return c.json({ error: { message: 'Invalid or expired invite' } }, 404);
  }

  const invite = inviteResult.rows[0];

  // Check if user is already a member
  const memberCheck = await db.query(
    `SELECT 1 FROM workspace_member
     WHERE workspace_id = $1 AND app_id = $2 AND user_id = $3`,
    [invite.workspace_id, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length > 0) {
    // Update invite status to accepted anyway
    await db.query(
      `UPDATE workspace_invite SET status = 'accepted', accepted_by = $1, accepted_at = NOW() WHERE id = $2`,
      [auth.userId, invite.id]
    );

    return c.json({
      success: true,
      message: 'You are already a member of this workspace',
      alreadyMember: true,
    });
  }

  // Add user to workspace
  await db.query(
    `INSERT INTO workspace_member (workspace_id, app_id, user_id, role)
     VALUES ($1, $2, $3, $4)`,
    [invite.workspace_id, auth.appId, auth.userId, invite.role]
  );

  // Update workspace member count
  await db.query(
    `UPDATE workspace SET member_count = member_count + 1, updated_at = NOW()
     WHERE id = $1`,
    [invite.workspace_id]
  );

  // Mark invite as accepted
  await db.query(
    `UPDATE workspace_invite SET status = 'accepted', accepted_by = $1, accepted_at = NOW()
     WHERE id = $2`,
    [auth.userId, invite.id]
  );

  // Get workspace details
  const workspaceResult = await db.query(
    `SELECT * FROM workspace WHERE id = $1`,
    [invite.workspace_id]
  );

  const workspace = workspaceResult.rows[0];

  // Broadcast workspace.member_joined event
  try {
    const { centrifugo } = await import('../services/centrifugo');
    await centrifugo.publishWorkspaceMemberJoined(
      auth.appId,
      invite.workspace_id,
      auth.userId
    );
  } catch (error) {
    console.error('Failed to broadcast member joined event:', error);
  }

  return c.json({
    success: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      image: workspace.image_url,
      memberCount: workspace.member_count,
    },
  });
});
