/**
 * Novu Notification Service
 * Handles push notifications, email, SMS delivery via Novu
 *
 * Supports multi-tenant deployments via NOVU_TENANT_ID prefix.
 * See: https://docs.novu.co/concepts/tenants
 */

import { Novu } from '@novu/api';

// Novu client singleton
let novu: Novu | null = null;

// Configuration from environment
const config = {
  secretKey: process.env.NOVU_SECRET_KEY || '',
  serverUrl: process.env.NOVU_API_URL || 'http://localhost:3000',
  // Multi-tenant support: prefix subscriber IDs for isolation
  tenantId: process.env.NOVU_TENANT_ID || '',
};

// Configurable workflow IDs (allows alignment with existing Novu workflows)
const workflows = {
  newMessage: process.env.NOVU_WORKFLOW_NEW_MESSAGE || 'new-message',
  mention: process.env.NOVU_WORKFLOW_MENTION || 'mention',
  channelInvite: process.env.NOVU_WORKFLOW_CHANNEL_INVITE || 'channel-invite',
  reaction: process.env.NOVU_WORKFLOW_REACTION || 'reaction',
  threadReply: process.env.NOVU_WORKFLOW_THREAD_REPLY || 'thread-reply',
};

/**
 * Check if Novu is configured
 * Returns false if NOVU_SECRET_KEY is not set
 */
export function isNovuConfigured(): boolean {
  return !!config.secretKey;
}

/**
 * Get tenant-prefixed subscriber ID for multi-tenant isolation
 * Returns raw userId if NOVU_TENANT_ID is not set (backwards compatible)
 */
function getTenantSubscriberId(userId: string): string {
  if (!config.tenantId) return userId;
  return `${config.tenantId}:${userId}`;
}

/**
 * Initialize Novu client
 */
export async function initNovu(): Promise<Novu | null> {
  if (novu) return novu;

  if (!isNovuConfigured()) {
    console.warn('[ChatSDK Novu] NOVU_SECRET_KEY not set - notifications disabled');
    return null;
  }

  novu = new Novu({
    secretKey: config.secretKey,
    serverURL: config.serverUrl,
  });

  console.log('[ChatSDK Novu] Initialized', {
    serverUrl: config.serverUrl,
    tenantId: config.tenantId || '(none - using raw user IDs)',
    workflows: Object.entries(workflows).map(([k, v]) => `${k}=${v}`).join(', '),
  });

  return novu;
}

/**
 * Get Novu client
 */
export function getNovu(): Novu {
  if (!novu) {
    throw new Error('Novu not initialized. Call initNovu() first.');
  }
  return novu;
}

/**
 * Notification trigger types (now configurable via environment)
 */
export type NotificationTrigger =
  | 'new-message'
  | 'mention'
  | 'channel-invite'
  | 'reaction'
  | 'thread-reply';

/**
 * Get the configured workflow ID for a trigger type
 */
function getWorkflowId(trigger: NotificationTrigger): string {
  const mapping: Record<NotificationTrigger, string> = {
    'new-message': workflows.newMessage,
    'mention': workflows.mention,
    'channel-invite': workflows.channelInvite,
    'reaction': workflows.reaction,
    'thread-reply': workflows.threadReply,
  };
  return mapping[trigger];
}

/**
 * Register or update a subscriber (user) in Novu
 * Handles "already exists" gracefully for cases where the main app registers subscribers
 */
export async function registerSubscriber(user: {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
}): Promise<void> {
  if (!isNovuConfigured()) {
    console.debug('[ChatSDK Novu] Not configured, skipping subscriber registration');
    return;
  }

  try {
    const client = getNovu();
    const subscriberId = getTenantSubscriberId(user.id);

    await client.subscribers.create({
      subscriberId,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      locale: user.locale || 'en',
      data: config.tenantId ? {
        tenantId: config.tenantId,
        originalUserId: user.id,
      } : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Handle "already exists" gracefully - subscriber may be registered by main app
    if (msg.toLowerCase().includes('already exist')) {
      console.debug('[ChatSDK Novu] Subscriber already exists:', user.id);
      return;
    }
    console.error('[ChatSDK Novu] Failed to register subscriber:', msg);
  }
}

/**
 * Update subscriber's device tokens for push notifications
 */
export async function updatePushTokens(
  userId: string,
  tokens: {
    fcm?: string;
    apns?: string;
    expo?: string;
  }
): Promise<void> {
  if (!isNovuConfigured()) {
    console.debug('[ChatSDK Novu] Not configured, skipping push token update');
    return;
  }

  try {
    const client = getNovu();
    const subscriberId = getTenantSubscriberId(userId);

    // FCM (Firebase Cloud Messaging) for Android
    if (tokens.fcm) {
      await client.subscribers.credentials.update(
        {
          providerId: 'fcm',
          credentials: {
            deviceTokens: [tokens.fcm],
          },
        },
        subscriberId
      );
    }

    // APNs (Apple Push Notification service) for iOS
    if (tokens.apns) {
      await client.subscribers.credentials.update(
        {
          providerId: 'apns',
          credentials: {
            deviceTokens: [tokens.apns],
          },
        },
        subscriberId
      );
    }

    // Expo Push for React Native
    if (tokens.expo) {
      await client.subscribers.credentials.update(
        {
          providerId: 'expo',
          credentials: {
            deviceTokens: [tokens.expo],
          },
        },
        subscriberId
      );
    }
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to update push tokens:', error instanceof Error ? error.message : error);
  }
}

/**
 * Trigger a new message notification
 */
export async function notifyNewMessage(params: {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  channelId: string;
  channelName: string;
  messagePreview: string;
  messageId: string;
}): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();

    await client.trigger({
      workflowId: getWorkflowId('new-message'),
      to: {
        subscriberId: getTenantSubscriberId(params.recipientId),
      },
      payload: {
        senderId: params.senderId,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar,
        channelId: params.channelId,
        channelName: params.channelName,
        messagePreview: truncate(params.messagePreview, 100),
        messageId: params.messageId,
      },
    });
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to send new message notification:', error instanceof Error ? error.message : error);
  }
}

