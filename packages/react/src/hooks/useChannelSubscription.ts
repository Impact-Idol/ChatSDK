/**
 * useChannelSubscription - Hook for subscribing to channel events
 *
 * Use this when you want to subscribe to channel events without loading messages.
 * For most use cases, useMessages() is preferred as it handles both loading and subscription.
 */

import { useEffect, useState, useCallback } from 'react';
import type { MessageWithSeq, Reaction } from '@chatsdk/core';
import { useChatClient } from './ChatProvider';

export interface ChannelEvent {
  type: 'message.new' | 'message.updated' | 'message.deleted' | 'reaction.added' | 'reaction.removed' | 'typing.start' | 'typing.stop';
  channelId: string;
  data: any;
}

export interface UseChannelSubscriptionOptions {
  /**
   * Called when a new message is received
   */
  onMessage?: (message: MessageWithSeq) => void;

  /**
   * Called when a message is updated
   */
  onMessageUpdated?: (message: MessageWithSeq) => void;

  /**
   * Called when a message is deleted
   */
  onMessageDeleted?: (messageId: string) => void;

  /**
   * Called when a reaction is added
   */
  onReactionAdded?: (messageId: string, reaction: Reaction) => void;

  /**
   * Called when a reaction is removed
   */
  onReactionRemoved?: (messageId: string, reaction: Reaction) => void;

  /**
   * Called when a user starts typing
   */
  onTypingStart?: (userId: string, userName: string) => void;

  /**
   * Called when a user stops typing
   */
  onTypingStop?: (userId: string) => void;

  /**
   * Called for any channel event
   */
  onEvent?: (event: ChannelEvent) => void;
}

export interface UseChannelSubscriptionResult {
  /**
   * Whether the subscription is active
   */
  isSubscribed: boolean;

  /**
   * Any error that occurred during subscription
   */
  error: Error | null;

  /**
   * Manually subscribe to the channel
   */
  subscribe: () => Promise<void>;

  /**
   * Manually unsubscribe from the channel
   */
  unsubscribe: () => void;
}

/**
 * useChannelSubscription - Subscribe to real-time channel events
 *
 * @example
 * ```tsx
 * // Simple subscription with callbacks
 * const { isSubscribed } = useChannelSubscription(channelId, {
 *   onMessage: (message) => console.log('New message:', message),
 *   onTypingStart: (userId, name) => console.log(`${name} is typing...`),
 * });
 *
 * // With React Query cache invalidation
 * const queryClient = useQueryClient();
 * useChannelSubscription(channelId, {
 *   onMessage: () => queryClient.invalidateQueries(['messages', channelId]),
 * });
 * ```
 */
export function useChannelSubscription(
  channelId: string | null,
  options: UseChannelSubscriptionOptions = {}
): UseChannelSubscriptionResult {
  const client = useChatClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onReactionAdded,
    onReactionRemoved,
    onTypingStart,
    onTypingStop,
    onEvent,
  } = options;

  const subscribe = useCallback(async () => {
    if (!channelId) return;

    try {
      await client.subscribeToChannel(channelId);
      setIsSubscribed(true);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setIsSubscribed(false);
    }
  }, [client, channelId]);

  const unsubscribe = useCallback(() => {
    if (!channelId) return;

    client.unsubscribeFromChannel(channelId);
    setIsSubscribed(false);
  }, [client, channelId]);

  useEffect(() => {
    if (!channelId) {
      setIsSubscribed(false);
      return;
    }

    let isMounted = true;

    // Subscribe to channel
    const init = async () => {
      try {
        await client.subscribeToChannel(channelId);
        if (isMounted) {
          setIsSubscribed(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setIsSubscribed(false);
        }
      }
    };

    init();

    // Set up event listeners
    const unsubNew = client.on('message.new', ({ channelId: cid, message }) => {
      if (cid === channelId) {
        onMessage?.(message);
        onEvent?.({ type: 'message.new', channelId: cid, data: message });
      }
    });

    const unsubUpdated = client.on('message.updated', ({ channelId: cid, message }) => {
      if (cid === channelId) {
        onMessageUpdated?.(message);
        onEvent?.({ type: 'message.updated', channelId: cid, data: message });
      }
    });

    const unsubDeleted = client.on('message.deleted', ({ channelId: cid, messageId }) => {
      if (cid === channelId) {
        onMessageDeleted?.(messageId);
        onEvent?.({ type: 'message.deleted', channelId: cid, data: { messageId } });
      }
    });

    const unsubReactionAdded = client.on('reaction.added', ({ channelId: cid, messageId, reaction }) => {
      if (cid === channelId) {
        onReactionAdded?.(messageId, reaction);
        onEvent?.({ type: 'reaction.added', channelId: cid, data: { messageId, reaction } });
      }
    });

    const unsubReactionRemoved = client.on('reaction.removed', ({ channelId: cid, messageId, reaction }) => {
      if (cid === channelId) {
        onReactionRemoved?.(messageId, reaction);
        onEvent?.({ type: 'reaction.removed', channelId: cid, data: { messageId, reaction } });
      }
    });

    const unsubTypingStart = client.on('typing.start', ({ channelId: cid, userId, userName }) => {
      if (cid === channelId) {
        onTypingStart?.(userId, userName);
        onEvent?.({ type: 'typing.start', channelId: cid, data: { userId, userName } });
      }
    });

    const unsubTypingStop = client.on('typing.stop', ({ channelId: cid, userId }) => {
      if (cid === channelId) {
        onTypingStop?.(userId);
        onEvent?.({ type: 'typing.stop', channelId: cid, data: { userId } });
      }
    });

    return () => {
      isMounted = false;
      unsubNew();
      unsubUpdated();
      unsubDeleted();
      unsubReactionAdded();
      unsubReactionRemoved();
      unsubTypingStart();
      unsubTypingStop();
      client.unsubscribeFromChannel(channelId);
    };
  }, [
    client,
    channelId,
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onReactionAdded,
    onReactionRemoved,
    onTypingStart,
    onTypingStop,
    onEvent,
  ]);

  return {
    isSubscribed,
    error,
    subscribe,
    unsubscribe,
  };
}
