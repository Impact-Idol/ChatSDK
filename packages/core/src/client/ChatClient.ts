/**
 * ChatClient - Main SDK entry point
 * Handles connection to Centrifugo and coordinates sync/offline components
 */

import { Centrifuge, Subscription, PublicationContext } from 'centrifuge';
import { EventBus } from '../callbacks/EventBus';
import type {
  ChatClientOptions,
  ConnectUserOptions,
  ConnectionState,
  User,
  Channel,
  Message,
  MessageWithSeq,
  EventMap,
  EventCallback,
} from '../types';

export interface ChatClientConfig {
  apiKey: string;
  apiUrl?: string;
  wsUrl?: string;
  debug?: boolean;
  enableOfflineSupport?: boolean;
  reconnectIntervals?: number[];
}

const DEFAULT_CONFIG: Partial<ChatClientConfig> = {
  apiUrl: 'http://localhost:5500',
  wsUrl: 'ws://localhost:8000/connection/websocket',
  debug: false,
  enableOfflineSupport: true,
  reconnectIntervals: [1000, 2000, 4000, 8000, 16000],
};

export class ChatClient {
  private config: ChatClientConfig;
  private centrifuge: Centrifuge | null = null;
  private subscriptions = new Map<string, Subscription>();
  private eventBus: EventBus;
  private currentUser: User | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private token: string | null = null;      // API token for REST calls
  private wsToken: string | null = null;    // WebSocket token for Centrifugo

