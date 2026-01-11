/**
 * Inngest Client Configuration
 * Manages async workflows for notifications, background jobs, etc.
 */

import { Inngest } from 'inngest';

// Define event types for type safety
export type ChatEvents = {
  'chat/message.sent': {
    data: {
      messageId: string;
      channelId: string;
      senderId: string;
      senderName: string;
      senderAvatar?: string;
      content: string;
      mentions: string[];
      channelName: string;
      channelType: 'messaging' | 'group' | 'public';
      memberIds: string[];
    };
  };
  'chat/message.reaction': {
    data: {
      messageId: string;
      channelId: string;
      reactorId: string;
      reactorName: string;
      emoji: string;
      messageAuthorId: string;
      messagePreview: string;
    };
  };
  'chat/thread.reply': {
    data: {
      threadId: string;
      channelId: string;
      channelName: string;
      replierId: string;
      replierName: string;
      replyContent: string;
      threadParticipantIds: string[];
    };
  };
  'chat/channel.invite': {
    data: {
      channelId: string;
      channelName: string;
      channelDescription?: string;
      invitedBy: string;
      invitedByName: string;
      inviteeIds: string[];
    };
  };
  'chat/user.online': {
    data: {
      userId: string;
      username: string;
    };
  };
  'chat/user.offline': {
    data: {
      userId: string;
      lastSeen: string;
    };
  };
  'chat/message.created': {
    data: {
      messageId: string;
      appId: string;
      text: string;
    };
  };
};

// Create Inngest client
export const inngest = new Inngest({
  id: 'chatsdk',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
