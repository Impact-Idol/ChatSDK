/**
 * Workspace Templates & Presets Routes
 * Work Stream 17 - TIER 3
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';

export const templatesRoutes = new Hono();

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['conference', 'project', 'team', 'education', 'community']).optional(),
  icon: z.string().max(50).optional(),
  config: z.record(z.unknown()).default({}),
  channels: z.array(z.object({
    name: z.string(),
    type: z.enum(['team', 'group', 'direct']),
    readOnly: z.boolean().optional(),
  })),
  roles: z.array(z.object({
    name: z.string(),
    permissions: z.array(z.string()),
  })).optional(),
  settings: z.record(z.unknown()).optional(),
  isPublic: z.boolean().default(true),
});

const createFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(255),
  expiresAt: z.string().datetime().optional(),
  customConfig: z.record(z.unknown()).optional(),
});

/**
 * Create workspace template
 * POST /api/templates
 */
templatesRoutes.post(
  '/',
  requireUser,
  zValidator('json', createTemplateSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    const result = await db.query(
      `INSERT INTO workspace_template
       (name, description, category, icon, config, channels, roles, settings, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        body.name,
        body.description || null,
        body.category || null,
        body.icon || null,
        JSON.stringify(body.config),
        JSON.stringify(body.channels),
        JSON.stringify(body.roles || []),
        JSON.stringify(body.settings || {}),
        body.isPublic,
        auth.userId,
      ]
    );

    const template = result.rows[0];

    return c.json({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      config: template.config,
      channels: template.channels,
      roles: template.roles,
      settings: template.settings,
      isPublic: template.is_public,
      createdBy: template.created_by,
      usageCount: template.usage_count,
      createdAt: template.created_at,
    }, 201);
  }
);

/**
 * List workspace templates
 * GET /api/templates
 */
templatesRoutes.get(
  '/',
  requireUser,
  async (c) => {
    const category = c.req.query('category');
    const isPublic = c.req.query('isPublic');
    const sortBy = c.req.query('sortBy') || 'created_at'; // created_at, usage_count

    let query = 'SELECT * FROM workspace_template WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    if (isPublic !== undefined) {
      query += ` AND is_public = $${paramCount++}`;
      params.push(isPublic === 'true');
    }

    // Sort
    if (sortBy === 'usage_count') {
      query += ' ORDER BY usage_count DESC, created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await db.query(query, params);

    return c.json({
      templates: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        icon: row.icon,
        config: row.config,
        channels: row.channels,
        roles: row.roles,
        settings: row.settings,
        isPublic: row.is_public,
        createdBy: row.created_by,
        usageCount: row.usage_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  }
);

/**
 * Get template by ID
 * GET /api/templates/:id
 */
templatesRoutes.get(
  '/:id',
  requireUser,
  async (c) => {
    const templateId = c.req.param('id');

    const result = await db.query(
      'SELECT * FROM workspace_template WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Template not found' } }, 404);
    }

    const template = result.rows[0];

    return c.json({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      config: template.config,
      channels: template.channels,
      roles: template.roles,
      settings: template.settings,
      isPublic: template.is_public,
      createdBy: template.created_by,
      usageCount: template.usage_count,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    });
  }
);

/**
 * Create workspace from template
 * POST /api/workspaces/from-template
 */
templatesRoutes.post(
  '/from-template',
  requireUser,
  zValidator('json', createFromTemplateSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Get template
    const templateResult = await db.query(
      'SELECT * FROM workspace_template WHERE id = $1',
      [body.templateId]
    );

    if (templateResult.rows.length === 0) {
      return c.json({ error: { message: 'Template not found' } }, 404);
    }

    const template = templateResult.rows[0];

    // Merge template config with custom config
    const config = {
      ...template.config,
      ...body.customConfig,
    };

    // Create workspace
    const workspaceResult = await db.query(
      `INSERT INTO workspace
       (app_id, name, type, config, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.appId,
        body.name,
        template.category || 'team',
        JSON.stringify(config),
        auth.userId,
        body.expiresAt ? new Date(body.expiresAt) : null,
      ]
    );

    const workspace = workspaceResult.rows[0];

    // Create channels from template
    const channelIds: Record<string, string> = {};

    for (const channelTemplate of template.channels) {
      const channelResult = await db.query(
        `INSERT INTO channel
         (id, app_id, workspace_id, type, name, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          uuidv4(),
          auth.appId,
          workspace.id,
          channelTemplate.type,
          channelTemplate.name,
          auth.userId,
        ]
      );

      channelIds[channelTemplate.name] = channelResult.rows[0].id;

      // Add creator as channel member
      await db.query(
        `INSERT INTO channel_member (channel_id, app_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [channelResult.rows[0].id, auth.appId, auth.userId]
      );
    }

    // Add creator as workspace member
    await db.query(
      `INSERT INTO workspace_member (workspace_id, app_id, user_id, role, is_default)
       VALUES ($1, $2, $3, 'owner', true)`,
      [workspace.id, auth.appId, auth.userId]
    );

    // Increment template usage count
    await db.query(
      'UPDATE workspace_template SET usage_count = usage_count + 1 WHERE id = $1',
      [body.templateId]
    );

    return c.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        config: workspace.config,
        expiresAt: workspace.expires_at,
        createdAt: workspace.created_at,
      },
      channels: Object.entries(channelIds).map(([name, id]) => ({
        id,
        name,
      })),
      templateId: body.templateId,
      templateName: template.name,
    }, 201);
  }
);

