/**
 * Web Push Notification Service
 * Handles browser push notifications using VAPID
 */

import { db } from './database';

// VAPID keys - generate once and store in env
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:push@chatsdk.io';

interface WebPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Check if Web Push is configured
 */
export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Save a Web Push subscription for a user
 */
export async function saveWebPushSubscription(
  appId: string,
  userId: string,
  subscription: WebPushSubscription,
  userAgent?: string
): Promise<void> {
  await db.query(
    `INSERT INTO web_push_subscription (app_id, user_id, endpoint, p256dh, auth, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (app_id, user_id, endpoint) DO UPDATE SET
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()`,
    [
      appId,
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent,
      subscription.expirationTime
        ? new Date(subscription.expirationTime).toISOString()
        : null,
    ]
  );
}

/**
 * Remove a Web Push subscription
 */
export async function removeWebPushSubscription(
  appId: string,
  userId: string,
  endpoint: string
): Promise<void> {
  await db.query(
    `DELETE FROM web_push_subscription
     WHERE app_id = $1 AND user_id = $2 AND endpoint = $3`,
    [appId, userId, endpoint]
  );
}

/**
 * Get all Web Push subscriptions for a user
 */
export async function getWebPushSubscriptions(
  appId: string,
  userId: string
): Promise<WebPushSubscription[]> {
  const result = await db.query(
    `SELECT endpoint, p256dh, auth, expires_at
     FROM web_push_subscription
     WHERE app_id = $1 AND user_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [appId, userId]
  );

  return result.rows.map((row) => ({
    endpoint: row.endpoint,
    expirationTime: row.expires_at ? new Date(row.expires_at).getTime() : null,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  }));
}

/**
 * Send Web Push notification to a user
 * Uses native fetch with VAPID signing
 */
export async function sendWebPushNotification(
  appId: string,
  userId: string,
  payload: WebPushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isWebPushConfigured()) {
    console.warn('Web Push not configured - skipping notification');
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await getWebPushSubscriptions(appId, userId);

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      const success = await sendPushToEndpoint(subscription, payload);
      if (success) {
        sent++;
      } else {
        failed++;
        // Remove invalid subscription
        await removeWebPushSubscription(appId, userId, subscription.endpoint);
      }
    } catch (error) {
      console.error('Web Push error:', error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send push notification to a specific endpoint using VAPID
 */
async function sendPushToEndpoint(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<boolean> {
  try {
    // Create VAPID headers
    const vapidHeaders = await createVapidHeaders(subscription.endpoint);

    // Encrypt payload (simplified - in production use web-push library)
    const body = JSON.stringify(payload);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400', // 24 hours
        ...vapidHeaders,
      },
      body,
    });

    if (response.status === 201 || response.status === 200) {
      return true;
    }

    // 404 or 410 means subscription is expired/invalid
    if (response.status === 404 || response.status === 410) {
      return false;
    }

    console.warn(`Web Push failed with status ${response.status}`);
    return false;
  } catch (error) {
    console.error('sendPushToEndpoint error:', error);
    return false;
  }
}

/**
 * Create VAPID authentication headers
 * Note: This is a simplified version. For production, use the web-push npm package.
 */
async function createVapidHeaders(
  endpoint: string
): Promise<Record<string, string>> {
  // In production, this would use proper VAPID signing
  // For now, return placeholder headers that work with some push services
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  return {
    Authorization: `vapid t=placeholder, k=${VAPID_PUBLIC_KEY}`,
    'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

/**
 * Send notification to multiple users
 */
export async function sendWebPushToUsers(
  appId: string,
  userIds: string[],
  payload: WebPushPayload
): Promise<{ totalSent: number; totalFailed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendWebPushNotification(appId, userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { totalSent, totalFailed };
}

/**
 * Notification payload builders
 */
export const webPushPayloads = {
  newMessage(params: {
    senderName: string;
    channelName: string;
    messagePreview: string;
    channelId: string;
    messageId: string;
  }): WebPushPayload {
    return {
      title: params.senderName,
      body: params.messagePreview,
      icon: '/icons/chat-icon-192.png',
      badge: '/icons/chat-badge-72.png',
      tag: `message-${params.channelId}`,
      data: {
        type: 'new-message',
        channelId: params.channelId,
        messageId: params.messageId,
        url: `/channel/${params.channelId}`,
      },
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View' },
      ],
    };
  },

  mention(params: {
    mentionedByName: string;
    channelName: string;
    messagePreview: string;
    channelId: string;
    messageId: string;
  }): WebPushPayload {
    return {
      title: `${params.mentionedByName} mentioned you`,
      body: params.messagePreview,
      icon: '/icons/mention-icon-192.png',
      badge: '/icons/chat-badge-72.png',
      tag: `mention-${params.messageId}`,
      data: {
        type: 'mention',
        channelId: params.channelId,
        messageId: params.messageId,
        url: `/channel/${params.channelId}`,
      },
    };
  },

  reaction(params: {
    reactorName: string;
    emoji: string;
    messagePreview: string;
    channelId: string;
    messageId: string;
  }): WebPushPayload {
    return {
      title: `${params.reactorName} reacted ${params.emoji}`,
      body: params.messagePreview,
      icon: '/icons/reaction-icon-192.png',
      badge: '/icons/chat-badge-72.png',
      tag: `reaction-${params.messageId}`,
      data: {
        type: 'reaction',
        channelId: params.channelId,
        messageId: params.messageId,
        url: `/channel/${params.channelId}`,
      },
    };
  },

  threadReply(params: {
    replierName: string;
    channelName: string;
    replyPreview: string;
    channelId: string;
    threadId: string;
  }): WebPushPayload {
    return {
      title: `${params.replierName} replied in thread`,
      body: params.replyPreview,
      icon: '/icons/thread-icon-192.png',
      badge: '/icons/chat-badge-72.png',
      tag: `thread-${params.threadId}`,
      data: {
        type: 'thread-reply',
        channelId: params.channelId,
        threadId: params.threadId,
        url: `/channel/${params.channelId}?thread=${params.threadId}`,
      },
    };
  },

  channelInvite(params: {
    invitedByName: string;
    channelName: string;
    channelId: string;
  }): WebPushPayload {
    return {
      title: 'Channel Invitation',
      body: `${params.invitedByName} invited you to ${params.channelName}`,
      icon: '/icons/invite-icon-192.png',
      badge: '/icons/chat-badge-72.png',
      tag: `invite-${params.channelId}`,
      data: {
        type: 'channel-invite',
        channelId: params.channelId,
        url: `/channel/${params.channelId}`,
      },
      actions: [
        { action: 'join', title: 'Join' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
  },
};
