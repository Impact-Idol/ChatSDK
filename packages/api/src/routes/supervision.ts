/**
 * Supervised User / Guardian Monitoring Routes
 * Work Stream 15 - TIER 3
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';

export const supervisionRoutes = new Hono();

const createSupervisionSchema = z.object({
  supervisedUserId: z.string().min(1).max(255),
  supervisionType: z.enum(['guardian', 'school', 'organization']).default('guardian'),
  ageRestriction: z.number().int().min(1).max(100).optional(),
  monitoringEnabled: z.boolean().default(true),
});

const updateSupervisionSchema = z.object({
  monitoringEnabled: z.boolean().optional(),
  ageRestriction: z.number().int().min(1).max(100).nullable().optional(),
});

/**
 * Create supervision relationship
 * POST /api/users/:userId/supervise
 */
supervisionRoutes.post(
  '/:userId/supervise',
  requireUser,
  zValidator('json', createSupervisionSchema),
  async (c) => {
    const auth = c.get('auth');
    const supervisorId = auth.userId;
    const body = c.req.valid('json');

    // Validate supervised user exists
    const supervisedResult = await db.query(
      'SELECT id FROM app_user WHERE app_id = $1 AND id = $2',
      [auth.appId, body.supervisedUserId]
    );

    if (supervisedResult.rows.length === 0) {
      return c.json({ error: { message: 'Supervised user not found' } }, 404);
    }

    // Check for self-supervision
    if (supervisorId === body.supervisedUserId) {
      return c.json({ error: { message: 'Cannot supervise yourself' } }, 400);
    }

    // Create supervision relationship
    const result = await db.query(
      `INSERT INTO supervised_user
       (supervisor_user_id, supervised_user_id, app_id, monitoring_enabled, supervision_type, age_restriction)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (app_id, supervisor_user_id, supervised_user_id)
       DO UPDATE SET
         monitoring_enabled = EXCLUDED.monitoring_enabled,
         supervision_type = EXCLUDED.supervision_type,
         age_restriction = EXCLUDED.age_restriction,
         updated_at = NOW()
       RETURNING *`,
      [
        supervisorId,
        body.supervisedUserId,
        auth.appId,
        body.monitoringEnabled,
        body.supervisionType,
        body.ageRestriction || null,
      ]
    );

    const supervision = result.rows[0];

    return c.json({
      supervisorUserId: supervision.supervisor_user_id,
      supervisedUserId: supervision.supervised_user_id,
      monitoringEnabled: supervision.monitoring_enabled,
      supervisionType: supervision.supervision_type,
      ageRestriction: supervision.age_restriction,
      createdAt: supervision.created_at,
      updatedAt: supervision.updated_at,
    }, 201);
  }
);

/**
 * Get supervised users (users I'm supervising)
 * GET /api/users/me/supervised
 */
