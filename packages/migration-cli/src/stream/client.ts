/**
 * Stream Chat API Client Wrapper
 */

import { StreamChat } from 'stream-chat';

export interface StreamConfig {
  apiKey: string;
  apiSecret: string;
}

export class StreamChatClient {
  private client: StreamChat;

  constructor(apiKey: string, apiSecret: string) {
    this.client = StreamChat.getInstance(apiKey, apiSecret);
  }

  /**
   * Get all users (paginated)
   */
  async *getUsers(batchSize: number = 500) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.queryUsers(
        {},
        { id: 1 },
        { limit: batchSize, offset }
      );

      if (response.users.length === 0) {
        hasMore = false;
        break;
      }

      yield response.users;
      offset += batchSize;
      hasMore = response.users.length === batchSize;
    }
  }

  /**
   * Get all channels (paginated)
   */
  async *getChannels(filter: Record<string, any> = {}, batchSize: number = 100) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.queryChannels(
        filter,
        { last_message_at: -1 },
        { limit: batchSize, offset }
      );

      if (response.length === 0) {
        hasMore = false;
        break;
      }

      yield response;
      offset += batchSize;
      hasMore = response.length === batchSize;
    }
  }

  /**
   * Get messages for a channel (paginated)
   */
  async *getChannelMessages(channelId: string, channelType: string, batchSize: number = 1000) {
    const channel = this.client.channel(channelType, channelId);

    let hasMore = true;
    let messageId: string | undefined;

    while (hasMore) {
      const response = await channel.query({
        messages: {
          limit: batchSize,
          id_lt: messageId,
        },
      });

      if (!response.messages || response.messages.length === 0) {
        hasMore = false;
        break;
      }

      yield response.messages;

      // Get the ID of the last message for pagination
      messageId = response.messages[response.messages.length - 1].id;
      hasMore = response.messages.length === batchSize;
    }
  }

  /**
   * Get total counts for progress tracking
   */
  async getCounts() {
    // Get approximate user count
    const usersResponse = await this.client.queryUsers({}, {}, { limit: 1 });

    // Get approximate channel count
    const channelsResponse = await this.client.queryChannels({}, {}, { limit: 1 });

    return {
      users: 0, // Stream doesn't provide total count easily
      channels: 0, // Will be calculated during migration
      messages: 0, // Will be calculated during migration
    };
  }
}
