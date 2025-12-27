/**
 * Web Push Routes
 * Browser push notification subscription management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import {
  getVapidPublicKey,
  isWebPushConfigured,
  saveWebPushSubscription,
  removeWebPushSubscription,
  sendWebPushNotification,
  webPushPayloads,
} from '../services/webpush';

export const webPushRoutes = new Hono();

/**
 * Get VAPID public key for client-side subscription
 * GET /api/webpush/vapid-key
 */
webPushRoutes.get('/vapid-key', (c) => {
  if (!isWebPushConfigured()) {
    return c.json({ error: { message: 'Web Push not configured' } }, 503);
  }

  return c.json({
    publicKey: getVapidPublicKey(),
  });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * Subscribe to Web Push notifications
 * POST /api/webpush/subscribe
 */
webPushRoutes.post(
  '/subscribe',
  requireUser,
  zValidator('json', subscriptionSchema),
  async (c) => {
    const auth = c.get('auth');
    const subscription = c.req.valid('json');
    const userAgent = c.req.header('user-agent');

    await saveWebPushSubscription(
      auth.appId,
      auth.userId!,
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
      },
      userAgent
    );

    return c.json({ success: true });
  }
);

/**
 * Unsubscribe from Web Push notifications
 * POST /api/webpush/unsubscribe
 */
webPushRoutes.post(
  '/unsubscribe',
  requireUser,
  zValidator('json', z.object({ endpoint: z.string().url() })),
  async (c) => {
    const auth = c.get('auth');
    const { endpoint } = c.req.valid('json');

    await removeWebPushSubscription(auth.appId, auth.userId!, endpoint);

    return c.json({ success: true });
  }
);

/**
 * Test Web Push notification (for development)
 * POST /api/webpush/test
 */
webPushRoutes.post('/test', requireUser, async (c) => {
  const auth = c.get('auth');

  if (!isWebPushConfigured()) {
    return c.json({ error: { message: 'Web Push not configured' } }, 503);
  }

  const payload = webPushPayloads.newMessage({
    senderName: 'Test User',
    channelName: 'Test Channel',
    messagePreview: 'This is a test notification from ChatSDK!',
    channelId: 'test-channel',
    messageId: 'test-message',
  });

  const result = await sendWebPushNotification(auth.appId, auth.userId!, payload);

  if (result.sent === 0 && result.failed === 0) {
    return c.json({
      success: false,
      message: 'No subscriptions found. Enable notifications in your browser first.',
    });
  }

  return c.json({
    success: result.sent > 0,
    sent: result.sent,
    failed: result.failed,
  });
});
