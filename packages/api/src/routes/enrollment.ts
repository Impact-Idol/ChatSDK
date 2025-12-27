/**
 * Auto-Enrollment Rules Engine Routes
 * Work Stream 16 - TIER 3
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';

export const enrollmentRoutes = new Hono();

const createRuleSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  ruleType: z.enum(['all_users', 'role_based', 'tag_based', 'event_trigger', 'attribute_match']),
  conditions: z.record(z.unknown()),
  actions: z.record(z.unknown()),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

const updateRuleSchema = z.object({
  conditions: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

/**
 * Create enrollment rule
 * POST /api/enrollment/rules
 */
enrollmentRoutes.post(
  '/rules',
  requireUser,
  zValidator('json', createRuleSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Validate workspace if specified
    if (body.workspaceId) {
      const workspaceResult = await db.query(
        'SELECT id FROM workspace WHERE id = $1 AND app_id = $2',
        [body.workspaceId, auth.appId]
      );
      if (workspaceResult.rows.length === 0) {
        return c.json({ error: { message: 'Workspace not found' } }, 404);
      }
    }

    // Validate channel if specified
    if (body.channelId) {
      const channelResult = await db.query(
        'SELECT id FROM channel WHERE id = $1 AND app_id = $2',
        [body.channelId, auth.appId]
      );
      if (channelResult.rows.length === 0) {
        return c.json({ error: { message: 'Channel not found' } }, 404);
      }
    }

    const result = await db.query(
      `INSERT INTO enrollment_rule
       (app_id, workspace_id, channel_id, rule_type, conditions, actions, priority, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        auth.appId,
        body.workspaceId || null,
        body.channelId || null,
        body.ruleType,
        JSON.stringify(body.conditions),
        JSON.stringify(body.actions),
        body.priority,
        body.enabled,
        auth.userId,
      ]
    );

    const rule = result.rows[0];

    return c.json({
      id: rule.id,
      workspaceId: rule.workspace_id,
      channelId: rule.channel_id,
      ruleType: rule.rule_type,
      conditions: rule.conditions,
      actions: rule.actions,
      priority: rule.priority,
      enabled: rule.enabled,
      createdBy: rule.created_by,
      createdAt: rule.created_at,
    }, 201);
  }
);

/**
 * List enrollment rules
 * GET /api/enrollment/rules
 */
enrollmentRoutes.get(
  '/rules',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const workspaceId = c.req.query('workspaceId');
    const channelId = c.req.query('channelId');
    const enabled = c.req.query('enabled');

    let query = `
      SELECT r.*, u.name as created_by_name
      FROM enrollment_rule r
      LEFT JOIN app_user u ON r.created_by = u.id AND r.app_id = u.app_id
      WHERE r.app_id = $1
    `;
    const params: any[] = [auth.appId];
    let paramCount = 2;

    if (workspaceId) {
      query += ` AND r.workspace_id = $${paramCount++}`;
      params.push(workspaceId);
    }

    if (channelId) {
      query += ` AND r.channel_id = $${paramCount++}`;
      params.push(channelId);
    }

    if (enabled !== undefined) {
      query += ` AND r.enabled = $${paramCount++}`;
      params.push(enabled === 'true');
    }

    query += ' ORDER BY r.priority DESC, r.created_at DESC';

    const result = await db.query(query, params);

    return c.json({
      rules: result.rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        channelId: row.channel_id,
        ruleType: row.rule_type,
        conditions: row.conditions,
        actions: row.actions,
        priority: row.priority,
        enabled: row.enabled,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  }
);

/**
 * Get enrollment rule by ID
 * GET /api/enrollment/rules/:id
 */
enrollmentRoutes.get(
  '/rules/:id',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const ruleId = c.req.param('id');

    const result = await db.query(
      `SELECT r.*, u.name as created_by_name
       FROM enrollment_rule r
       LEFT JOIN app_user u ON r.created_by = u.id AND r.app_id = u.app_id
       WHERE r.id = $1 AND r.app_id = $2`,
      [ruleId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Rule not found' } }, 404);
    }

    const rule = result.rows[0];

    return c.json({
      id: rule.id,
      workspaceId: rule.workspace_id,
      channelId: rule.channel_id,
      ruleType: rule.rule_type,
      conditions: rule.conditions,
      actions: rule.actions,
      priority: rule.priority,
      enabled: rule.enabled,
      createdBy: rule.created_by,
      createdByName: rule.created_by_name,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
    });
  }
);

/**
 * Update enrollment rule
 * PATCH /api/enrollment/rules/:id
 */
enrollmentRoutes.patch(
  '/rules/:id',
  requireUser,
  zValidator('json', updateRuleSchema),
  async (c) => {
    const auth = c.get('auth');
    const ruleId = c.req.param('id');
    const body = c.req.valid('json');

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (body.conditions) {
      updates.push(`conditions = $${paramCount++}`);
      values.push(JSON.stringify(body.conditions));
    }

    if (body.actions) {
      updates.push(`actions = $${paramCount++}`);
      values.push(JSON.stringify(body.actions));
    }

    if (body.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(body.priority);
    }

    if (body.enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(body.enabled);
    }

    if (updates.length === 0) {
      return c.json({ error: { message: 'No fields to update' } }, 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(ruleId, auth.appId);

    const result = await db.query(
      `UPDATE enrollment_rule
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND app_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Rule not found' } }, 404);
    }

    const rule = result.rows[0];

    return c.json({
      id: rule.id,
      conditions: rule.conditions,
      actions: rule.actions,
      priority: rule.priority,
      enabled: rule.enabled,
      updatedAt: rule.updated_at,
    });
  }
);

/**
 * Delete enrollment rule
 * DELETE /api/enrollment/rules/:id
 */