/**
 * Trigger a mention notification
 */
export async function notifyMention(params: {
  recipientId: string;
  mentionedBy: string;
  mentionedByName: string;
  channelId: string;
  channelName: string;
  messagePreview: string;
  messageId: string;
}): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();

    await client.trigger({
      workflowId: getWorkflowId('mention'),
      to: {
        subscriberId: getTenantSubscriberId(params.recipientId),
      },
      payload: {
        mentionedBy: params.mentionedBy,
        mentionedByName: params.mentionedByName,
        channelId: params.channelId,
        channelName: params.channelName,
        messagePreview: truncate(params.messagePreview, 100),
        messageId: params.messageId,
      },
    });
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to send mention notification:', error instanceof Error ? error.message : error);
  }
}

/**
 * Trigger a channel invite notification
 */
export async function notifyChannelInvite(params: {
  recipientId: string;
  invitedBy: string;
  invitedByName: string;
  channelId: string;
  channelName: string;
  channelDescription?: string;
}): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();

    await client.trigger({
      workflowId: getWorkflowId('channel-invite'),
      to: {
        subscriberId: getTenantSubscriberId(params.recipientId),
      },
      payload: {
        invitedBy: params.invitedBy,
        invitedByName: params.invitedByName,
        channelId: params.channelId,
        channelName: params.channelName,
        channelDescription: params.channelDescription,
      },
    });
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to send channel invite notification:', error instanceof Error ? error.message : error);
  }
}

/**
 * Trigger a reaction notification
 */
export async function notifyReaction(params: {
  recipientId: string;
  reactorId: string;
  reactorName: string;
  emoji: string;
  channelId: string;
  messagePreview: string;
  messageId: string;
}): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();

    await client.trigger({
      workflowId: getWorkflowId('reaction'),
      to: {
        subscriberId: getTenantSubscriberId(params.recipientId),
      },
      payload: {
        reactorId: params.reactorId,
        reactorName: params.reactorName,
        emoji: params.emoji,
        channelId: params.channelId,
        messagePreview: truncate(params.messagePreview, 50),
        messageId: params.messageId,
      },
    });
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to send reaction notification:', error instanceof Error ? error.message : error);
  }
}

/**
 * Trigger a thread reply notification
 */
export async function notifyThreadReply(params: {
  recipientId: string;
  replierId: string;
  replierName: string;
  channelId: string;
  channelName: string;
  threadId: string;
  replyPreview: string;
}): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();

    await client.trigger({
      workflowId: getWorkflowId('thread-reply'),
      to: {
        subscriberId: getTenantSubscriberId(params.recipientId),
      },
      payload: {
        replierId: params.replierId,
        replierName: params.replierName,
        channelId: params.channelId,
        channelName: params.channelName,
        threadId: params.threadId,
        replyPreview: truncate(params.replyPreview, 100),
      },
    });
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to send thread reply notification:', error instanceof Error ? error.message : error);
  }
}

/**
 * Batch notify multiple users
 */
export async function notifyBatch(
  workflowId: NotificationTrigger,
  recipientIds: string[],
  payload: Record<string, unknown>
): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();

    await client.trigger({
      workflowId: getWorkflowId(workflowId),
      to: recipientIds.map((id) => ({ subscriberId: getTenantSubscriberId(id) })),
      payload,
    });
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to send batch notification:', error instanceof Error ? error.message : error);
  }
}

/**
 * Get subscriber's notification preferences
 */
export async function getPreferences(userId: string) {
  if (!isNovuConfigured()) {
    return null;
  }

  try {
    const client = getNovu();
    return client.subscribers.preferences.list(getTenantSubscriberId(userId));
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to get preferences:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Delete a subscriber
 */
export async function deleteSubscriber(userId: string): Promise<void> {
  if (!isNovuConfigured()) return;

  try {
    const client = getNovu();
    await client.subscribers.delete(getTenantSubscriberId(userId));
  } catch (error) {
    console.error('[ChatSDK Novu] Failed to delete subscriber:', error instanceof Error ? error.message : error);
  }
}

/**
 * Get current Novu configuration (for debugging)
 */
export function getNovuConfig() {
  return {
    configured: isNovuConfigured(),
    serverUrl: config.serverUrl,
    tenantId: config.tenantId || null,
    workflows: { ...workflows },
  };
}

// Utility functions
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
