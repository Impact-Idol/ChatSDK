/**
 * WebSocket Client for Next.js
 *
 * Centrifugo WebSocket connection for real-time chat events.
 */

'use client';

import { Centrifuge } from 'centrifuge';
import type { QueryClient } from '@tanstack/react-query';
import { getChatConfig } from './chat-config';
import type { Channel, Message, Workspace } from './api-client';

export interface ChatEvent {
  type: string;
  payload: Record<string, unknown>;
}

export type EventHandler = (event: ChatEvent) => void;

class WebSocketClient {
  private client: Centrifuge | null = null;
  private subscriptions: Map<string, ReturnType<Centrifuge['newSubscription']>> = new Map();
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private queryClient: QueryClient | null = null;

  /**
   * Set the QueryClient for cache updates
   */
  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
  }

  /**
   * Initialize WebSocket connection
   */
  connect(wsToken: string, appId: string): void {
    if (this.client) {
      this.disconnect();
    }

    const config = getChatConfig();

    this.client = new Centrifuge(config.wsUrl, {
      token: wsToken,
    });

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
  disconnect(): void {
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
  private subscribeToApp(appId: string): void {
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
  subscribeToWorkspace(appId: string, workspaceId: string): void {
    const channel = `workspace:${appId}:${workspaceId}`;

    if (this.subscriptions.has(channel)) {
      return;
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
  subscribeToChannel(appId: string, channelId: string): void {
    const channel = `chat:${appId}:${channelId}`;

    if (this.subscriptions.has(channel)) {
      return;
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
  unsubscribeFromChannel(appId: string, channelId: string): void {
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
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Handle incoming event
   */
  private handleEvent(event: ChatEvent): void {
    console.log('[WebSocket] Event received:', event.type, event.payload);

    // Call registered handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }

    // Update React Query cache
    this.updateQueryCache(event);
  }

  /**
   * Update React Query cache based on event type
   */
  private updateQueryCache(event: ChatEvent): void {
    if (!this.queryClient) return;

    switch (event.type) {
      case 'channel.created':
        this.queryClient.invalidateQueries({ queryKey: ['channels'] });
        break;

      case 'channel.updated':
        const updatedChannel = event.payload.channel as Channel;
        this.queryClient.setQueryData(['channels', updatedChannel.id], updatedChannel);
        this.queryClient.invalidateQueries({ queryKey: ['channels'] });
        break;

      case 'channel.deleted':
        const deletedChannelId = event.payload.channelId as string;
        this.queryClient.removeQueries({ queryKey: ['channels', deletedChannelId] });
        this.queryClient.invalidateQueries({ queryKey: ['channels'] });
        break;

      case 'message.new':
        const newMessage = event.payload.message as Message;
        this.queryClient.setQueryData(
          ['messages', newMessage.channelId],
          (old: { messages: Message[]; hasMore: boolean } | undefined) => {
            if (!old) return { messages: [newMessage], hasMore: false };
            const exists = old.messages.some((m) => m.id === newMessage.id);
            if (exists) return old;
            return {
              ...old,
              messages: [...old.messages, newMessage],
            };
          }
        );
        this.queryClient.invalidateQueries({ queryKey: ['channels'] });
        break;

      case 'message.updated':
        const updatedMessage = event.payload.message as Message;
        this.queryClient.setQueryData(
          ['messages', updatedMessage.channelId],
          (old: { messages: Message[]; hasMore: boolean } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.id === updatedMessage.id ? updatedMessage : m
              ),
            };
          }
        );
        break;

      case 'message.deleted':
        const { channelId, messageId } = event.payload as {
          channelId: string;
          messageId: string;
        };
        this.queryClient.setQueryData(
          ['messages', channelId],
          (old: { messages: Message[]; hasMore: boolean } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.filter((m) => m.id !== messageId),
            };
          }
        );
        break;

      case 'workspace.created':
        this.queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        break;

      case 'workspace.updated':
        const updatedWorkspace = event.payload.workspace as Workspace;
        this.queryClient.setQueryData(
          ['workspaces', updatedWorkspace.id],
          updatedWorkspace
        );
        this.queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        break;

      case 'workspace.deleted':
        const deletedWorkspaceId = event.payload.workspaceId as string;
        this.queryClient.removeQueries({
          queryKey: ['workspaces', deletedWorkspaceId],
        });
        this.queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        break;
    }
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
