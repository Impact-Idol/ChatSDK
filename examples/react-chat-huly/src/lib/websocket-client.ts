/**
 * WebSocket Client
 * Centrifugo WebSocket connection for real-time events
 */

import { Centrifuge } from 'centrifuge';
import { queryClient } from './query-provider';
import type { Channel, Message, Workspace } from './api-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/connection/websocket';

export interface ChatEvent {
  type: string;
  payload: any;
}

export type EventHandler = (event: ChatEvent) => void;

class WebSocketClient {
  private client: Centrifuge | null = null;
  private subscriptions: Map<string, any> = new Map();
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Initialize WebSocket connection
   */
  connect(wsToken: string, appId: string) {
    if (this.client) {
      this.disconnect();
    }

    this.client = new Centrifuge(WS_URL, {
      token: wsToken,
    });

    // Handle connection state changes
    this.client.on('connected', () => {
      console.log('[WebSocket] Connected to Centrifugo');
    });

    this.client.on('disconnected', (ctx) => {
      console.log('[WebSocket] Disconnected:', ctx.reason);
    });

    this.client.on('error', (ctx) => {
      console.error('[WebSocket] Error:', ctx.error);
    });

    // Subscribe to app-wide channel
    this.subscribeToApp(appId);

    this.client.connect();
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.client) {
      this.subscriptions.forEach((sub) => {
        sub.unsubscribe();
      });
      this.subscriptions.clear();
      this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Subscribe to app-wide events
   */
  private subscribeToApp(appId: string) {
    const channel = `app:${appId}`;
    const sub = this.client?.newSubscription(channel);

    if (!sub) return;

    sub.on('publication', (ctx) => {
      const event: ChatEvent = ctx.data;
      this.handleEvent(event);
    });

    sub.subscribe();
    this.subscriptions.set(channel, sub);
  }

  /**
   * Subscribe to workspace events
   */
  subscribeToWorkspace(appId: string, workspaceId: string) {
    const channel = `workspace:${appId}:${workspaceId}`;

    if (this.subscriptions.has(channel)) {
      return; // Already subscribed
    }

    const sub = this.client?.newSubscription(channel);
    if (!sub) return;

    sub.on('publication', (ctx) => {
      const event: ChatEvent = ctx.data;
      this.handleEvent(event);
    });

    sub.subscribe();
    this.subscriptions.set(channel, sub);
  }

  /**
   * Subscribe to channel events
   */
  subscribeToChannel(appId: string, channelId: string) {
    const channel = `chat:${appId}:${channelId}`;

    if (this.subscriptions.has(channel)) {
      return; // Already subscribed
    }

    const sub = this.client?.newSubscription(channel);
    if (!sub) return;

    sub.on('publication', (ctx) => {
      const event: ChatEvent = ctx.data;
      this.handleEvent(event);
    });

    sub.subscribe();
    this.subscriptions.set(channel, sub);
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribeFromChannel(appId: string, channelId: string) {
    const channel = `chat:${appId}:${channelId}`;
    const sub = this.subscriptions.get(channel);

    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(channel);
    }
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: EventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Handle incoming event
   */
  private handleEvent(event: ChatEvent) {
    console.log('[WebSocket] Event received:', event.type, event.payload);

    // Call registered handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }

    // Update React Query cache based on event type
    switch (event.type) {
      // Channel events
      case 'channel.created':
        this.handleChannelCreated(event.payload.channel);
        break;
      case 'channel.updated':
        this.handleChannelUpdated(event.payload.channel);
        break;
      case 'channel.deleted':
        this.handleChannelDeleted(event.payload.channelId);
        break;
      case 'channel.member_joined':
        this.handleChannelMemberJoined(event.payload.channelId, event.payload.userId);
        break;
      case 'channel.member_left':
        this.handleChannelMemberLeft(event.payload.channelId, event.payload.userId);
        break;

      // Message events
      case 'message.new':
        this.handleMessageNew(event.payload.message);
        break;
      case 'message.updated':
        this.handleMessageUpdated(event.payload.message);
        break;
      case 'message.deleted':
        this.handleMessageDeleted(event.payload.channelId, event.payload.messageId);
        break;

      // Reaction events
      case 'reaction.added':
      case 'reaction.removed':
        this.handleReactionChange(event.payload.channelId, event.payload.messageId);
        break;

      // Workspace events
      case 'workspace.created':
        this.handleWorkspaceCreated(event.payload.workspace);
        break;
      case 'workspace.updated':
        this.handleWorkspaceUpdated(event.payload.workspace);
        break;
      case 'workspace.deleted':
        this.handleWorkspaceDeleted(event.payload.workspaceId);
        break;

      // Typing events
      case 'typing.start':
      case 'typing.stop':
        // Handle typing indicators in UI components
        break;

      default:
        console.log('[WebSocket] Unhandled event type:', event.type);
    }
  }

  // ============================================================================
  // Event Handlers - Update React Query Cache
  // ============================================================================

  private handleChannelCreated(channel: Channel) {
    queryClient.invalidateQueries({ queryKey: ['channels'] });
  }

  private handleChannelUpdated(channel: Channel) {
    queryClient.setQueryData(['channels', channel.id], channel);
    queryClient.invalidateQueries({ queryKey: ['channels'] });
  }

  private handleChannelDeleted(channelId: string) {
    queryClient.removeQueries({ queryKey: ['channels', channelId] });
    queryClient.invalidateQueries({ queryKey: ['channels'] });
  }

  private handleChannelMemberJoined(channelId: string, _userId: string) {
    queryClient.invalidateQueries({ queryKey: ['channels', channelId, 'members'] });
  }

  private handleChannelMemberLeft(channelId: string, _userId: string) {
    queryClient.invalidateQueries({ queryKey: ['channels', channelId, 'members'] });
  }

  private handleMessageNew(message: Message) {
    // Add message to channel's message list
    queryClient.setQueryData(['messages', message.channelId], (old: any) => {
      if (!old) return { messages: [message] };

      // Avoid duplicates
      const exists = old.messages.some((m: Message) => m.id === message.id);
      if (exists) return old;

      return {
        ...old,
        messages: [...old.messages, message],
      };
    });

    // Update channel's lastMessageAt
    queryClient.invalidateQueries({ queryKey: ['channels'] });
  }

  private handleMessageUpdated(message: Message) {
    queryClient.setQueryData(['messages', message.channelId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m: Message) =>
          m.id === message.id ? message : m
        ),
      };
    });
  }

  private handleMessageDeleted(channelId: string, messageId: string) {
    queryClient.setQueryData(['messages', channelId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.filter((m: Message) => m.id !== messageId),
      };
    });
  }

  private handleReactionChange(channelId: string, _messageId: string) {
    // Refetch messages to get updated reaction counts
    queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
  }

  private handleWorkspaceCreated(workspace: Workspace) {
    queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  }

  private handleWorkspaceUpdated(workspace: Workspace) {
    queryClient.setQueryData(['workspaces', workspace.id], workspace);
    queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  }

  private handleWorkspaceDeleted(workspaceId: string) {
    queryClient.removeQueries({ queryKey: ['workspaces', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
