/**
 * Inngest Notification Functions
 * Orchestrates notification logic - decides who, when, and what to notify
 * Then calls Novu (mobile) and Web Push (browser) for delivery
 */

import { inngest, ChatEvents } from '../client';
import {
  notifyNewMessage,
  notifyMention,
  notifyReaction,
  notifyThreadReply,
  notifyChannelInvite,
  notifyBatch,
} from '../../services/novu';
import {
  sendWebPushNotification,
  sendWebPushToUsers,
  webPushPayloads,
  isWebPushConfigured,
} from '../../services/webpush';
import { db } from '../../services/database';

// Helper to get app_id for a channel
async function getAppIdForChannel(channelId: string): Promise<string | null> {
  const result = await db.query(
    'SELECT app_id FROM channel WHERE id = $1 LIMIT 1',
    [channelId]
  );
  return result.rows[0]?.app_id || null;
}

/**
 * Handle new message notifications
 * - Notifies channel members who are offline
 * - Handles @mentions specially
 * - Respects user notification preferences
 */
export const handleNewMessage = inngest.createFunction(
  {
    id: 'notify-new-message',
    name: 'Notify on New Message',
    throttle: {
      // Batch notifications to avoid spam
      limit: 1,
      period: '5s',
      key: 'event.data.channelId',
    },
  },
  { event: 'chat/message.sent' },
  async ({ event, step }) => {
    const { data } = event;

    // Step 1: Get recipients (exclude sender)
    const recipientIds = await step.run('get-recipients', async () => {
      // Filter out the sender
      const recipients = data.memberIds.filter((id) => id !== data.senderId);

      // In a real app, you'd also filter by:
      // - Online status (don't notify users already viewing the channel)
      // - Do Not Disturb status
      // - Muted channels
      return recipients;
    });

    if (recipientIds.length === 0) {
      return { notified: 0, reason: 'no-recipients' };
    }

    // Get app_id for Web Push
    const appId = await step.run('get-app-id', async () => {
      return getAppIdForChannel(data.channelId);
    });

    // Step 2: Handle @mentions first (higher priority)
    if (data.mentions.length > 0) {
      await step.run('notify-mentions', async () => {
        for (const mentionedUserId of data.mentions) {
          if (mentionedUserId !== data.senderId) {
            // Novu (mobile push)
            await notifyMention({
              recipientId: mentionedUserId,
              mentionedBy: data.senderId,
              mentionedByName: data.senderName,
              channelId: data.channelId,
              channelName: data.channelName,
              messagePreview: data.content,
              messageId: data.messageId,
            });

            // Web Push (browser)
            if (appId && isWebPushConfigured()) {
              await sendWebPushNotification(
                appId,
                mentionedUserId,
                webPushPayloads.mention({
                  mentionedByName: data.senderName,
                  channelName: data.channelName,
                  messagePreview: data.content,
                  channelId: data.channelId,
                  messageId: data.messageId,
                })
              );
            }
          }
        }
      });
    }

    // Step 3: Notify remaining members (excluding mentioned users)
    const nonMentionedRecipients = recipientIds.filter(
      (id) => !data.mentions.includes(id)
    );

    if (nonMentionedRecipients.length > 0) {
      await step.run('notify-members', async () => {
        // For direct messages, always notify
        // For groups/public, respect notification settings
        if (data.channelType === 'direct') {
          // Novu (mobile push)
          await notifyNewMessage({
            recipientId: nonMentionedRecipients[0],
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            channelId: data.channelId,
            channelName: data.senderName, // Show sender name for DMs
            messagePreview: data.content,
            messageId: data.messageId,
          });

          // Web Push (browser)
          if (appId && isWebPushConfigured()) {
            await sendWebPushNotification(
              appId,
              nonMentionedRecipients[0],
              webPushPayloads.newMessage({
                senderName: data.senderName,
                channelName: data.senderName,
                messagePreview: data.content,
                channelId: data.channelId,
                messageId: data.messageId,
              })
            );
          }
        } else {
          // Batch notification for groups
          // Novu (mobile push)
          await notifyBatch('new-message', nonMentionedRecipients, {
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            channelId: data.channelId,
            channelName: data.channelName,
            messagePreview: data.content,
            messageId: data.messageId,
          });

          // Web Push (browser) - batch to all recipients
          if (appId && isWebPushConfigured()) {
            await sendWebPushToUsers(
              appId,
              nonMentionedRecipients,
              webPushPayloads.newMessage({
                senderName: data.senderName,
                channelName: data.channelName,
                messagePreview: data.content,
                channelId: data.channelId,
                messageId: data.messageId,
              })
            );
          }
        }
      });
    }

    return {
      notified: recipientIds.length,
      mentioned: data.mentions.length,
    };
  }
);

/**
 * Handle reaction notifications
 * - Notify message author when someone reacts to their message
 * - Don't notify if author reacted to their own message
 */