  constructor(options: ChatClientOptions) {
    // Debug logging
    console.log('[ChatClient] Constructor called with options:', {
      apiKey: options.apiKey ? options.apiKey.substring(0, 20) + '...' : 'UNDEFINED',
      apiUrl: options.apiUrl,
      debug: options.debug,
    });

    // Filter out undefined values from options to avoid overwriting defaults
    const filteredOptions = Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined)
    );

    console.log('[ChatClient] Filtered options:', {
      apiKey: filteredOptions.apiKey ? filteredOptions.apiKey.substring(0, 20) + '...' : 'UNDEFINED',
      ...Object.fromEntries(Object.entries(filteredOptions).filter(([k]) => k !== 'apiKey'))
    });

    this.config = { ...DEFAULT_CONFIG, ...filteredOptions } as ChatClientConfig;

    console.log('[ChatClient] Final config:', {
      apiKey: this.config.apiKey ? this.config.apiKey.substring(0, 20) + '...' : 'UNDEFINED',
      apiUrl: this.config.apiUrl,
      debug: this.config.debug,
    });

    this.eventBus = new EventBus({ debug: this.config.debug });
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect a user to the chat service
   * @param user - User info
   * @param tokenOrTokens - Either a single token (for backwards compat) or { token, wsToken }
   */
  async connectUser(
    user: ConnectUserOptions,
    tokenOrTokens: string | { token: string; wsToken: string }
  ): Promise<User> {
    // Handle both token formats for backwards compatibility
    if (typeof tokenOrTokens === 'string') {
      // Legacy: single token used for both
      this.token = tokenOrTokens;
      this.wsToken = tokenOrTokens;
    } else {
      // New: separate tokens
      this.token = tokenOrTokens.token;
      this.wsToken = tokenOrTokens.wsToken;
    }

    this.currentUser = {
      id: user.id,
      name: user.name ?? user.id,
      image: user.image,
      custom: user.custom,
      online: true,
    };

    // Update connection state
    this.setConnectionState('connecting');
    this.eventBus.emit('connection.connecting', undefined);

    try {
      // Initialize Centrifugo client with WebSocket token
      this.centrifuge = new Centrifuge(this.config.wsUrl!, {
        token: this.wsToken!,
        debug: this.config.debug,
        getToken: async () => {
          // Token refresh callback - implement token refresh logic
          return this.wsToken!;
        },
      });

      // Set up connection event handlers
      this.setupConnectionHandlers();

      // Connect
      this.centrifuge.connect();

      // Wait for connection
      await this.waitForConnection();

      // Subscribe to user's personal channel for notifications
      await this.subscribeToUserChannel(user.id);

      this.setConnectionState('connected');
      this.eventBus.emit('connection.connected', undefined);

      if (this.config.debug) {
        console.log('[ChatClient] Connected as', user.id);
      }

      return this.currentUser;
    } catch (error) {
      this.setConnectionState('disconnected');
      this.eventBus.emit('connection.error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Disconnect from the chat service
   */
  async disconnect(): Promise<void> {
    // Unsubscribe from all channels
    for (const [channelId, subscription] of this.subscriptions) {
      subscription.unsubscribe();
      if (this.config.debug) {
        console.log('[ChatClient] Unsubscribed from', channelId);
      }
    }
    this.subscriptions.clear();

    // Disconnect Centrifugo
    if (this.centrifuge) {
      this.centrifuge.disconnect();
      this.centrifuge = null;
    }

    this.currentUser = null;
    this.token = null;
    this.setConnectionState('disconnected');
    this.eventBus.emit('connection.disconnected', { reason: 'user_disconnect' });
  }

  private setupConnectionHandlers(): void {
    if (!this.centrifuge) return;

    this.centrifuge.on('connecting', (ctx) => {
      if (this.config.debug) {
        console.log('[ChatClient] Connecting...', ctx);
      }
      this.setConnectionState('connecting');
    });

    this.centrifuge.on('connected', (ctx) => {
      if (this.config.debug) {
        console.log('[ChatClient] Connected', ctx);
      }
      this.setConnectionState('connected');
    });

    this.centrifuge.on('disconnected', (ctx) => {
      if (this.config.debug) {
        console.log('[ChatClient] Disconnected', ctx);
      }
      this.setConnectionState('disconnected');
      this.eventBus.emit('connection.disconnected', { reason: ctx.reason });
    });

    this.centrifuge.on('error', (ctx) => {
      console.error('[ChatClient] Connection error', ctx);
      this.eventBus.emit('connection.error', { error: new Error(ctx.error?.message ?? 'Unknown error') });
    });
  }

  private async waitForConnection(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.centrifuge) {
        reject(new Error('Centrifuge not initialized'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      const checkConnection = () => {
        if (this.centrifuge?.state === 'connected') {
          clearTimeout(timeoutId);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
  }

  // ============================================================================
  // Channel Subscriptions
  // ============================================================================

  private async subscribeToUserChannel(userId: string): Promise<Subscription> {
    const channelName = `user:${userId}`;
    return this.subscribe(channelName);
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  async subscribeToChannel(channelId: string): Promise<Subscription> {
    const channelName = `chat:${channelId}`;
    return this.subscribe(channelName);
  }

  private async subscribe(channelName: string): Promise<Subscription> {
    if (!this.centrifuge) {
      throw new Error('Not connected');
    }

    // Check if already subscribed
    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName)!;
    }

    const subscription = this.centrifuge.newSubscription(channelName);

    // Handle incoming messages
    subscription.on('publication', (ctx: PublicationContext) => {
      this.handlePublication(channelName, ctx);
    });

    subscription.on('subscribed', (ctx) => {
      if (this.config.debug) {
        console.log('[ChatClient] Subscribed to', channelName, ctx);
      }
    });

    subscription.on('error', (ctx) => {
      console.error('[ChatClient] Subscription error', channelName, ctx);
    });

    // Subscribe
    subscription.subscribe();
    this.subscriptions.set(channelName, subscription);

    return subscription;
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribeFromChannel(channelId: string): Promise<void> {
    const channelName = `chat:${channelId}`;
    const subscription = this.subscriptions.get(channelName);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);

      if (this.config.debug) {
        console.log('[ChatClient] Unsubscribed from', channelName);
      }
    }
  }

  private handlePublication(channelName: string, ctx: PublicationContext): void {
    const data = ctx.data as {
      type: string;
      payload: any;
    };

    if (this.config.debug) {
      console.log('[ChatClient] Received publication', channelName, data);
    }

    // Route to appropriate event handler based on message type
    switch (data.type) {
      case 'message.new':
        this.eventBus.emit('message.new', {
          channelId: data.payload.channelId,
          message: data.payload.message as MessageWithSeq,
        });
        break;

      case 'message.updated':
        this.eventBus.emit('message.updated', {
          channelId: data.payload.channelId,
          message: data.payload.message as MessageWithSeq,
        });
        break;

      case 'message.deleted':
        this.eventBus.emit('message.deleted', {
          channelId: data.payload.channelId,
          messageId: data.payload.messageId,
        });
        break;

      case 'typing.start':
        this.eventBus.emit('typing.start', {
          channelId: data.payload.channelId,
          user: data.payload.user,
        });
        break;

      case 'typing.stop':
        this.eventBus.emit('typing.stop', {
          channelId: data.payload.channelId,
          user: data.payload.user,
        });
        break;

      case 'reaction.added':
        this.eventBus.emit('reaction.added', {
          channelId: data.payload.channelId,
          messageId: data.payload.messageId,
          reaction: data.payload.reaction,
        });
        break;

      case 'reaction.removed':
        this.eventBus.emit('reaction.removed', {
          channelId: data.payload.channelId,
          messageId: data.payload.messageId,
          reaction: data.payload.reaction,
        });
        break;

      case 'channel.updated':
        this.eventBus.emit('channel.updated', {
          channel: data.payload.channel,
        });
        break;

      case 'read.updated':
        this.eventBus.emit('read.updated', {
          channelId: data.payload.channelId,
          userId: data.payload.userId,
          lastReadSeq: data.payload.lastReadSeq,
        });
        break;

      case 'presence.online':
        this.eventBus.emit('presence.online', { userId: data.payload.userId });
        break;

      case 'presence.offline':
        this.eventBus.emit('presence.offline', {
          userId: data.payload.userId,
          lastSeen: data.payload.lastSeen,
        });
        break;

      default:
        if (this.config.debug) {
          console.log('[ChatClient] Unknown message type', data.type);
        }
    }
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to SDK events
   */
  on<K extends keyof EventMap>(event: K, callback: EventCallback<K>): () => void {
    return this.eventBus.on(event, callback);
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof EventMap>(event: K, callback: EventCallback<K>): () => void {
    return this.eventBus.once(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    this.eventBus.off(event, callback);
  }

  // ============================================================================
  // API Methods
  // ============================================================================

  /**
   * Get current user
   */
  get user(): User | null {
    return this.currentUser;
  }

  /**
   * Get connection state
   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get API base URL
   */
  get apiUrl(): string {
    return this.config.apiUrl!;
  }

  /**
   * Make authenticated API request
   */
  async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;

    // Always log for debugging API key issue
    console.log('[ChatClient.fetch] DEBUG:', {
      endpoint,
      apiKey: this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'UNDEFINED',
      token: this.token ? 'SET' : 'NOT SET',
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message ?? `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================================================
  // Channel Operations
  // ============================================================================

  /**
   * Query channels
   */
  async queryChannels(options?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Channel[]> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const result = await this.fetch<{ channels: Channel[] }>(`/api/channels?${params}`);
    return result.channels;
  }

  /**
   * Get a specific channel
   */
  async getChannel(channelId: string): Promise<Channel> {
    return this.fetch<Channel>(`/api/channels/${channelId}`);
  }

  /**
   * Create a new channel
   */
  async createChannel(data: {
    type?: string;
    name?: string;
    memberIds: string[];
  }): Promise<Channel> {
    return this.fetch<Channel>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Query messages in a channel
   */
  async queryMessages(
    channelId: string,
    options?: {
      sinceSeq?: number;
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<{ messages: MessageWithSeq[]; maxSeq: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options?.sinceSeq) params.set('since_seq', String(options.sinceSeq));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    if (options?.after) params.set('after', options.after);

    return this.fetch(`/api/channels/${channelId}/messages?${params}`);
  }

  /**
   * Send a message
   */
  async sendMessage(
    channelId: string,
    data: {
      text: string;
      clientMsgId?: string;
      attachments?: any[];
      parentId?: string;
    }
  ): Promise<MessageWithSeq> {
    return this.fetch<MessageWithSeq>(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a message
   */
  async updateMessage(
    channelId: string,
    messageId: string,
    data: { text: string }
  ): Promise<MessageWithSeq> {
    return this.fetch<MessageWithSeq>(`/api/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.fetch(`/api/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Reaction Operations
  // ============================================================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    await this.fetch(`/api/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    await this.fetch(`/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  /**
   * Send typing indicator
   */
  async sendTypingStart(channelId: string): Promise<void> {
    await this.fetch(`/api/channels/${channelId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ typing: true }),
    });
  }

  /**
   * Stop typing indicator
   */
  async sendTypingStop(channelId: string): Promise<void> {
    await this.fetch(`/api/channels/${channelId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ typing: false }),
    });
  }

  // ============================================================================
  // Read State
  // ============================================================================

  /**
   * Mark messages as read
   */
  async markRead(channelId: string, messageId?: string): Promise<void> {
    await this.fetch(`/api/channels/${channelId}/read`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  }
}

// Factory function
export function createChatClient(options: ChatClientOptions): ChatClient {
  return new ChatClient(options);
}
