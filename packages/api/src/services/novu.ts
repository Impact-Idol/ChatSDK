/**
 * Novu Notification Service
 * Handles push notifications, email, SMS delivery via Novu
 */

import { Novu } from '@novu/api';

// Novu client singleton
let novu: Novu | null = null;

// Configuration from environment
const config = {
  secretKey: process.env.NOVU_SECRET_KEY || '',
  serverUrl: process.env.NOVU_API_URL || 'http://localhost:3000',
};

/**
 * Initialize Novu client
 */
export async function initNovu(): Promise<Novu> {
  if (novu) return novu;

  if (!config.secretKey) {
    console.warn('NOVU_SECRET_KEY not set - notifications will be disabled');
  }

  novu = new Novu({
    secretKey: config.secretKey,
    serverURL: config.serverUrl,
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
 * Notification trigger types
 */
export type NotificationTrigger =
  | 'new-message'
  | 'mention'
  | 'channel-invite'
  | 'reaction'
  | 'thread-reply';

/**
 * Register or update a subscriber (user) in Novu
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
  const client = getNovu();

  await client.subscribers.create({
    subscriberId: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    locale: user.locale || 'en',
  });
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
  const client = getNovu();

  // FCM (Firebase Cloud Messaging) for Android
  if (tokens.fcm) {
    await client.subscribers.credentials.update({
      subscriberId: userId,
      providerId: 'fcm',
      credentials: {
        deviceTokens: [tokens.fcm],
      },
    });
  }

  // APNs (Apple Push Notification service) for iOS
  if (tokens.apns) {
    await client.subscribers.credentials.update({
      subscriberId: userId,
      providerId: 'apns',
      credentials: {
        deviceTokens: [tokens.apns],
      },
    });
  }

  // Expo Push for React Native
  if (tokens.expo) {
    await client.subscribers.credentials.update({
      subscriberId: userId,
      providerId: 'expo',
      credentials: {
        deviceTokens: [tokens.expo],
      },
    });
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
  const client = getNovu();

  await client.trigger({
    workflowId: 'new-message',
    to: {
      subscriberId: params.recipientId,
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
  const client = getNovu();

  await client.trigger({
    workflowId: 'mention',
    to: {
      subscriberId: params.recipientId,
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
  const client = getNovu();

  await client.trigger({
    workflowId: 'channel-invite',
    to: {
      subscriberId: params.recipientId,
    },
    payload: {
      invitedBy: params.invitedBy,
      invitedByName: params.invitedByName,
      channelId: params.channelId,
      channelName: params.channelName,
      channelDescription: params.channelDescription,
    },
  });
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
  const client = getNovu();

  await client.trigger({
    workflowId: 'reaction',
    to: {
      subscriberId: params.recipientId,
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
  const client = getNovu();

  await client.trigger({
    workflowId: 'thread-reply',
    to: {
      subscriberId: params.recipientId,
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
}

/**
 * Batch notify multiple users
 */
export async function notifyBatch(
  workflowId: NotificationTrigger,
  recipientIds: string[],
  payload: Record<string, any>
): Promise<void> {
  const client = getNovu();

  await client.trigger({
    workflowId,
    to: recipientIds.map((id) => ({ subscriberId: id })),
    payload,
  });
}

/**
 * Get subscriber's notification preferences
 */
export async function getPreferences(userId: string) {
  const client = getNovu();
  return client.subscribers.preferences.list({ subscriberId: userId });
}

/**
 * Delete a subscriber
 */
export async function deleteSubscriber(userId: string): Promise<void> {
  const client = getNovu();
  await client.subscribers.delete({ subscriberId: userId });
}

// Utility functions
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