export const handleReaction = inngest.createFunction(
  {
    id: 'notify-reaction',
    name: 'Notify on Reaction',
    debounce: {
      // Debounce rapid reactions
      period: '10s',
      key: 'event.data.messageId',
    },
  },
  { event: 'chat/message.reaction' },
  async ({ event, step }) => {
    const { data } = event;

    // Don't notify if user reacted to their own message
    if (data.reactorId === data.messageAuthorId) {
      return { notified: false, reason: 'self-reaction' };
    }

    // Get app_id for Web Push
    const appId = await step.run('get-app-id', async () => {
      return getAppIdForChannel(data.channelId);
    });

    await step.run('send-reaction-notification', async () => {
      // Novu (mobile push)
      await notifyReaction({
        recipientId: data.messageAuthorId,
        reactorId: data.reactorId,
        reactorName: data.reactorName,
        emoji: data.emoji,
        channelId: data.channelId,
        messagePreview: data.messagePreview,
        messageId: data.messageId,
      });

      // Web Push (browser)
      if (appId && isWebPushConfigured()) {
        await sendWebPushNotification(
          appId,
          data.messageAuthorId,
          webPushPayloads.reaction({
            reactorName: data.reactorName,
            emoji: data.emoji,
            messagePreview: data.messagePreview,
            channelId: data.channelId,
            messageId: data.messageId,
          })
        );
      }
    });

    return { notified: true };
  }
);

/**
 * Handle thread reply notifications
 * - Notify all thread participants
 * - Exclude the replier
 */
export const handleThreadReply = inngest.createFunction(
  {
    id: 'notify-thread-reply',
    name: 'Notify on Thread Reply',
    throttle: {
      limit: 1,
      period: '5s',
      key: 'event.data.threadId',
    },
  },
  { event: 'chat/thread.reply' },
  async ({ event, step }) => {
    const { data } = event;

    // Get participants excluding the replier
    const recipientIds = data.threadParticipantIds.filter(
      (id) => id !== data.replierId
    );

    if (recipientIds.length === 0) {
      return { notified: 0, reason: 'no-recipients' };
    }

    // Get app_id for Web Push
    const appId = await step.run('get-app-id', async () => {
      return getAppIdForChannel(data.channelId);
    });

    await step.run('notify-thread-participants', async () => {
      for (const recipientId of recipientIds) {
        // Novu (mobile push)
        await notifyThreadReply({
          recipientId,
          replierId: data.replierId,
          replierName: data.replierName,
          channelId: data.channelId,
          channelName: data.channelName,
          threadId: data.threadId,
          replyPreview: data.replyContent,
        });

        // Web Push (browser)
        if (appId && isWebPushConfigured()) {
          await sendWebPushNotification(
            appId,
            recipientId,
            webPushPayloads.threadReply({
              replierName: data.replierName,
              channelName: data.channelName,
              replyPreview: data.replyContent,
              channelId: data.channelId,
              threadId: data.threadId,
            })
          );
        }
      }
    });

    return { notified: recipientIds.length };
  }
);

/**
 * Handle channel invite notifications
 * - Notify invited users
 */
export const handleChannelInvite = inngest.createFunction(
  {
    id: 'notify-channel-invite',
    name: 'Notify on Channel Invite',
  },
  { event: 'chat/channel.invite' },
  async ({ event, step }) => {
    const { data } = event;

    // Get app_id for Web Push
    const appId = await step.run('get-app-id', async () => {
      return getAppIdForChannel(data.channelId);
    });

    await step.run('send-invite-notifications', async () => {
      for (const inviteeId of data.inviteeIds) {
        // Novu (mobile push)
        await notifyChannelInvite({
          recipientId: inviteeId,
          invitedBy: data.invitedBy,
          invitedByName: data.invitedByName,
          channelId: data.channelId,
          channelName: data.channelName,
          channelDescription: data.channelDescription,
        });

        // Web Push (browser)
        if (appId && isWebPushConfigured()) {
          await sendWebPushNotification(
            appId,
            inviteeId,
            webPushPayloads.channelInvite({
              invitedByName: data.invitedByName,
              channelName: data.channelName,
              channelId: data.channelId,
            })
          );
        }
      }
    });

    return { notified: data.inviteeIds.length };
  }
);

/**
 * Scheduled: Clean up old notification data
 * Runs daily at 3 AM
 */
export const cleanupNotifications = inngest.createFunction(
  {
    id: 'cleanup-notifications',
    name: 'Cleanup Old Notifications',
  },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const deletedCount = await step.run('cleanup-old-notifications', async () => {
      // Delete notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await db.query(
        `DELETE FROM notifications WHERE created_at < $1`,
        [thirtyDaysAgo.toISOString()]
      );

      return result.rowCount || 0;
    });

    return { deleted: deletedCount };
  }
);

// Export all functions
export const notificationFunctions = [
  handleNewMessage,
  handleReaction,
  handleThreadReply,
  handleChannelInvite,
  cleanupNotifications,
];