/**
 * Update template
 * PATCH /api/templates/:id
 */
templatesRoutes.patch(
  '/:id',
  requireUser,
  zValidator('json', z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    channels: z.array(z.object({
      name: z.string(),
      type: z.enum(['team', 'group', 'direct']),
      readOnly: z.boolean().optional(),
    })).optional(),
    settings: z.record(z.unknown()).optional(),
    isPublic: z.boolean().optional(),
  })),
  async (c) => {
    const auth = c.get('auth');
    const templateId = c.req.param('id');
    const body = c.req.valid('json');

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (body.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(body.name);
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(body.description);
    }

    if (body.channels) {
      updates.push(`channels = $${paramCount++}`);
      values.push(JSON.stringify(body.channels));
    }

    if (body.settings) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(body.settings));
    }

    if (body.isPublic !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(body.isPublic);
    }

    if (updates.length === 0) {
      return c.json({ error: { message: 'No fields to update' } }, 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(templateId);

    const result = await db.query(
      `UPDATE workspace_template
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Template not found' } }, 404);
    }

    const template = result.rows[0];

    return c.json({
      id: template.id,
      name: template.name,
      description: template.description,
      channels: template.channels,
      settings: template.settings,
      isPublic: template.is_public,
      updatedAt: template.updated_at,
    });
  }
);

/**
 * Delete template
 * DELETE /api/templates/:id
 */
templatesRoutes.delete(
  '/:id',
  requireUser,
  async (c) => {
    const templateId = c.req.param('id');

    const result = await db.query(
      'DELETE FROM workspace_template WHERE id = $1 RETURNING id',
      [templateId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Template not found' } }, 404);
    }

    return c.json({ success: true });
  }
);

/**
 * Get built-in templates
 * GET /api/templates/built-in
 */
templatesRoutes.get(
  '/built-in/list',
  requireUser,
  async (c) => {
    const builtInTemplates = [
      {
        id: 'conference-template',
        name: 'Conference',
        description: 'Perfect for virtual or in-person conferences with speakers, attendees, and sessions',
        category: 'conference',
        icon: '🎤',
        channels: [
          { name: 'announcements', type: 'team', readOnly: true },
          { name: 'general', type: 'group' },
          { name: 'help-desk', type: 'group' },
          { name: 'speakers', type: 'private' },
          { name: 'networking', type: 'group' },
        ],
        expiresInDays: 30,
      },
      {
        id: 'project-template',
        name: 'Project',
        description: 'Collaborative project workspace with development, design, and communication channels',
        category: 'project',
        icon: '📁',
        channels: [
          { name: 'general', type: 'team' },
          { name: 'dev', type: 'group' },
          { name: 'design', type: 'group' },
          { name: 'qa', type: 'group' },
        ],
      },
      {
        id: 'team-template',
        name: 'Team',
        description: 'Standard team workspace with general, random, and announcements channels',
        category: 'team',
        icon: '👥',
        channels: [
          { name: 'general', type: 'team' },
          { name: 'random', type: 'group' },
          { name: 'announcements', type: 'team', readOnly: true },
        ],
      },
      {
        id: 'education-template',
        name: 'Education',
        description: 'Learning environment with lectures, assignments, and student discussions',
        category: 'education',
        icon: '🎓',
        channels: [
          { name: 'announcements', type: 'team', readOnly: true },
          { name: 'lectures', type: 'team' },
          { name: 'assignments', type: 'team' },
          { name: 'questions', type: 'group' },
          { name: 'resources', type: 'team' },
        ],
      },
      {
        id: 'community-template',
        name: 'Community',
        description: 'Open community with welcome, introductions, and topic-based channels',
        category: 'community',
        icon: '🌍',
        channels: [
          { name: 'welcome', type: 'team' },
          { name: 'introductions', type: 'group' },
          { name: 'general', type: 'group' },
          { name: 'events', type: 'group' },
          { name: 'off-topic', type: 'group' },
        ],
      },
    ];

    return c.json({ templates: builtInTemplates });
  }
);
