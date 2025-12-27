/**
 * Centrifugo Service
 * Server-side Centrifugo API for publishing events
 */

const CENTRIFUGO_API_URL = process.env.CENTRIFUGO_API_URL || 'http://localhost:8000/api';
const CENTRIFUGO_API_KEY = process.env.CENTRIFUGO_API_KEY || 'chatsdk-api-key-change-in-production';

interface CentrifugoResponse {
  error?: {
    code: number;
    message: string;
  };
  result?: any;
}

class CentrifugoClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Make API request to Centrifugo
   */
  private async request(method: string, params: any): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${this.apiKey}`,
      },
      body: JSON.stringify({ method, params }),
    });

    if (!response.ok) {
      throw new Error(`Centrifugo API error: ${response.status}`);
    }

    const data: CentrifugoResponse = await response.json();

    if (data.error) {
      throw new Error(`Centrifugo error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Publish message to a channel
   */
  async publish(channel: string, data: any): Promise<void> {
    await this.request('publish', {
      channel,
      data,
    });
  }

  /**
   * Broadcast to multiple channels
   */
  async broadcast(channels: string[], data: any): Promise<void> {
    await this.request('broadcast', {
      channels,
      data,
    });
  }

  /**
   * Get presence info for a channel
   */
  async presence(channel: string): Promise<{ clients: Record<string, any> }> {
    return this.request('presence', { channel });
  }

  /**
   * Get history for a channel
   */
  async history(
    channel: string,
    options?: { limit?: number; since?: { offset: number; epoch: string } }
  ): Promise<{ publications: any[] }> {
    return this.request('history', {
      channel,
      limit: options?.limit,
      since: options?.since,
    });
  }

  /**
   * Disconnect a user
   */
  async disconnect(user: string): Promise<void> {
    await this.request('disconnect', { user });
  }

  /**
   * Unsubscribe user from channel
   */
  async unsubscribe(channel: string, user: string): Promise<void> {
    await this.request('unsubscribe', { channel, user });
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      await this.request('info', {});
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let client: CentrifugoClient | null = null;

/**
 * Initialize Centrifugo client
 */
export async function initCentrifugo(): Promise<CentrifugoClient> {
  client = new CentrifugoClient(CENTRIFUGO_API_URL, CENTRIFUGO_API_KEY);

  // Test connection
  const healthy = await client.ping();
  if (!healthy) {
    console.warn('Centrifugo is not responding. Real-time features may not work.');
  }

  return client;
}

/**
 * Get Centrifugo client
 */
export function getCentrifugo(): CentrifugoClient {
  if (!client) {
    throw new Error('Centrifugo not initialized. Call initCentrifugo() first.');
  }
  return client;
}

// Event publishing helpers
export const centrifugo = {
  /**
   * Publish new message event to channel
   */
  async publishMessage(appId: string, channelId: string, message: any): Promise<void> {
    await getCentrifugo().publish(`chat:${appId}:${channelId}`, {
      type: 'message.new',
      payload: { channelId, message },
    });
  },

  /**
   * Publish message update event
   */
  async publishMessageUpdate(appId: string, channelId: string, message: any): Promise<void> {
    await getCentrifugo().publish(`chat:${appId}:${channelId}`, {
      type: 'message.updated',
      payload: { channelId, message },
    });
  },

  /**
   * Publish message delete event
   */
  async publishMessageDelete(appId: string, channelId: string, messageId: string): Promise<void> {
    await getCentrifugo().publish(`chat:${appId}:${channelId}`, {
      type: 'message.deleted',
      payload: { channelId, messageId },
    });
  },

  /**
   * Publish typing indicator
   */
  async publishTyping(appId: string, channelId: string, user: any, typing: boolean): Promise<void> {
    await getCentrifugo().publish(`chat:${appId}:${channelId}`, {
      type: typing ? 'typing.start' : 'typing.stop',
      payload: { channelId, user },
    });
  },

  /**
   * Publish reaction event
   */
  async publishReaction(
    appId: string,
    channelId: string,
    messageId: string,
    reaction: any,
    added: boolean
  ): Promise<void> {
    await getCentrifugo().publish(`chat:${appId}:${channelId}`, {
      type: added ? 'reaction.added' : 'reaction.removed',
      payload: { channelId, messageId, reaction },
    });
  },

  /**
   * Publish read receipt
   */
  async publishReadReceipt(
    appId: string,
    channelId: string,
    userId: string,
    lastReadSeq: number
  ): Promise<void> {
    await getCentrifugo().publish(`chat:${appId}:${channelId}`, {
      type: 'read.updated',
      payload: { channelId, userId, lastReadSeq },
    });
  },

  /**
   * Publish presence update to user's personal channel
   */
  async publishPresence(appId: string, userId: string, online: boolean, lastSeen?: string): Promise<void> {
    await getCentrifugo().publish(`user:${appId}:${userId}`, {
      type: online ? 'presence.online' : 'presence.offline',
      payload: { userId, lastSeen },
    });
  },
};
