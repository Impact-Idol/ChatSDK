/**
 * Message Hooks
 * React Query hooks for message operations
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api, type Message, type SendMessageRequest } from '../lib/api-client';

/**
 * Fetch messages for a channel
 */
export function useMessages(channelId: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => api.messages.list(channelId, { limit: options?.limit }),
    enabled: !!channelId,
  });
}

/**
 * Infinite scroll messages (for pagination)
 */
export function useInfiniteMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', channelId, 'infinite'],
    queryFn: ({ pageParam }) =>
      api.messages.list(channelId, { limit: 50, before: pageParam }),
    getNextPageParam: (lastPage) => {
      const messages = lastPage.messages;
      if (messages.length === 0) return undefined;
      return messages[messages.length - 1].id;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!channelId,
  });
}

/**
 * Send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => api.messages.send(data),
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', newMessage.channelId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(['messages', newMessage.channelId]);

      // Optimistically add the new message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        channelId: newMessage.channelId,
        userId: 'current-user', // Will be replaced by server
        text: newMessage.text,
        createdAt: new Date().toISOString(),
        mentions: newMessage.mentions,
        reactions: [],
      };

      queryClient.setQueryData(['messages', newMessage.channelId], (old: any) => {
        if (!old) return { messages: [optimisticMessage] };
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      });

      return { previousMessages };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.channelId], context.previousMessages);
      }
    },
    onSuccess: (data, variables) => {
      // Refetch to get the real message from server
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
  });
}

/**
 * Update a message
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      api.messages.update(messageId, text),
    onSuccess: (data) => {
      // Invalidate the messages for this channel
      queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] });
    },
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, channelId }: { messageId: string; channelId: string }) =>
      api.messages.delete(messageId),
    onMutate: async ({ messageId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });
      const previousMessages = queryClient.getQueryData(['messages', channelId]);

      // Optimistically remove the message
      queryClient.setQueryData(['messages', channelId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((msg: Message) => msg.id !== messageId),
        };
      });

      return { previousMessages };
    },
    onError: (_err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.channelId], context.previousMessages);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
  });
}

/**
 * Pin/unpin a message
 */
export function usePinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, pinned, channelId }: { messageId: string; pinned: boolean; channelId: string }) =>
      api.messages.pin(messageId, pinned, channelId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
  });
}

/**
 * Add reaction to a message
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji, channelId }: { messageId: string; emoji: string; channelId: string }) =>
      api.messages.addReaction(messageId, emoji),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
  });
}

/**
 * Remove reaction from a message
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji, channelId }: { messageId: string; emoji: string; channelId: string }) =>
      api.messages.removeReaction(messageId, emoji),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channelId] });
    },
  });
}

/**
 * Get thread replies for a message
 */
export function useThreadReplies(messageId: string) {
  return useQuery({
    queryKey: ['messages', messageId, 'replies'],
    queryFn: () => api.messages.getThreadReplies(messageId),
    enabled: !!messageId,
  });
}

/**
 * Search messages
 */
export function useSearchMessages(query: string, channelId?: string) {
  return useQuery({
    queryKey: ['search', 'messages', query, channelId],
    queryFn: () => api.search.messages({ query, channelId }),
    enabled: query.length > 0,
  });
}
