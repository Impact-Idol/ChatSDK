/**
 * Moderation Routes
 * Message reporting and moderation queue
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';

export const moderationRoutes = new Hono();

const reportSchema = z.object({
  reason: z.enum(['harassment', 'spam', 'inappropriate', 'violence', 'hate_speech']),
  details: z.string().max(1000).optional(),
});

const reviewSchema = z.object({
  action: z.enum(['delete_message', 'warn_user', 'ban_user', 'dismiss']),
  adminNotes: z.string().max(1000).optional(),
});

/**
 * Report a message
 * POST /api/messages/:messageId/report
 */
moderationRoutes.post(
  '/:messageId/report',
  requireUser,
  zValidator('json', reportSchema),
  async (c) => {
    const auth = c.get('auth');
    const messageId = c.req.param('messageId');
    const body = c.req.valid('json');

    // Verify message exists
    const messageCheck = await db.query(
      `SELECT m.id, m.user_id, m.channel_id
       FROM message m
       WHERE m.id = $1 AND m.app_id = $2`,
      [messageId, auth.appId]
    );

    if (messageCheck.rows.length === 0) {
      return c.json({ error: { message: 'Message not found' } }, 404);
    }

    const message = messageCheck.rows[0];

    // Don't allow reporting own messages
    if (message.user_id === auth.userId) {
      return c.json({ error: { message: 'Cannot report your own messages' } }, 400);
    }

    // Check if already reported by this user
    const existingReport = await db.query(
      `SELECT id FROM message_report
       WHERE message_id = $1 AND app_id = $2 AND reporter_user_id = $3`,
      [messageId, auth.appId, auth.userId]
    );

    if (existingReport.rows.length > 0) {
      return c.json({ error: { message: 'You have already reported this message' } }, 400);
    }

    // Create report
    const result = await db.query(
      `INSERT INTO message_report (message_id, app_id, reporter_user_id, reason, details, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [messageId, auth.appId, auth.userId, body.reason, body.details]
    );

    const report = result.rows[0];

    return c.json({
      id: report.id,
      messageId: report.message_id,
      reason: report.reason,
      status: report.status,
      createdAt: report.created_at,
    });
  }
);

/**
 * Get moderation reports (admin only)
 * GET /api/moderation/reports
 */
moderationRoutes.get('/reports', requireUser, async (c) => {
  const auth = c.get('auth');
  const status = c.req.query('status'); // pending, reviewed, actioned, dismissed
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Check if user is admin (this is a simplified check - you should have proper admin roles)
  // For now, we'll check if user has custom_data.is_admin = true
  const adminCheck = await db.query(
    `SELECT custom_data->>'is_admin' as is_admin
     FROM app_user
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 'true') {
    return c.json({ error: { message: 'Admin access required' } }, 403);
  }

  let query = `
    SELECT
      r.*,
      reporter.name as reporter_name,
      reporter.image_url as reporter_image,
      m.text as message_text,
      m.user_id as message_author_id,
      author.name as message_author_name,
      author.image_url as message_author_image,
      m.channel_id,
      c.name as channel_name
    FROM message_report r
    JOIN app_user reporter ON r.app_id = reporter.app_id AND r.reporter_user_id = reporter.id
    JOIN message m ON r.message_id = m.id
    JOIN app_user author ON m.app_id = author.app_id AND m.user_id = author.id
    JOIN channel c ON m.channel_id = c.id
    WHERE r.app_id = $1
  `;

  const params: any[] = [auth.appId];
  let paramCount = 2;

  if (status) {
    query += ` AND r.status = $${paramCount++}`;
    params.push(status);
  }

  query += ` ORDER BY r.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  const reports = result.rows.map((row) => ({
    id: row.id,
    messageId: row.message_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    reporter: {
      id: row.reporter_user_id,
      name: row.reporter_name,
      image: row.reporter_image,
    },
    message: {
      text: row.message_text,
      author: {
        id: row.message_author_id,
        name: row.message_author_name,
        image: row.message_author_image,
      },
      channelId: row.channel_id,
      channelName: row.channel_name,
    },
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    actionTaken: row.action_taken,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
  }));

  return c.json({ reports, total: reports.length });
});

/**
 * Review and action a report (admin only)
 * PUT /api/moderation/reports/:id/review
 */
moderationRoutes.put(
  '/reports/:id/review',
  requireUser,
  zValidator('json', reviewSchema),
  async (c) => {
    const auth = c.get('auth');
    const reportId = c.req.param('id');
    const body = c.req.valid('json');

    // Check if user is admin
    const adminCheck = await db.query(
      `SELECT custom_data->>'is_admin' as is_admin
       FROM app_user
       WHERE app_id = $1 AND id = $2`,
      [auth.appId, auth.userId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 'true') {
      return c.json({ error: { message: 'Admin access required' } }, 403);
    }

    // Get report and message details
    const reportResult = await db.query(
      `SELECT r.*, m.user_id as message_author_id, m.id as message_id
       FROM message_report r
       JOIN message m ON r.message_id = m.id
       WHERE r.id = $1 AND r.app_id = $2`,
      [reportId, auth.appId]
    );

    if (reportResult.rows.length === 0) {
      return c.json({ error: { message: 'Report not found' } }, 404);
    }

    const report = reportResult.rows[0];

    // Perform action
    let newStatus = 'reviewed';
    if (body.action !== 'dismiss') {
      newStatus = 'actioned';
    }

    switch (body.action) {
      case 'delete_message':
        // Soft delete the message
        await db.query(
          `UPDATE message SET deleted_at = NOW() WHERE id = $1`,
          [report.message_id]
        );
        break;

      case 'warn_user':
        // Update user's custom_data to track warnings
        await db.query(
          `UPDATE app_user
           SET custom_data = custom_data || jsonb_build_object(
             'warnings',
             COALESCE((custom_data->'warnings')::int, 0) + 1
           )
           WHERE app_id = $1 AND id = $2`,
          [auth.appId, report.message_author_id]
        );
        break;

      case 'ban_user':
        // Mark user as banned
        await db.query(
          `UPDATE app_user
           SET custom_data = custom_data || '{"banned": true}'::jsonb
           WHERE app_id = $1 AND id = $2`,
          [auth.appId, report.message_author_id]
        );
        break;

      case 'dismiss':
        // No action needed
        break;
    }

    // Update report
    const updateResult = await db.query(
      `UPDATE message_report
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), action_taken = $3, admin_notes = $4
       WHERE id = $5
       RETURNING *`,
      [newStatus, auth.userId, body.action, body.adminNotes, reportId]
    );

    const updatedReport = updateResult.rows[0];

    return c.json({
      id: updatedReport.id,
      status: updatedReport.status,
      reviewedBy: updatedReport.reviewed_by,
      reviewedAt: updatedReport.reviewed_at,
      actionTaken: updatedReport.action_taken,
      adminNotes: updatedReport.admin_notes,
    });
  }
);

/**
 * Get report by ID (admin only)
 * GET /api/moderation/reports/:id
 */
moderationRoutes.get('/reports/:id', requireUser, async (c) => {
  const auth = c.get('auth');
  const reportId = c.req.param('id');

  // Check if user is admin
  const adminCheck = await db.query(
    `SELECT custom_data->>'is_admin' as is_admin
     FROM app_user
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 'true') {
    return c.json({ error: { message: 'Admin access required' } }, 403);
  }

  const result = await db.query(
    `SELECT
      r.*,
      reporter.name as reporter_name,
      reporter.image_url as reporter_image,
      m.text as message_text,
      m.user_id as message_author_id,
      author.name as message_author_name,
      author.image_url as message_author_image,
      m.channel_id,
      c.name as channel_name
    FROM message_report r
    JOIN app_user reporter ON r.app_id = reporter.app_id AND r.reporter_user_id = reporter.id
    JOIN message m ON r.message_id = m.id
    JOIN app_user author ON m.app_id = author.app_id AND m.user_id = author.id
    JOIN channel c ON m.channel_id = c.id
    WHERE r.id = $1 AND r.app_id = $2`,
    [reportId, auth.appId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Report not found' } }, 404);
  }

  const row = result.rows[0];

  return c.json({
    id: row.id,
    messageId: row.message_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    reporter: {
      id: row.reporter_user_id,
      name: row.reporter_name,
      image: row.reporter_image,
    },
    message: {
      text: row.message_text,
      author: {
        id: row.message_author_id,
        name: row.message_author_name,
        image: row.message_author_image,
      },
      channelId: row.channel_id,
      channelName: row.channel_name,
    },
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    actionTaken: row.action_taken,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
  });
});
