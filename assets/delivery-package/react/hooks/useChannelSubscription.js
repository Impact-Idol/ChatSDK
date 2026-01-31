/**
 * useChannelSubscription - Hook for subscribing to channel events
 *
 * Use this when you want to subscribe to channel events without loading messages.
 * For most use cases, useMessages() is preferred as it handles both loading and subscription.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatClient } from './ChatProvider';
/**
 * Check if an error indicates the channel is already subscribed.
 * This can happen in React strict mode (double-mount) or when multiple
 * hooks subscribe to the same channel (e.g., useMessages + useChannelSubscription).
 *
 * Note: Matches Centrifuge client error messages ("subscription already exists").
 * If the Centrifuge SDK changes its error wording, this check may need updating.
 */
export function isAlreadySubscribedError(err) {
    if (!(err instanceof Error))
        return false;
    const msg = err.message.toLowerCase();
    return msg.includes('already subscribed') || msg.includes('subscription already exists');
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
export function useChannelSubscription(channelId, options = {}) {
    const client = useChatClient();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState(null);
    // Store callbacks in refs to avoid re-subscribing when inline functions change
    const callbacksRef = useRef(options);
    callbacksRef.current = options;
    const subscribe = useCallback(async () => {
        if (!channelId)
            return;
        try {
            await client.subscribeToChannel(channelId);
            setIsSubscribed(true);
            setError(null);
        }
        catch (err) {
            if (isAlreadySubscribedError(err)) {
                // Channel is already subscribed — treat as success
                setIsSubscribed(true);
                setError(null);
            }
            else {
                setError(err);
                setIsSubscribed(false);
            }
        }
    }, [client, channelId]);
    const unsubscribe = useCallback(() => {
        if (!channelId)
            return;
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
            }
            catch (err) {
                if (isMounted) {
                    if (isAlreadySubscribedError(err)) {
                        // Channel is already subscribed — treat as success
                        setIsSubscribed(true);
                        setError(null);
                    }
                    else {
                        setError(err);
                        setIsSubscribed(false);
                    }
                }
            }
        };
        init();
        // Set up event listeners (read from ref to avoid dependency on inline callbacks)
        const unsubNew = client.on('message.new', ({ channelId: cid, message }) => {
            if (cid === channelId) {
                callbacksRef.current.onMessage?.(message);
                callbacksRef.current.onEvent?.({ type: 'message.new', channelId: cid, data: message });
            }
        });
        const unsubUpdated = client.on('message.updated', ({ channelId: cid, message }) => {
            if (cid === channelId) {
                callbacksRef.current.onMessageUpdated?.(message);
                callbacksRef.current.onEvent?.({ type: 'message.updated', channelId: cid, data: message });
            }
        });
        const unsubDeleted = client.on('message.deleted', ({ channelId: cid, messageId }) => {
            if (cid === channelId) {
                callbacksRef.current.onMessageDeleted?.(messageId);
                callbacksRef.current.onEvent?.({ type: 'message.deleted', channelId: cid, data: { messageId } });
            }
        });
        const unsubReactionAdded = client.on('reaction.added', ({ channelId: cid, messageId, reaction }) => {
            if (cid === channelId) {
                callbacksRef.current.onReactionAdded?.(messageId, reaction);
                callbacksRef.current.onEvent?.({ type: 'reaction.added', channelId: cid, data: { messageId, reaction } });
            }
        });
        const unsubReactionRemoved = client.on('reaction.removed', ({ channelId: cid, messageId, reaction }) => {
            if (cid === channelId) {
                callbacksRef.current.onReactionRemoved?.(messageId, reaction);
                callbacksRef.current.onEvent?.({ type: 'reaction.removed', channelId: cid, data: { messageId, reaction } });
            }
        });
        const unsubTypingStart = client.on('typing.start', ({ channelId: cid, user }) => {
            if (cid === channelId) {
                callbacksRef.current.onTypingStart?.(user.id, user.name);
                callbacksRef.current.onEvent?.({ type: 'typing.start', channelId: cid, data: { userId: user.id, userName: user.name } });
            }
        });
        const unsubTypingStop = client.on('typing.stop', ({ channelId: cid, user }) => {
            if (cid === channelId) {
                callbacksRef.current.onTypingStop?.(user.id);
                callbacksRef.current.onEvent?.({ type: 'typing.stop', channelId: cid, data: { userId: user.id } });
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
    }, [client, channelId]);
    return {
        isSubscribed,
        error,
        subscribe,
        unsubscribe,
    };
}
