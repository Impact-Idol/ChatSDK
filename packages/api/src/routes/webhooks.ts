/**
 * Webhooks & Event System Routes
 * Work Stream 21 - TIER 4
 *
 * Allows external services to subscribe to ChatSDK events with:
 * - HMAC signature verification
 * - Retry logic with exponential backoff
 * - Event filtering
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';
import crypto from 'crypto';

export const webhooksRoutes = new Hono();

const EVENT_TYPES = [
  'message.new',
  'message.updated',
  'message.deleted',
  'channel.created',
  'channel.updated',
  'channel.deleted',
  'user.joined',
  'user.left',
  'reaction.added',
  'reaction.removed',
  'typing.start',
  'typing.stop',
  'presence.changed',
  'message.read',
  'message.reported',
] as const;

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(EVENT_TYPES)).min(1),
  description: z.string().max(500).optional(),
  secret: z.string().min(16).max(255).optional(), // Auto-generated if not provided
  enabled: z.boolean().default(true),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(EVENT_TYPES)).min(1).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
});

/**
 * Register a webhook
 * POST /api/webhooks
 */
webhooksRoutes.post(
  '/',
  requireUser,
  zValidator('json', createWebhookSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Generate secret if not provided
    const secret = body.secret || crypto.randomBytes(32).toString('hex');

    const result = await db.query(
      `INSERT INTO webhook
       (app_id, url, events, description, secret, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth.appId,
        body.url,
        JSON.stringify(body.events),
        body.description || null,
        secret,
        body.enabled,
        auth.userId,
      ]
    );

    const webhook = result.rows[0];

    return c.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      secret: webhook.secret, // Only returned on creation
      enabled: webhook.enabled,
      createdBy: webhook.created_by,
      createdAt: webhook.created_at,
    }, 201);
  }
);

/**
 * List webhooks
 * GET /api/webhooks
 */
webhooksRoutes.get(
  '/',
  requireUser,
  async (c) => {
    const auth = c.get('auth');

    const result = await db.query(
      `SELECT id, url, events, description, enabled, failure_count, last_failure_at, created_at, updated_at
       FROM webhook
       WHERE app_id = $1
       ORDER BY created_at DESC`,
      [auth.appId]
    );

    return c.json({
      webhooks: result.rows.map((row) => ({
        id: row.id,
        url: row.url,
        events: row.events,
        description: row.description,
        enabled: row.enabled,
        failureCount: row.failure_count,
        lastFailureAt: row.last_failure_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  }
);

/**
 * Get webhook by ID
 * GET /api/webhooks/:id
 */
webhooksRoutes.get(
  '/:id',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const webhookId = c.req.param('id');

    const result = await db.query(
      `SELECT id, url, events, description, enabled, failure_count, last_failure_at, created_at, updated_at
       FROM webhook
       WHERE id = $1 AND app_id = $2`,
      [webhookId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Webhook not found' } }, 404);
    }

    const webhook = result.rows[0];

    return c.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      enabled: webhook.enabled,
      failureCount: webhook.failure_count,
      lastFailureAt: webhook.last_failure_at,
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at,
    });
  }
);

/**
 * Update webhook
 * PATCH /api/webhooks/:id
 */
webhooksRoutes.patch(
  '/:id',
  requireUser,
  zValidator('json', updateWebhookSchema),
  async (c) => {
    const auth = c.get('auth');
    const webhookId = c.req.param('id');
    const body = c.req.valid('json');

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (body.url) {
      updates.push(`url = $${paramCount++}`);
      values.push(body.url);
    }

    if (body.events) {
      updates.push(`events = $${paramCount++}`);
      values.push(JSON.stringify(body.events));
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(body.description);
    }

    if (body.enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(body.enabled);
    }

    if (updates.length === 0) {
      return c.json({ error: { message: 'No fields to update' } }, 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(webhookId, auth.appId);

    const result = await db.query(
      `UPDATE webhook
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND app_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Webhook not found' } }, 404);
    }

    const webhook = result.rows[0];

    return c.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      enabled: webhook.enabled,
      updatedAt: webhook.updated_at,
    });
  }
);

