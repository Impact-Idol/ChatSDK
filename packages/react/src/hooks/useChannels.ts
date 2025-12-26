/**
 * useChannels - Hook for querying and subscribing to channels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Channel } from '@chatsdk/core';
import { useChatClient } from './ChatProvider';

export interface UseChannelsOptions {
  type?: string;
  limit?: number;
  watch?: boolean;
}

export interface UseChannelsResult {
  channels: Channel[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

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
export function useChannels(options: UseChannelsOptions = {}): UseChannelsResult {
  const { type, limit = 50, watch = true } = options;
  const client = useChatClient();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);

  // Load channels
  const loadChannels = useCallback(
    async (reset = true) => {
      if (loadingRef.current) return;
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
        } else {
          setChannels((prev) => [...prev, ...result]);
        }

        setOffset(newOffset + result.length);
        setHasMore(result.length === limit);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [client, type, limit, offset]
  );

  // Initial load
  useEffect(() => {
    loadChannels(true);
  }, [client, type, limit]);

  // Subscribe to channel updates
  useEffect(() => {
    if (!watch) return;

    const unsubCreated = client.on('channel.created', ({ channel }) => {
      setChannels((prev) => [channel, ...prev]);
    });

    const unsubUpdated = client.on('channel.updated', ({ channel }) => {
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, ...channel } : c))
      );
    });

    const unsubDeleted = client.on('channel.deleted', ({ channelId }) => {
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
    });

    // Update unread counts
    const unsubUnread = client.on('channel.unread_changed', ({ channelId, count }) => {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId ? { ...c, unreadCount: count } as Channel : c
        )
      );
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

  return {
    channels,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
  };
}

/**
 * useChannel - Get a single channel by ID
 */
export function useChannel(channelId: string | null) {
  const client = useChatClient();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!channelId) {
      setChannel(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadChannel = async () => {
      try {
        setLoading(true);
        const result = await client.getChannel(channelId);
        if (!cancelled) {
          setChannel(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setChannel(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadChannel();

    // Subscribe to this channel for real-time updates
    client.subscribeToChannel(channelId);

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
  }, [client, channelId]);

  const refresh = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const result = await client.getChannel(channelId);
      setChannel(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client, channelId]);

  return { channel, loading, error, refresh };
}
