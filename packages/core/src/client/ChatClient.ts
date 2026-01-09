/**
 * ChatClient - Main SDK entry point
 *
 * Handles connection to Centrifugo and coordinates sync/offline components.
 *
 * ## Reconnection Behavior
 *
 * Reconnection is handled automatically by the underlying Centrifugo client library.
 * The Centrifuge-js library implements sophisticated reconnection logic including:
 *
 * - **Automatic reconnection**: When the WebSocket connection drops, Centrifuge-js
 *   automatically attempts to reconnect using exponential backoff with jitter.
 *
 * - **Exponential backoff**: Reconnection delays increase exponentially to prevent
 *   thundering herd problems during server outages.
 *
 * - **Jitter**: Random jitter is added to prevent synchronized reconnection attempts
 *   from multiple clients after an outage.
 *
 * - **Subscription recovery**: After reconnection, subscriptions are automatically
 *   re-established and missed messages are recovered (if server-side history is enabled).
 *
 * - **Token refresh**: The `getToken` callback is invoked to refresh the token
 *   before reconnection if the token has expired.
 *
 * ## Connection Events
 *
 * The SDK emits the following connection events that you can listen to:
 *
 * - `connection.connecting` - WebSocket is attempting to connect
 * - `connection.connected` - Successfully connected
 * - `connection.disconnected` - Connection lost (reconnection will be attempted)
 * - `connection.reconnecting` - Attempting to reconnect (with attempt count)
 * - `connection.error` - Connection error occurred
 *
 * @example Connection state handling
 * ```typescript
 * const client = createChatClient({ apiKey: 'your-key' });
 *
 * client.on('connection.connected', () => {
 *   console.log('Connected!');
 * });
 *
 * client.on('connection.disconnected', ({ reason }) => {
 *   console.log('Disconnected:', reason);
 *   // No need to manually reconnect - Centrifuge handles this
 * });
 *
 * client.on('connection.reconnecting', ({ attempt }) => {
 *   console.log(`Reconnecting... attempt ${attempt}`);
 * });
 * ```
 *
 * ## Why We Don't Implement Custom Reconnection
 *
 * Centrifuge-js is a battle-tested library used in production by many companies.
 * Its reconnection logic is well-optimized and handles edge cases that custom
 * implementations often miss. Rolling our own reconnection logic would:
 *
 * 1. Duplicate existing functionality
 * 2. Risk introducing bugs in a critical path
 * 3. Miss optimizations like proper jitter and backoff curves
 * 4. Not integrate well with Centrifuge's subscription recovery
 *
 * For advanced reconnection customization, you can configure Centrifuge options
 * when initializing the ChatClient (future enhancement).
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
import {
  ChannelSchema,
  CreateChannelSchema,
  MessageSchema,
  SendMessageSchema,
  UpdateMessageSchema,
  AddReactionSchema,
  type CreateChannel,
  type SendMessage,
  type UpdateMessage,
} from '../schemas';
import { retryAsync } from '../lib/retry';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { RequestDeduplicator } from '../lib/deduplication';

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

enum SubscriptionState {
  PENDING = 'pending',
  ACTIVE = 'active',
  CLEANING = 'cleaning'
}

export class ChatClient {
  private config: ChatClientConfig;
  private centrifuge: Centrifuge | null = null;
  private subscriptions = new Map<string, Subscription>();
  private subscriptionStates = new Map<string, SubscriptionState>();
  private subscriptionLocks = new Map<string, Promise<void>>();
  private eventBus: EventBus;
  private currentUser: User | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private token: string | null = null;      // API token for REST calls
  private wsToken: string | null = null;    // WebSocket token for Centrifugo
  private appId: string | null = null;      // App ID extracted from wsToken
  private apiCircuitBreaker: CircuitBreaker; // Circuit breaker for API requests
  private wsCircuitBreaker: CircuitBreaker;  // Circuit breaker for WebSocket
  private deduplicator: RequestDeduplicator; // Request deduplication

  constructor(options: ChatClientOptions) {
    // Filter out undefined values from options to avoid overwriting defaults
    const filteredOptions = Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined)
    );

    this.config = { ...DEFAULT_CONFIG, ...filteredOptions } as ChatClientConfig;
    this.eventBus = new EventBus({ debug: this.config.debug });

    // Initialize circuit breakers
    this.apiCircuitBreaker = new CircuitBreaker('api', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
    });

    this.wsCircuitBreaker = new CircuitBreaker('websocket', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
    });

    // Initialize request deduplicator
    this.deduplicator = new RequestDeduplicator(5000); // 5s deduplication window

    // Debug log initialization
    this.log('init', 'ChatClient initialized', {
      apiUrl: this.config.apiUrl,
      wsUrl: this.config.wsUrl,
      debug: this.config.debug,
      offlineSupport: this.config.enableOfflineSupport,
    });
  }

  // ============================================================================
  // Debug Logging
  // ============================================================================

  /**
   * Structured debug logger - only logs when debug mode is enabled
   */
  private log(
    category: 'init' | 'connection' | 'subscription' | 'api' | 'event' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.config.debug) return;

    const timestamp = new Date().toISOString();
    const prefix = `[ChatSDK:${category}]`;

    if (data) {
      // Sanitize sensitive data
      const sanitized = this.sanitizeLogData(data);
      console.log(`${prefix} ${message}`, sanitized, `(${timestamp})`);
    } else {
      console.log(`${prefix} ${message}`, `(${timestamp})`);
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['token', 'wsToken', 'apiKey', 'password', 'secret'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        if (typeof value === 'string' && value.length > 0) {
          result[key] = value.substring(0, 8) + '...[redacted]';
        } else {
          result[key] = '[redacted]';
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeLogData(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Log API request/response for debugging
   */
  private logApiCall(
    method: string,
    endpoint: string,
    duration: number,
    status: number | 'error',
    error?: string
  ): void {
    if (!this.config.debug) return;

    const emoji = status === 'error' ? '❌' : status >= 400 ? '⚠️' : '✅';
    this.log('api', `${emoji} ${method} ${endpoint}`, {
      status,
      duration: `${duration}ms`,
      ...(error && { error }),
    });
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
    this.log('connection', 'Connecting user...', { userId: user.id });

    // Handle both token formats for backwards compatibility
    if (typeof tokenOrTokens === 'string') {
      // Legacy: single token used for both
      this.token = tokenOrTokens;
      this.wsToken = tokenOrTokens;
      this.log('connection', 'Using single token for API and WebSocket');
    } else {
      // New: separate tokens
      this.token = tokenOrTokens.token;
      this.wsToken = tokenOrTokens.wsToken;
      this.log('connection', 'Using separate tokens for API and WebSocket');
    }

    // Extract app_id from wsToken for channel namespacing
    if (this.wsToken) {
      this.appId = this.extractAppIdFromToken(this.wsToken);
      if (!this.appId) {
        this.log('error', 'Failed to extract app_id from wsToken - multi-tenant isolation may not work');
      } else {
        this.log('connection', 'Extracted app_id from token', { appId: this.appId });
      }
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
      this.log('connection', 'Initializing Centrifugo client', { wsUrl: this.config.wsUrl });

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
      this.log('connection', 'WebSocket connection established');

      // Subscribe to user's personal channel for notifications
      await this.subscribeToUserChannel(user.id);

      this.setConnectionState('connected');
      this.eventBus.emit('connection.connected', undefined);

      this.log('connection', '✅ User connected successfully', {
        userId: user.id,
        userName: user.name,
      });

      return this.currentUser;
    } catch (error) {
      this.log('error', '❌ Connection failed', {
        error: (error as Error).message,
        userId: user.id,
      });
      this.setConnectionState('disconnected');
      this.eventBus.emit('connection.error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Disconnect from the chat service
   */
  async disconnect(): Promise<void> {
    this.log('connection', 'Disconnecting...');

    // Unsubscribe from all channels
    const channelCount = this.subscriptions.size;
    for (const [channelId, subscription] of this.subscriptions) {
      subscription.unsubscribe();
      this.log('subscription', 'Unsubscribed from channel', { channel: channelId });
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

    this.log('connection', '✅ Disconnected', { channelsUnsubscribed: channelCount });
  }

  private setupConnectionHandlers(): void {
    if (!this.centrifuge) return;

    this.centrifuge.on('connecting', (ctx) => {
      this.log('connection', 'WebSocket connecting...', { code: ctx.code, reason: ctx.reason });
      this.setConnectionState('connecting');
    });

    this.centrifuge.on('connected', (ctx) => {
      this.log('connection', '✅ WebSocket connected', {
        client: ctx.client,
        transport: ctx.transport,
      });
      this.setConnectionState('connected');
    });

    this.centrifuge.on('disconnected', (ctx) => {
      this.log('connection', '⚠️ WebSocket disconnected', {
        code: ctx.code,
        reason: ctx.reason,
      });
      this.setConnectionState('disconnected');
      this.eventBus.emit('connection.disconnected', { reason: ctx.reason });
    });

    this.centrifuge.on('error', (ctx) => {
      this.log('error', '❌ WebSocket error', {
        error: ctx.error?.message ?? 'Unknown error',
        code: ctx.error?.code,
      });
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
    const channelName = this.appId ? `user:${this.appId}:${userId}` : `user:${userId}`;
    return this.subscribe(channelName);
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  async subscribeToChannel(channelId: string): Promise<Subscription> {
    const channelName = this.appId ? `chat:${this.appId}:${channelId}` : `chat:${channelId}`;
    return this.subscribe(channelName);
  }

  private async subscribe(channelName: string): Promise<Subscription> {
    if (!this.centrifuge) {
      throw new Error('Not connected');
    }

    // Wait for any ongoing operations on this channel
    if (this.subscriptionLocks.has(channelName)) {
      this.log('subscription', 'Waiting for subscription lock', { channel: channelName });
      await this.subscriptionLocks.get(channelName);
    }

    // Check current state
    const currentState = this.subscriptionStates.get(channelName);

    // If already active, return existing subscription
    if (currentState === SubscriptionState.ACTIVE && this.subscriptions.has(channelName)) {
      this.log('subscription', 'Returning existing subscription', { channel: channelName });
      return this.subscriptions.get(channelName)!;
    }

    // If pending or cleaning, wait a bit and retry
    if (currentState === SubscriptionState.PENDING || currentState === SubscriptionState.CLEANING) {
      this.log('subscription', 'Subscription in transitional state, waiting...', {
        channel: channelName,
        state: currentState,
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.subscribe(channelName);
    }

    // Create new subscription with lock
    const lockPromise = (async () => {
      try {
        // Set state to PENDING
        this.subscriptionStates.set(channelName, SubscriptionState.PENDING);

        this.log('subscription', 'Creating new subscription', { channel: channelName });

        const subscription = this.centrifuge!.newSubscription(channelName);

        // Handle incoming messages
        subscription.on('publication', (ctx: PublicationContext) => {
          this.handlePublication(channelName, ctx);
        });

        subscription.on('subscribed', (ctx) => {
          this.log('subscription', '✅ Subscribed to channel', {
            channel: channelName,
            wasRecovering: ctx.wasRecovering,
          });
        });

        subscription.on('error', (ctx) => {
          this.log('error', '❌ Subscription error', {
            channel: channelName,
            error: ctx.error?.message,
            code: ctx.error?.code,
          });
        });

        // Subscribe
        subscription.subscribe();
        this.subscriptions.set(channelName, subscription);

        // Set state to ACTIVE
        this.subscriptionStates.set(channelName, SubscriptionState.ACTIVE);

        this.log('subscription', 'Subscription active', { channel: channelName });
      } finally {
        // Remove lock
        this.subscriptionLocks.delete(channelName);
      }
    })();

    this.subscriptionLocks.set(channelName, lockPromise);
    await lockPromise;

    return this.subscriptions.get(channelName)!;
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribeFromChannel(channelId: string): Promise<void> {
    const channelName = this.appId ? `chat:${this.appId}:${channelId}` : `chat:${channelId}`;

    // Wait for any ongoing operations
    if (this.subscriptionLocks.has(channelName)) {
      this.log('subscription', 'Waiting for lock before unsubscribe', { channel: channelName });
      await this.subscriptionLocks.get(channelName);
    }

    const subscription = this.subscriptions.get(channelName);

    if (subscription) {
      // Create cleanup lock
      const cleanupPromise = (async () => {
        try {
          // Set state to CLEANING
          this.subscriptionStates.set(channelName, SubscriptionState.CLEANING);

          this.log('subscription', 'Unsubscribing from channel', { channel: channelName });

          subscription.unsubscribe();
          this.subscriptions.delete(channelName);
          this.subscriptionStates.delete(channelName);

          this.log('subscription', '✅ Unsubscribed from channel', { channel: channelName });
        } finally {
          // Remove lock
          this.subscriptionLocks.delete(channelName);
        }
      })();

      this.subscriptionLocks.set(channelName, cleanupPromise);
      await cleanupPromise;
    }
  }

  private handlePublication(channelName: string, ctx: PublicationContext): void {
    const data = ctx.data as {
      type: string;
      payload: any;
    };

    this.log('event', `📥 Received: ${data.type}`, {
      channel: channelName,
      type: data.type,
    });

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
        this.log('event', `⚠️ Unknown message type: ${data.type}`, { channel: channelName });
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
    const method = options?.method ?? 'GET';

    this.log('api', `🔄 ${method} ${endpoint}`, {
      hasToken: !!this.token,
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    // Deduplicate requests (especially important for POST/PUT/DELETE to prevent duplicates)
    // Only deduplicate mutation operations, not GET requests
    const shouldDeduplicate = method !== 'GET';
    const dedupParams = {
      endpoint,
      method,
      body: options?.body,
    };

    if (shouldDeduplicate) {
      return this.deduplicator.deduplicate(
        'api-request',
        dedupParams,
        () => this.executeRequest<T>(url, headers, options)
      );
    }

    return this.executeRequest<T>(url, headers, options);
  }

  /**
   * Execute the actual HTTP request (used by fetch with deduplication)
   */
  private async executeRequest<T>(
    url: string,
    headers: HeadersInit,
    options?: RequestInit
  ): Promise<T> {
    const method = options?.method ?? 'GET';
    const endpoint = url.replace(this.config.apiUrl!, '');

    // Wrap fetch call in circuit breaker and retry logic
    return this.apiCircuitBreaker.execute(async () => {
      return retryAsync(async () => {
        const startTime = Date.now();

        try {
          const response = await fetch(url, {
            ...options,
            headers,
          });

          const duration = Date.now() - startTime;

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
            const errorMessage = error.error?.message ?? error.message ?? `HTTP ${response.status}`;
            const errorHint = error.error?.hint;

            this.logApiCall(method, endpoint, duration, response.status, errorMessage);

            // Include hint and status in error for retry logic
            const fullError: any = new Error(errorMessage);
            if (errorHint) {
              fullError.hint = errorHint;
            }
            fullError.status = response.status; // Required for retry decision
            throw fullError;
          }

          this.logApiCall(method, endpoint, duration, response.status);

          return response.json();
        } catch (error) {
          if (!(error instanceof Error) || !('hint' in error)) {
            // Network error or other non-HTTP error
            const duration = Date.now() - startTime;
            this.logApiCall(method, endpoint, duration, 'error', (error as Error).message);
          }
          throw error;
        }
      });
    });
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
   * Create a new channel with Zod validation
   */
  async createChannel(data: CreateChannel): Promise<Channel> {
    // Validate input
    const validatedData = CreateChannelSchema.parse(data);

    // Make API call
    const response = await this.fetch<any>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });

    // Validate and return response (cast to Channel type for compatibility)
    return ChannelSchema.parse(response) as unknown as Channel;
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
   * Send a message with Zod validation
   */
  async sendMessage(
    channelId: string,
    data: SendMessage
  ): Promise<MessageWithSeq> {
    // Validate input
    const validatedData = SendMessageSchema.parse(data);

    // Make API call
    const response = await this.fetch<any>(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });

    // Validate and return response (cast for compatibility)
    return MessageSchema.parse(response) as unknown as MessageWithSeq;
  }

  /**
   * Update a message with Zod validation
   */
  async updateMessage(
    channelId: string,
    messageId: string,
    data: UpdateMessage
  ): Promise<MessageWithSeq> {
    // Validate input
    const validatedData = UpdateMessageSchema.parse(data);

    // Make API call
    const response = await this.fetch<any>(`/api/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(validatedData),
    });

    // Validate and return response (cast for compatibility)
    return MessageSchema.parse(response) as unknown as MessageWithSeq;
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
   * Add a reaction to a message with Zod validation
   */
  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    // Validate emoji format
    const validatedData = AddReactionSchema.parse({ emoji });

    await this.fetch(`/api/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }

  /**
   * Remove a reaction from a message with Zod validation
   */
  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    // Validate emoji format
    const validatedData = AddReactionSchema.parse({ emoji });

    await this.fetch(`/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(validatedData.emoji)}`, {
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

  // ============================================================================
  // Private Utilities
  // ============================================================================

  /**
   * Extract app_id from JWT token
   */
  private extractAppIdFromToken(token: string): string | null {
    try {
      // JWT has 3 parts: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.log('error', 'Invalid token format - expected 3 parts');
        return null;
      }

      // Decode payload (base64url)
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

      // Use atob in browser, Buffer in Node.js
      const decoded = typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf-8');

      const payload = JSON.parse(decoded);
      return payload.app_id || null;
    } catch (error) {
      this.log('error', 'Failed to extract app_id from token', {
        error: (error as Error).message,
      });
      return null;
    }
  }
}

// Factory function
export function createChatClient(options: ChatClientOptions): ChatClient {
  return new ChatClient(options);
}