enrollmentRoutes.delete(
  '/rules/:id',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const ruleId = c.req.param('id');

    const result = await db.query(
      'DELETE FROM enrollment_rule WHERE id = $1 AND app_id = $2 RETURNING id',
      [ruleId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Rule not found' } }, 404);
    }

    return c.json({ success: true });
  }
);

/**
 * Execute enrollment rules for a user
 * POST /api/enrollment/execute
 */
enrollmentRoutes.post(
  '/execute',
  requireUser,
  zValidator('json', z.object({ userId: z.string() })),
  async (c) => {
    const auth = c.get('auth');
    const { userId } = c.req.valid('json');

    // Get user data
    const userResult = await db.query(
      'SELECT * FROM app_user WHERE app_id = $1 AND id = $2',
      [auth.appId, userId]
    );

    if (userResult.rows.length === 0) {
      return c.json({ error: { message: 'User not found' } }, 404);
    }

    const user = userResult.rows[0];

    // Get all enabled rules ordered by priority
    const rulesResult = await db.query(
      `SELECT * FROM enrollment_rule
       WHERE app_id = $1 AND enabled = true
       ORDER BY priority DESC, created_at ASC`,
      [auth.appId]
    );

    const executionResults = [];

    for (const rule of rulesResult.rows) {
      try {
        // Evaluate conditions
        const conditionsMet = evaluateConditions(rule.conditions, user);

        if (conditionsMet) {
          // Execute actions
          await executeActions(rule.actions, userId, auth.appId);

          // Log execution
          await db.query(
            `INSERT INTO enrollment_execution
             (rule_id, app_id, user_id, success)
             VALUES ($1, $2, $3, true)`,
            [rule.id, auth.appId, userId]
          );

          executionResults.push({
            ruleId: rule.id,
            ruleType: rule.rule_type,
            executed: true,
            success: true,
          });
        }
      } catch (error: any) {
        // Log failed execution
        await db.query(
          `INSERT INTO enrollment_execution
           (rule_id, app_id, user_id, success, error_message)
           VALUES ($1, $2, $3, false, $4)`,
          [rule.id, auth.appId, userId, error.message]
        );

        executionResults.push({
          ruleId: rule.id,
          ruleType: rule.rule_type,
          executed: true,
          success: false,
          error: error.message,
        });
      }
    }

    return c.json({
      userId,
      rulesExecuted: executionResults.length,
      results: executionResults,
    });
  }
);

/**
 * Get enrollment execution history
 * GET /api/enrollment/history
 */
enrollmentRoutes.get(
  '/history',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const userId = c.req.query('userId');
    const ruleId = c.req.query('ruleId');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    let query = `
      SELECT
        ee.*,
        er.rule_type,
        u.name as user_name
      FROM enrollment_execution ee
      JOIN enrollment_rule er ON ee.rule_id = er.id
      LEFT JOIN app_user u ON ee.user_id = u.id AND ee.app_id = u.app_id
      WHERE ee.app_id = $1
    `;
    const params: any[] = [auth.appId];
    let paramCount = 2;

    if (userId) {
      query += ` AND ee.user_id = $${paramCount++}`;
      params.push(userId);
    }

    if (ruleId) {
      query += ` AND ee.rule_id = $${paramCount++}`;
      params.push(ruleId);
    }

    query += ` ORDER BY ee.executed_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return c.json({
      executions: result.rows.map((row) => ({
        id: row.id,
        ruleId: row.rule_id,
        ruleType: row.rule_type,
        userId: row.user_id,
        userName: row.user_name,
        success: row.success,
        errorMessage: row.error_message,
        executedAt: row.executed_at,
      })),
      limit,
      offset,
    });
  }
);

/**
 * Helper: Evaluate rule conditions against user data
 */
function evaluateConditions(conditions: any, user: any): boolean {
  // all_users - always true
  if (conditions.all === true) {
    return true;
  }

  // role_based
  if (conditions.role && user.custom?.role !== conditions.role) {
    return false;
  }

  // tag_based
  if (conditions.tags && Array.isArray(conditions.tags)) {
    const userTags = user.custom?.tags || [];
    if (!conditions.tags.some((tag: string) => userTags.includes(tag))) {
      return false;
    }
  }

  // attribute_match
  if (conditions.attributes) {
    for (const [key, value] of Object.entries(conditions.attributes)) {
      if (user.custom?.[key] !== value) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Helper: Execute rule actions
 */
async function executeActions(actions: any, userId: string, appId: string): Promise<void> {
  // Add to channel
  if (actions.add_to_channel) {
    await db.query(
      `INSERT INTO channel_member (channel_id, app_id, user_id, role)
       VALUES ($1, $2, $3, 'member')
       ON CONFLICT DO NOTHING`,
      [actions.add_to_channel, appId, userId]
    );
  }

  // Add to workspace
  if (actions.add_to_workspace) {
    await db.query(
      `INSERT INTO workspace_member (workspace_id, app_id, user_id, role)
       VALUES ($1, $2, $3, 'member')
       ON CONFLICT DO NOTHING`,
      [actions.add_to_workspace, appId, userId]
    );
  }

  // Assign role
  if (actions.assign_role) {
    await db.query(
      `UPDATE app_user
       SET custom = jsonb_set(COALESCE(custom, '{}'::jsonb), '{role}', $1)
       WHERE app_id = $2 AND id = $3`,
      [JSON.stringify(actions.assign_role), appId, userId]
    );
  }

  // Send welcome message (placeholder - would integrate with message API)
  if (actions.send_message) {
    // TODO: Integrate with message sending API
    console.log(`Sending welcome message to ${userId}: ${actions.send_message}`);
  }
}
