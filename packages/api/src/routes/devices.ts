/**
 * Device Routes
 * Push notification token registration and management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../services/database';
import { requireUser } from '../middleware/auth';
import { updatePushTokens, registerSubscriber } from '../services/novu';

export const deviceRoutes = new Hono();

const registerDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web', 'expo']),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});

/**
 * Register a device for push notifications
 * POST /api/devices
 */
deviceRoutes.post(
  '/',
  requireUser,
  zValidator('json', registerDeviceSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Upsert device token
    await db.query(
      `INSERT INTO device_token (app_id, user_id, token, platform, last_active_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (app_id, user_id, token) DO UPDATE SET
         platform = EXCLUDED.platform,
         last_active_at = NOW()`,
      [auth.appId, auth.userId, body.token, body.platform]
    );

    // Register/update with Novu
    try {
      // Ensure user is a Novu subscriber
      await registerSubscriber({
        id: auth.userId!,
        firstName: auth.user?.name?.split(' ')[0],
        lastName: auth.user?.name?.split(' ').slice(1).join(' '),
        avatar: auth.user?.image,
      });

      // Map platform to Novu provider
      const tokenUpdate: { fcm?: string; apns?: string; expo?: string } = {};

      if (body.platform === 'android') {
        tokenUpdate.fcm = body.token;
      } else if (body.platform === 'ios') {
        tokenUpdate.apns = body.token;
      } else if (body.platform === 'expo') {
        tokenUpdate.expo = body.token;
      }

      if (Object.keys(tokenUpdate).length > 0) {
        await updatePushTokens(auth.userId!, tokenUpdate);
      }
    } catch (error) {
      // Log but don't fail - Novu might not be configured
      console.warn('Failed to register with Novu:', error);
    }

    return c.json({ success: true });
  }
);

/**
 * Unregister a device (logout)
 * DELETE /api/devices/:token
 */
deviceRoutes.delete('/:token', requireUser, async (c) => {
  const auth = c.get('auth');
  const token = decodeURIComponent(c.req.param('token'));

  await db.query(
    `DELETE FROM device_token
     WHERE app_id = $1 AND user_id = $2 AND token = $3`,
    [auth.appId, auth.userId, token]
  );

  return c.json({ success: true });
});

/**
 * Get user's registered devices
 * GET /api/devices
 */
deviceRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT id, platform, last_active_at, created_at
     FROM device_token
     WHERE app_id = $1 AND user_id = $2
     ORDER BY last_active_at DESC`,
    [auth.appId, auth.userId]
  );

  return c.json({
    devices: result.rows.map((d) => ({
      id: d.id,
      platform: d.platform,
      lastActiveAt: d.last_active_at,
      createdAt: d.created_at,
    })),
  });
});

/**
 * Update notification preferences
 * PATCH /api/devices/preferences
 */
const preferencesSchema = z.object({
  newMessages: z.boolean().optional(),
  mentions: z.boolean().optional(),
  reactions: z.boolean().optional(),
  threadReplies: z.boolean().optional(),
  channelInvites: z.boolean().optional(),
  // Quiet hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "22:00"
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "07:00"
});

deviceRoutes.patch(
  '/preferences',
  requireUser,
  zValidator('json', preferencesSchema),
  async (c) => {
    const auth = c.get('auth');
    const prefs = c.req.valid('json');

    // Store preferences in app_user.custom_data
    await db.query(
      `UPDATE app_user
       SET custom_data = custom_data || $3::jsonb
       WHERE app_id = $1 AND id = $2`,
      [auth.appId, auth.userId, JSON.stringify({ notificationPrefs: prefs })]
    );

    return c.json({ success: true, preferences: prefs });
  }
);

/**
 * Get notification preferences
 * GET /api/devices/preferences
 */
deviceRoutes.get('/preferences', requireUser, async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT custom_data->'notificationPrefs' as prefs
     FROM app_user
     WHERE app_id = $1 AND id = $2`,
    [auth.appId, auth.userId]
  );

  const defaultPrefs = {
    newMessages: true,
    mentions: true,
    reactions: true,
    threadReplies: true,
    channelInvites: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };

  return c.json({
    preferences: { ...defaultPrefs, ...(result.rows[0]?.prefs || {}) },
  });
});