supervisionRoutes.get(
  '/me/supervised',
  requireUser,
  async (c) => {
    const auth = c.get('auth');

    const result = await db.query(
      `SELECT
         su.*,
         u.name as supervised_user_name,
         u.image as supervised_user_image
       FROM supervised_user su
       JOIN app_user u ON su.supervised_user_id = u.id AND su.app_id = u.app_id
       WHERE su.app_id = $1 AND su.supervisor_user_id = $2
       ORDER BY su.created_at DESC`,
      [auth.appId, auth.userId]
    );

    return c.json({
      supervisedUsers: result.rows.map((row) => ({
        supervisedUserId: row.supervised_user_id,
        supervisedUserName: row.supervised_user_name,
        supervisedUserImage: row.supervised_user_image,
        monitoringEnabled: row.monitoring_enabled,
        supervisionType: row.supervision_type,
        ageRestriction: row.age_restriction,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  }
);

/**
 * Get supervisors (who is supervising me)
 * GET /api/users/me/supervisors
 */
supervisionRoutes.get(
  '/me/supervisors',
  requireUser,
  async (c) => {
    const auth = c.get('auth');

    const result = await db.query(
      `SELECT
         su.*,
         u.name as supervisor_name,
         u.image as supervisor_image
       FROM supervised_user su
       JOIN app_user u ON su.supervisor_user_id = u.id AND su.app_id = u.app_id
       WHERE su.app_id = $1 AND su.supervised_user_id = $2
       ORDER BY su.created_at DESC`,
      [auth.appId, auth.userId]
    );

    return c.json({
      supervisors: result.rows.map((row) => ({
        supervisorUserId: row.supervisor_user_id,
        supervisorName: row.supervisor_name,
        supervisorImage: row.supervisor_image,
        monitoringEnabled: row.monitoring_enabled,
        supervisionType: row.supervision_type,
        ageRestriction: row.age_restriction,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  }
);

/**
 * Get supervised user's activity
 * GET /api/users/:userId/activity
 */
supervisionRoutes.get(
  '/:userId/activity',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const supervisedUserId = c.req.param('userId');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // Verify supervision relationship exists and monitoring is enabled
    const supervisionResult = await db.query(
      `SELECT monitoring_enabled
       FROM supervised_user
       WHERE app_id = $1
         AND supervisor_user_id = $2
         AND supervised_user_id = $3`,
      [auth.appId, auth.userId, supervisedUserId]
    );

    if (supervisionResult.rows.length === 0) {
      return c.json({ error: { message: 'Not authorized to view this user\'s activity' } }, 403);
    }

    if (!supervisionResult.rows[0].monitoring_enabled) {
      return c.json({ error: { message: 'Monitoring is disabled for this user' } }, 403);
    }

    // Get user's recent messages
    const messagesResult = await db.query(
      `SELECT
         m.id,
         m.channel_id,
         m.text,
         m.created_at,
         c.name as channel_name,
         c.type as channel_type
       FROM message m
       JOIN channel c ON m.channel_id = c.id
       WHERE m.app_id = $1
         AND m.user_id = $2
         AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [auth.appId, supervisedUserId, limit, offset]
    );

    // Get user's channel memberships
    const channelsResult = await db.query(
      `SELECT
         c.id,
         c.name,
         c.type,
         cm.joined_at
       FROM channel_member cm
       JOIN channel c ON cm.channel_id = c.id
       WHERE cm.app_id = $1
         AND cm.user_id = $2
       ORDER BY cm.joined_at DESC`,
      [auth.appId, supervisedUserId]
    );

    // Get recent message reports about this user (moderation flags)
    const reportsResult = await db.query(
      `SELECT
         mr.id,
         mr.reason,
         mr.details,
         mr.status,
         mr.created_at,
         m.text as message_text,
         u.name as reporter_name
       FROM message_report mr
       JOIN message m ON mr.message_id = m.id
       LEFT JOIN app_user u ON mr.reporter_user_id = u.id AND mr.app_id = u.app_id
       WHERE mr.app_id = $1
         AND m.user_id = $2
       ORDER BY mr.created_at DESC
       LIMIT 20`,
      [auth.appId, supervisedUserId]
    );

    return c.json({
      supervisedUserId,
      activity: {
        recentMessages: messagesResult.rows.map((row) => ({
          id: row.id,
          channelId: row.channel_id,
          channelName: row.channel_name,
          channelType: row.channel_type,
          text: row.text,
          createdAt: row.created_at,
        })),
        channels: channelsResult.rows.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          joinedAt: row.joined_at,
        })),
        moderationFlags: reportsResult.rows.map((row) => ({
          id: row.id,
          reason: row.reason,
          details: row.details,
          status: row.status,
          messageText: row.message_text,
          reporterName: row.reporter_name,
          createdAt: row.created_at,
        })),
      },
    });
  }
);

/**
 * Update supervision settings
 * PATCH /api/users/:userId/supervise
 */
supervisionRoutes.patch(
  '/:userId/supervise',
  requireUser,
  zValidator('json', updateSupervisionSchema),
  async (c) => {
    const auth = c.get('auth');
    const supervisedUserId = c.req.param('userId');
    const body = c.req.valid('json');

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (body.monitoringEnabled !== undefined) {
      updates.push(`monitoring_enabled = $${paramCount++}`);
      values.push(body.monitoringEnabled);
    }

    if (body.ageRestriction !== undefined) {
      updates.push(`age_restriction = $${paramCount++}`);
      values.push(body.ageRestriction);
    }

    if (updates.length === 0) {
      return c.json({ error: { message: 'No fields to update' } }, 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(auth.appId, auth.userId, supervisedUserId);

    const result = await db.query(
      `UPDATE supervised_user
       SET ${updates.join(', ')}
       WHERE app_id = $${paramCount}
         AND supervisor_user_id = $${paramCount + 1}
         AND supervised_user_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Supervision relationship not found' } }, 404);
    }

    const supervision = result.rows[0];

    return c.json({
      supervisedUserId: supervision.supervised_user_id,
      monitoringEnabled: supervision.monitoring_enabled,
      ageRestriction: supervision.age_restriction,
      updatedAt: supervision.updated_at,
    });
  }
);

/**
 * Delete supervision relationship
 * DELETE /api/users/:userId/supervise
 */
supervisionRoutes.delete(
  '/:userId/supervise',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const supervisedUserId = c.req.param('userId');

    const result = await db.query(
      `DELETE FROM supervised_user
       WHERE app_id = $1
         AND supervisor_user_id = $2
         AND supervised_user_id = $3
       RETURNING supervised_user_id`,
      [auth.appId, auth.userId, supervisedUserId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Supervision relationship not found' } }, 404);
    }

    return c.json({
      success: true,
      message: 'Supervision relationship deleted',
    });
  }
);
