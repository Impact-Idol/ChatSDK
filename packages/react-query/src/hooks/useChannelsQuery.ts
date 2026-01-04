'use client';

/**
 * useChannelsQuery - React Query hook for channels
 *
 * Provides native React Query integration with real-time updates.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type UseQueryOptions, type UseMutationOptions, type UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useChatClient, useChatContext } from '@chatsdk/react';
import type { Channel } from '@chatsdk/core';

// Define CreateChannel input type (matches the schema in core)
export interface CreateChannelInput {
  type: string;
  id?: string;
  name?: string;
  image?: string;
  members?: string[];
  custom?: Record<string, unknown>;
}

// Query keys factory
export const channelKeys = {
  all: ['chatsdk', 'channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (filters?: { type?: string; workspaceId?: string }) => [...channelKeys.lists(), filters] as const,
  infinite: (filters?: { type?: string; workspaceId?: string }) => [...channelKeys.all, 'infinite', filters] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  members: (id: string) => [...channelKeys.detail(id), 'members'] as const,
};

export interface ChannelFilters {
  type?: string;
  workspaceId?: string;
  limit?: number;
}

/**
 * useChannelsQuery - Query channels with React Query
 *
 * @example
 * ```tsx
 * const { data: channels, isLoading } = useChannelsQuery();
 *
 * // With filters
 * const { data } = useChannelsQuery({ type: 'messaging' });
 * ```
 */
export function useChannelsQuery(
  filters?: ChannelFilters,
  options?: Omit<UseQueryOptions<Channel[], Error>, 'queryKey' | 'queryFn'>
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: channelKeys.list(filters),
    queryFn: async (): Promise<Channel[]> => {
      const channels = await client.queryChannels({
        type: filters?.type,
        limit: filters?.limit ?? 50,
      });
      return channels;
    },
    enabled: isConnected && (options?.enabled ?? true),
    staleTime: 30000,
    ...options,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubCreated = client.on('channel.created', ({ channel }) => {
      queryClient.setQueryData<Channel[]>(channelKeys.list(filters), (old) =>
        old ? [channel, ...old] : [channel]
      );
    });

    const unsubUpdated = client.on('channel.updated', ({ channel }) => {
      queryClient.setQueryData<Channel[]>(channelKeys.list(filters), (old) =>
        old?.map((c) => (c.id === channel.id ? { ...c, ...channel } : c))
      );
      queryClient.setQueryData(channelKeys.detail(channel.id), (old: Channel | undefined) =>
        old ? { ...old, ...channel } : channel
      );
    });

    const unsubDeleted = client.on('channel.deleted', ({ channelId }) => {
      queryClient.setQueryData<Channel[]>(channelKeys.list(filters), (old) =>
        old?.filter((c) => c.id !== channelId)
      );
      queryClient.removeQueries({ queryKey: channelKeys.detail(channelId) });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [client, isConnected, queryClient, filters]);

  return query;
}

/**
 * useInfiniteChannelsQuery - Paginated channels query
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * } = useInfiniteChannelsQuery();
 *
 * // Flatten pages
 * const channels = data?.pages.flatMap(page => page.channels) ?? [];
 * ```
 */
export function useInfiniteChannelsQuery(
  filters?: Omit<ChannelFilters, 'limit'> & { pageSize?: number },
  options?: Omit<UseInfiniteQueryOptions<{ channels: Channel[]; nextOffset: number | null }, Error>, 'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'>
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();
  const pageSize = filters?.pageSize ?? 50;

  return useInfiniteQuery({
    queryKey: channelKeys.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const channels = await client.queryChannels({
        type: filters?.type,
        limit: pageSize,
        offset: pageParam as number,
      });

      return {
        channels,
        nextOffset: channels.length === pageSize ? (pageParam as number) + pageSize : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: isConnected && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * useChannelQuery - Query a single channel
 */
export function useChannelQuery(
  channelId: string | null,
  options?: Omit<UseQueryOptions<Channel | null, Error>, 'queryKey' | 'queryFn'>
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: channelKeys.detail(channelId || ''),
    queryFn: async (): Promise<Channel | null> => {
      if (!channelId) return null;
      return client.getChannel(channelId);
    },
    enabled: isConnected && !!channelId && (options?.enabled ?? true),
    ...options,
  });

  // Subscribe to channel updates
  useEffect(() => {
    if (!channelId || !isConnected) return;

    // Subscribe for real-time updates
    client.subscribeToChannel(channelId);

    const unsubUpdated = client.on('channel.updated', ({ channel }) => {
      if (channel.id === channelId) {
        queryClient.setQueryData(channelKeys.detail(channelId), (old: Channel | undefined) =>
          old ? { ...old, ...channel } : channel
        );
      }
    });

    return () => {
      unsubUpdated();
      client.unsubscribeFromChannel(channelId);
    };
  }, [client, channelId, isConnected, queryClient]);

  return query;
}

/**
 * useCreateChannelMutation - Create a new channel
 */
export function useCreateChannelMutation(
  options?: UseMutationOptions<Channel, Error, CreateChannelInput>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChannelInput): Promise<Channel> => {
      return client.createChannel(input as any);
    },
    onSuccess: (newChannel) => {
      // Invalidate channel lists to refetch
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
      // Set detail cache
      queryClient.setQueryData(channelKeys.detail(newChannel.id), newChannel);
    },
    ...options,
  });
}

/**
 * useJoinChannelMutation - Join a channel
 */
export function useJoinChannelMutation(
  options?: UseMutationOptions<void, Error, string>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string): Promise<void> => {
      await client.fetch(`/api/channels/${channelId}/members`, {
        method: 'POST',
      });
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(channelId) });
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
    },
    ...options,
  });
}

/**
 * useLeaveChannelMutation - Leave a channel
 */
export function useLeaveChannelMutation(
  options?: UseMutationOptions<void, Error, string>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string): Promise<void> => {
      await client.fetch(`/api/channels/${channelId}/members/me`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(channelId) });
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
    },
    ...options,
  });
}
