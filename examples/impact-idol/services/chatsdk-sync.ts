/**
 * ChatSDK Sync Service for Impact Idol
 *
 * This service provides dual-write functionality between Impact Idol's Prisma database
 * and ChatSDK's real-time messaging system.
 *
 * ARCHITECTURE:
 * - Prisma DB = Source of truth for Impact Idol
 * - ChatSDK = Real-time sync, offline support, advanced messaging features
 * - Sync is async and non-blocking
 * - Failures are logged but don't break the UI
 *
 * USAGE:
 * 1. Copy this file to your Impact Idol project: app/services/chatsdk-sync.ts
 * 2. Set environment variables: CHATSDK_API_URL, CHATSDK_API_KEY
 * 3. Import sync functions in your server actions
 */

import { ChatClient } from '@chatsdk/core';

// Initialize ChatSDK client
// In production, use environment variables
const chatSDK = new ChatClient({
  apiUrl: process.env.CHATSDK_API_URL || 'http://localhost:5500',
  apiKey: process.env.CHATSDK_API_KEY || '',
});

/**
 * Prisma type imports (adjust based on your Prisma schema)
 * Uncomment and adjust these imports in your Impact Idol project:
 *
 * import { prisma } from '@/lib/prisma';
 * import type { Message, User, Channel, Workspace } from '@prisma/client';
 */

// ============================================================================
// MESSAGE SYNC
// ============================================================================

/**
 * Sync a message from Impact Idol's Prisma DB to ChatSDK
 *
 * @param messageId - The message ID in your Prisma database
 * @throws Error if message not found or sync fails
 *
 * @example
 * ```typescript
 * // In your server action after creating a message
 * const message = await prisma.message.create({ data: { ... } });
 * await syncMessageToChatSDK(message.id);
 * ```
 */
export async function syncMessageToChatSDK(messageId: string): Promise<void> {
  try {
    // Get message from Prisma
    // Uncomment in your Impact Idol project:
    // const message = await prisma.message.findUnique({
    //   where: { id: messageId },
    //   include: {
    //     user: true,
    //     channel: true,
    //   },
    // });

    // Example message structure (replace with your actual Prisma query)
    const message = {
      id: messageId,
      channelId: 'channel-id',
      userId: 'user-id',
      content: 'message content',
      createdAt: new Date(),
    };

    // Validate message exists
    if (!message) {
      throw new Error(`Message ${messageId} not found in Prisma DB`);
    }

    // Send to ChatSDK using the correct API
    await chatSDK.fetch(`/api/messages`, {
      method: 'POST',
      body: JSON.stringify({
        id: message.id,
        channel_id: message.channelId,
        user_id: message.userId,
        text: message.content,
        created_at: message.createdAt instanceof Date
          ? message.createdAt.toISOString()
          : message.createdAt,
      }),
    });

    console.log(`[ChatSDK Sync] Message ${messageId} synced to ChatSDK`);
  } catch (error) {
    // Log error but don't throw - we don't want to break the UI
    console.error(`[ChatSDK Sync] Failed to sync message ${messageId}:`, error);

    // Optional: Send to error tracking service (Sentry, etc.)
    // Sentry.captureException(error);
  }
}

/**
 * Sync a message from ChatSDK to Impact Idol's Prisma DB
 * This is typically called from a webhook handler
 *
 * @param chatSDKMessage - Message data from ChatSDK webhook
 *
 * @example
 * ```typescript
 * // In your webhook handler: app/api/webhooks/chatsdk/route.ts
 * export async function POST(req: Request) {
 *   const event = await req.json();
 *   if (event.type === 'message.created') {
 *     await syncMessageFromChatSDK(event.data);
 *   }
 * }
 * ```
 */
export async function syncMessageFromChatSDK(chatSDKMessage: any): Promise<void> {
  try {
    // Write to Prisma
    // Uncomment in your Impact Idol project:
    // await prisma.message.upsert({
    //   where: { id: chatSDKMessage.id },
    //   update: {
    //     content: chatSDKMessage.text,
    //     updatedAt: new Date(),
    //   },
    //   create: {
    //     id: chatSDKMessage.id,
    //     channelId: chatSDKMessage.channel_id,
    //     userId: chatSDKMessage.user_id,
    //     content: chatSDKMessage.text,
    //     createdAt: new Date(chatSDKMessage.created_at),
    //   },
    // });

    console.log(`[ChatSDK Sync] Message ${chatSDKMessage.id} synced from ChatSDK to Prisma`);
  } catch (error) {
    console.error(`[ChatSDK Sync] Failed to sync message from ChatSDK:`, error);
  }
}