/**
 * Delete webhook
 * DELETE /api/webhooks/:id
 */
webhooksRoutes.delete(
  '/:id',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const webhookId = c.req.param('id');

    const result = await db.query(
      'DELETE FROM webhook WHERE id = $1 AND app_id = $2 RETURNING id',
      [webhookId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Webhook not found' } }, 404);
    }

    return c.json({ success: true });
  }
);

/**
 * Regenerate webhook secret
 * POST /api/webhooks/:id/regenerate-secret
 */
webhooksRoutes.post(
  '/:id/regenerate-secret',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const webhookId = c.req.param('id');

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    const result = await db.query(
      `UPDATE webhook
       SET secret = $1, updated_at = NOW()
       WHERE id = $2 AND app_id = $3
       RETURNING secret`,
      [newSecret, webhookId, auth.appId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: { message: 'Webhook not found' } }, 404);
    }

    return c.json({
      secret: result.rows[0].secret,
      message: 'Secret regenerated successfully. Update your webhook consumer with this new secret.',
    });
  }
);

/**
 * Test webhook
 * POST /api/webhooks/:id/test
 */
webhooksRoutes.post(
  '/:id/test',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const webhookId = c.req.param('id');

    // Get webhook
    const webhookResult = await db.query(
      'SELECT * FROM webhook WHERE id = $1 AND app_id = $2',
      [webhookId, auth.appId]
    );

    if (webhookResult.rows.length === 0) {
      return c.json({ error: { message: 'Webhook not found' } }, 404);
    }

    const webhook = webhookResult.rows[0];

    // Send test event
    const testPayload = {
      event: 'webhook.test',
      created_at: new Date().toISOString(),
      app_id: auth.appId,
      data: {
        message: 'This is a test webhook event from ChatSDK',
      },
    };

    try {
      const signature = generateSignature(testPayload, webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ChatSDK-Signature': signature,
          'X-ChatSDK-Event': 'webhook.test',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        return c.json({
          success: true,
          message: 'Test event sent successfully',
          statusCode: response.status,
        });
      } else {
        return c.json({
          success: false,
          message: 'Test event failed',
          statusCode: response.status,
          error: await response.text().catch(() => 'Unknown error'),
        }, 500);
      }
    } catch (error: any) {
      return c.json({
        success: false,
        message: 'Failed to send test event',
        error: error.message,
      }, 500);
    }
  }
);

/**
 * Get webhook delivery history
 * GET /api/webhooks/:id/deliveries
 */
webhooksRoutes.get(
  '/:id/deliveries',
  requireUser,
  async (c) => {
    const auth = c.get('auth');
    const webhookId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // Verify webhook ownership
    const webhookResult = await db.query(
      'SELECT id FROM webhook WHERE id = $1 AND app_id = $2',
      [webhookId, auth.appId]
    );

    if (webhookResult.rows.length === 0) {
      return c.json({ error: { message: 'Webhook not found' } }, 404);
    }

    const result = await db.query(
      `SELECT *
       FROM webhook_delivery
       WHERE webhook_id = $1
       ORDER BY attempted_at DESC
       LIMIT $2 OFFSET $3`,
      [webhookId, limit, offset]
    );

    return c.json({
      deliveries: result.rows.map((row) => ({
        id: row.id,
        webhookId: row.webhook_id,
        event: row.event,
        success: row.success,
        statusCode: row.status_code,
        errorMessage: row.error_message,
        retryCount: row.retry_count,
        attemptedAt: row.attempted_at,
      })),
      limit,
      offset,
    });
  }
);

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(payload: any, secret: string): string {
  const payloadString = JSON.stringify(payload);
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
