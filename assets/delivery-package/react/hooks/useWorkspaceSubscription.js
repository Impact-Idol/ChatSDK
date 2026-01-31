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
import { useChatClient } from './ChatProvider';
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
export function useWorkspaceSubscription(options = {}) {
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