// ============================================================================
// CHANNEL SYNC
// ============================================================================

/**
 * Sync a channel from Impact Idol to ChatSDK
 *
 * @param channelId - The channel ID in your Prisma database
 */
export async function syncChannelToChatSDK(channelId: string): Promise<void> {
  try {
    // Get channel from Prisma
    // Uncomment in your Impact Idol project:
    // const channel = await prisma.channel.findUnique({
    //   where: { id: channelId },
    //   include: {
    //     workspace: true,
    //   },
    // });

    const channel = {
      id: channelId,
      name: 'Channel Name',
      workspaceId: 'workspace-id',
      isPrivate: false,
      createdAt: new Date(),
    };

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Sync to ChatSDK
    await chatSDK.fetch(`/api/channels`, {
      method: 'POST',
      body: JSON.stringify({
        id: channel.id,
        workspace_id: channel.workspaceId,
        name: channel.name,
        is_private: channel.isPrivate,
        created_at: channel.createdAt instanceof Date
          ? channel.createdAt.toISOString()
          : channel.createdAt,
      }),
    });

    console.log(`[ChatSDK Sync] Channel ${channelId} synced to ChatSDK`);
  } catch (error) {
    console.error(`[ChatSDK Sync] Failed to sync channel ${channelId}:`, error);
  }
}

// ============================================================================
// USER SYNC
// ============================================================================

/**
 * Sync a user from Impact Idol to ChatSDK
 *
 * @param userId - The user ID in your Prisma database
 */
export async function syncUserToChatSDK(userId: string): Promise<void> {
  try {
    // Get user from Prisma
    // Uncomment in your Impact Idol project:
    // const user = await prisma.user.findUnique({
    //   where: { id: userId },
    // });

    const user = {
      id: userId,
      name: 'User Name',
      email: 'user@example.com',
      image: null,
      createdAt: new Date(),
    };

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Sync to ChatSDK
    await chatSDK.fetch(`/api/users`, {
      method: 'POST',
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        image_url: user.image,
        created_at: user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : user.createdAt,
      }),
    });

    console.log(`[ChatSDK Sync] User ${userId} synced to ChatSDK`);
  } catch (error) {
    console.error(`[ChatSDK Sync] Failed to sync user ${userId}:`, error);
  }
}

// ============================================================================
// WORKSPACE SYNC
// ============================================================================

/**
 * Sync a workspace from Impact Idol to ChatSDK
 *
 * @param workspaceId - The workspace ID in your Prisma database
 */
export async function syncWorkspaceToChatSDK(workspaceId: string): Promise<void> {
  try {
    // Get workspace from Prisma
    // Uncomment in your Impact Idol project:
    // const workspace = await prisma.workspace.findUnique({
    //   where: { id: workspaceId },
    // });

    const workspace = {
      id: workspaceId,
      name: 'Workspace Name',
      type: 'team',
      image: null,
      createdAt: new Date(),
    };

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Sync to ChatSDK
    await chatSDK.fetch(`/api/workspaces`, {
      method: 'POST',
      body: JSON.stringify({
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        image_url: workspace.image,
        created_at: workspace.createdAt instanceof Date
          ? workspace.createdAt.toISOString()
          : workspace.createdAt,
      }),
    });

    console.log(`[ChatSDK Sync] Workspace ${workspaceId} synced to ChatSDK`);
  } catch (error) {
    console.error(`[ChatSDK Sync] Failed to sync workspace ${workspaceId}:`, error);
  }
}

// ============================================================================
// BATCH SYNC UTILITIES
// ============================================================================

/**
 * Batch sync multiple messages
 * Useful for initial data migration or bulk operations
 *
 * @param messageIds - Array of message IDs to sync
 */
export async function batchSyncMessages(messageIds: string[]): Promise<void> {
  console.log(`[ChatSDK Sync] Starting batch sync of ${messageIds.length} messages`);

  const results = await Promise.allSettled(
    messageIds.map(id => syncMessageToChatSDK(id))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`[ChatSDK Sync] Batch sync complete: ${successful} succeeded, ${failed} failed`);
}

/**
 * Get ChatSDK client instance for direct API calls
 * Use this when you need more control than the sync functions provide
 *
 * @example
 * ```typescript
 * const client = getChatSDKClient();
 * const channels = await client.fetch('/api/channels');
 * ```
 */
export function getChatSDKClient(): ChatClient {
  return chatSDK;
}
