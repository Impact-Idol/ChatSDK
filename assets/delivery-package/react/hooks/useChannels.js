/**
 * useChannels - Hook for querying and subscribing to channels
 *
 * Connection-aware: Only fetches when the client is connected.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatClient, useChatContext } from './ChatProvider';
/**
 * useChannels - Query and subscribe to channels
 *
 * @example
 * ```tsx
 * const { channels, loading, error } = useChannels();
 *
 * if (loading) return <Loading />;
 * if (error) return <Error error={error} />;
 *
 * return (
 *   <ChannelList>
 *     {channels.map(channel => (
 *       <ChannelPreview key={channel.id} channel={channel} />
 *     ))}
 *   </ChannelList>
 * );
 * ```
 */
export function useChannels(options = {}) {
    const { type, limit = 50, watch = true } = options;
    const client = useChatClient();
    const { isConnected } = useChatContext();
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const loadingRef = useRef(false);
    const hasFetchedRef = useRef(false);
    // Load channels
    const loadChannels = useCallback(async (reset = true) => {
        if (loadingRef.current)
            return;
        loadingRef.current = true;
        try {
            setLoading(true);
            const newOffset = reset ? 0 : offset;
            const result = await client.queryChannels({
                type,
                limit,
                offset: newOffset,
            });
            if (reset) {
                setChannels(result);
            }
            else {
                setChannels((prev) => [...prev, ...result]);
            }
            setOffset(newOffset + result.length);
            setHasMore(result.length === limit);
            setError(null);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [client, type, limit, offset]);
    // Initial load - only when connected
    useEffect(() => {
        if (!isConnected) {
            return;
        }
        // Prevent duplicate fetches on same params
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;
        loadChannels(true);
    }, [isConnected, client, type, limit, loadChannels]);
    // Reset fetch state on disconnect or param change
    useEffect(() => {
        if (!isConnected) {
            hasFetchedRef.current = false;
        }
    }, [isConnected]);
    // Reset when params change
    useEffect(() => {
        hasFetchedRef.current = false;
    }, [type, limit]);
    // Subscribe to channel updates
    useEffect(() => {
        if (!watch)
            return;
        const unsubCreated = client.on('channel.created', ({ channel }) => {
            setChannels((prev) => prev.some((c) => c.id === channel.id) ? prev : [channel, ...prev]);
        });
        const unsubUpdated = client.on('channel.updated', ({ channel }) => {
            setChannels((prev) => prev.map((c) => (c.id === channel.id ? { ...c, ...channel } : c)));
        });
        const unsubDeleted = client.on('channel.deleted', ({ channelId }) => {
            setChannels((prev) => prev.filter((c) => c.id !== channelId));
        });
        // Update unread counts
        const unsubUnread = client.on('channel.unread_changed', ({ channelId, count }) => {
            setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, unreadCount: count } : c));
        });
        return () => {
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            unsubUnread();
        };
    }, [client, watch]);
    const refresh = useCallback(() => loadChannels(true), [loadChannels]);
    const loadMore = useCallback(() => loadChannels(false), [loadChannels]);
    const createChannel = useCallback(async (data) => {
        const channel = await client.createChannel(data);
        setChannels((prev) => [channel, ...prev]);
        return channel;
    }, [client]);
    return {
        channels,
        loading,
        error,
        refresh,
        loadMore,
        hasMore,
        createChannel,
    };
}
/**
 * useChannel - Get a single channel by ID
 *
 * Connection-aware: Only fetches when the client is connected.
 */
export function useChannel(channelId) {
    const client = useChatClient();
    const { isConnected } = useChatContext();
    const [channel, setChannel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!channelId) {
            setChannel(null);
            setLoading(false);
            return;
        }
        // Wait for connection
        if (!isConnected) {
            return;
        }
        let cancelled = false;
        const init = async () => {
            try {
                setLoading(true);
                // Subscribe to this channel for real-time updates
                if (!cancelled) {
                    await client.subscribeToChannel(channelId);
                }
                // Load channel data
                const result = await client.getChannel(channelId);
                if (!cancelled) {
                    setChannel(result);
                    setError(null);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err);
                    setChannel(null);
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        init();
        // Listen for updates to this channel
        const unsubUpdated = client.on('channel.updated', ({ channel: updated }) => {
            if (updated.id === channelId && !cancelled) {
                setChannel((prev) => (prev ? { ...prev, ...updated } : updated));
            }
        });
        return () => {
            cancelled = true;
            unsubUpdated();
            client.unsubscribeFromChannel(channelId);
        };
    }, [client, channelId, isConnected]);
    const refresh = useCallback(async () => {
        if (!channelId)
            return;
        setLoading(true);
        try {
            const result = await client.getChannel(channelId);
            setChannel(result);
            setError(null);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [client, channelId]);
    return { channel, loading, error, refresh };
}
