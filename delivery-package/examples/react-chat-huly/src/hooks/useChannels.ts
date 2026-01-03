/**
 * Channel Hooks
 * React Query hooks for channel operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Channel, type CreateChannelRequest } from '../lib/api-client';

/**
 * Fetch all channels
 */
export function useChannels(params?: { workspaceId?: string; type?: string; enabled?: boolean }) {
  return useQuery({
    queryKey: ['channels', params],
    queryFn: () => api.channels.list(params),
    enabled: params?.enabled !== false, // Default to true, allow disabling
  });
}

/**
 * Fetch single channel
 */
export function useChannel(channelId: string) {
  return useQuery({
    queryKey: ['channels', channelId],
    queryFn: () => api.channels.get(channelId),
    enabled: !!channelId,
  });
}

/**
 * Create a new channel
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelRequest) => api.channels.create(data),
    onSuccess: () => {
      // Invalidate and refetch channels list
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

/**
 * Update a channel
 */
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateChannelRequest> }) =>
      api.channels.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific channel and list
      queryClient.invalidateQueries({ queryKey: ['channels', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

/**
 * Delete a channel
 */
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelId: string) => api.channels.delete(channelId),
    onSuccess: () => {
      // Invalidate channels list
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

/**
 * Star/unstar a channel
 */
export function useStarChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, starred }: { channelId: string; starred: boolean }) =>
      api.channels.star(channelId, starred),
    onMutate: async ({ channelId, starred }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['channels'] });

      // Snapshot previous value
      const previousChannels = queryClient.getQueryData(['channels']);

      // Optimistically update
      queryClient.setQueryData(['channels'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) =>
            ch.id === channelId ? { ...ch, starred } : ch
          ),
        };
      });

      return { previousChannels };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels'], context.previousChannels);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

/**
 * Mute/unmute a channel
 */
export function useMuteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, muted }: { channelId: string; muted: boolean }) =>
      api.channels.mute(channelId, muted),
    onMutate: async ({ channelId, muted }) => {
      await queryClient.cancelQueries({ queryKey: ['channels'] });
      const previousChannels = queryClient.getQueryData(['channels']);

      queryClient.setQueryData(['channels'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) =>
            ch.id === channelId ? { ...ch, muted } : ch
          ),
        };
      });

      return { previousChannels };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels'], context.previousChannels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

/**
 * Add members to a channel
 */
export function useAddChannelMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userIds }: { channelId: string; userIds: string[] }) =>
      api.channels.addMembers(channelId, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['channels', variables.channelId, 'members'] });
    },
  });
}

/**
 * Remove member from a channel
 */
export function useRemoveChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      api.channels.removeMember(channelId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['channels', variables.channelId, 'members'] });
    },
  });
}

/**
 * Get channel members
 */
export function useChannelMembers(channelId: string) {
  return useQuery({
    queryKey: ['channels', channelId, 'members'],
    queryFn: () => api.channels.getMembers(channelId),
    enabled: !!channelId,
  });
}
