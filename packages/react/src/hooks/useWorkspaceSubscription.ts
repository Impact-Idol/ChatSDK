/**
 * useWorkspaceSubscription - Hook for subscribing to workspace-level events
 *
 * Listens to channel lifecycle events (created, updated, deleted) and other
 * workspace-scoped events. Provides automatic cleanup on unmount.
 *
 * Callbacks are stored in refs so inline arrow functions won't cause
 * listener teardown/re-setup on every render.
 */

import { useEffect, useRef } from 'react';
import type { Channel } from '@chatsdk/core';
import { useChatClient } from './ChatProvider';

export type WorkspaceEvent =
  | { type: 'channel.created'; data: Channel }
  | { type: 'channel.updated'; data: Channel }
  | { type: 'channel.deleted'; data: { channelId: string } };

export interface UseWorkspaceSubscriptionOptions {
  /**
   * Called when a new channel is created
   */
  onChannelCreated?: (channel: Channel) => void;

  /**
   * Called when a channel is updated
   */
  onChannelUpdated?: (channel: Channel) => void;

  /**
   * Called when a channel is deleted
   */
  onChannelDeleted?: (channelId: string) => void;

  /**
   * Called for any workspace event
   */
  onEvent?: (event: WorkspaceEvent) => void;
}

/**
 * useWorkspaceSubscription - Subscribe to workspace-level real-time events
 *
 * @example
 * ```tsx
 * useWorkspaceSubscription({
 *   onChannelCreated: (channel) => {
 *     console.log('New channel:', channel.name);
 *     refreshChannelList();
 *   },
 *   onChannelDeleted: (channelId) => {
 *     console.log('Channel deleted:', channelId);
 *   },
 * });
 * ```
 */
export function useWorkspaceSubscription(
  options: UseWorkspaceSubscriptionOptions = {}
): void {
  const client = useChatClient();

  // Store callbacks in refs to avoid re-subscribing when inline functions change
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    const unsubCreated = client.on('channel.created', ({ channel }) => {
      callbacksRef.current.onChannelCreated?.(channel);
      callbacksRef.current.onEvent?.({ type: 'channel.created', data: channel });
    });

    const unsubUpdated = client.on('channel.updated', ({ channel }) => {
      callbacksRef.current.onChannelUpdated?.(channel);
      callbacksRef.current.onEvent?.({ type: 'channel.updated', data: channel });
    });

    const unsubDeleted = client.on('channel.deleted', ({ channelId }) => {
      callbacksRef.current.onChannelDeleted?.(channelId);
      callbacksRef.current.onEvent?.({ type: 'channel.deleted', data: { channelId } });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [client]);
}
