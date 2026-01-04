'use client';

/**
 * useMessagesQuery - React Query hook for messages
 *
 * Provides native React Query integration with:
 * - Optimistic updates for sending messages
 * - Real-time message sync
 * - Infinite scrolling support
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useChatClient, useChatContext } from '@chatsdk/react';
import type { MessageWithSeq } from '@chatsdk/core';

/**
 * Input for sending a new message
 */
export interface SendMessageInput {
  text?: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'file';
    name: string;
    url: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string;
    blurhash?: string;
  }>;
  parentId?: string;
  replyToId?: string;
  mentionedUserIds?: string[];
  clientMsgId?: string;
}

/**
 * Input for updating a message
 */
export interface UpdateMessageInput {
  text: string;
}

// Query keys factory
export const messageKeys = {
  all: ['chatsdk', 'messages'] as const,
  channel: (channelId: string) => [...messageKeys.all, channelId] as const,
  list: (channelId: string, filters?: Record<string, unknown>) =>
    [...messageKeys.channel(channelId), 'list', filters] as const,
  infinite: (channelId: string) => [...messageKeys.channel(channelId), 'infinite'] as const,
  detail: (channelId: string, messageId: string) =>
    [...messageKeys.channel(channelId), 'detail', messageId] as const,
  thread: (channelId: string, parentId: string) =>
    [...messageKeys.channel(channelId), 'thread', parentId] as const,
};

export interface MessagesResponse {
  messages: MessageWithSeq[];
  maxSeq: number;
  hasMore: boolean;
}

/**
 * useMessagesQuery - Query messages in a channel
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMessagesQuery(channelId);
 * const messages = data?.messages ?? [];
 * ```
 */
export function useMessagesQuery(
  channelId: string | null,
  options?: Omit<UseQueryOptions<MessagesResponse, Error>, 'queryKey' | 'queryFn'> & {
    limit?: number;
  }
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();
  const queryClient = useQueryClient();
  const limit = options?.limit ?? 50;

  const query = useQuery({
    queryKey: messageKeys.list(channelId || '', { limit }),
    queryFn: async (): Promise<MessagesResponse> => {
      if (!channelId) return { messages: [], maxSeq: 0, hasMore: false };
      return client.queryMessages(channelId, { limit });
    },
    enabled: isConnected && !!channelId && (options?.enabled ?? true),
    staleTime: 10000, // Messages update frequently
    ...options,
  });

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!channelId || !isConnected) return;

    const unsubNew = client.on('message.new', ({ channelId: cid, message }) => {
      if (cid === channelId) {
        queryClient.setQueryData<MessagesResponse>(
          messageKeys.list(channelId, { limit }),
          (old) => {
            if (!old) return { messages: [message], maxSeq: message.seq, hasMore: false };
            // Add message if not already present
            const exists = old.messages.some((m) => m.id === message.id);
            if (exists) return old;
            return {
              ...old,
              messages: [...old.messages, message],
              maxSeq: Math.max(old.maxSeq, message.seq),
            };
          }
        );
      }
    });

    const unsubUpdated = client.on('message.updated', ({ channelId: cid, message }) => {
      if (cid === channelId) {
        queryClient.setQueryData<MessagesResponse>(
          messageKeys.list(channelId, { limit }),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.id === message.id ? { ...m, ...message } : m
              ),
            };
          }
        );
      }
    });

    const unsubDeleted = client.on('message.deleted', ({ channelId: cid, messageId }) => {
      if (cid === channelId) {
        queryClient.setQueryData<MessagesResponse>(
          messageKeys.list(channelId, { limit }),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.filter((m) => m.id !== messageId),
            };
          }
        );
      }
    });

    return () => {
      unsubNew();
      unsubUpdated();
      unsubDeleted();
    };
  }, [client, channelId, isConnected, queryClient, limit]);

  return query;
}

/**
 * useInfiniteMessagesQuery - Paginated messages with infinite scroll
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * } = useInfiniteMessagesQuery(channelId);
 *
 * const messages = data?.pages.flatMap(page => page.messages) ?? [];
 * ```
 */
export function useInfiniteMessagesQuery(
  channelId: string | null,
  options?: Omit<
    UseInfiniteQueryOptions<MessagesResponse, Error>,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  > & { pageSize?: number }
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();
  const pageSize = options?.pageSize ?? 50;

  return useInfiniteQuery({
    queryKey: messageKeys.infinite(channelId || ''),
    queryFn: async ({ pageParam }): Promise<MessagesResponse> => {
      if (!channelId) return { messages: [], maxSeq: 0, hasMore: false };

      return client.queryMessages(channelId, {
        limit: pageSize,
        before: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      return lastPage.messages[0].id; // Get messages before this ID
    },
    enabled: isConnected && !!channelId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * useSendMessageMutation - Send a message with optimistic updates
 *
 * @example
 * ```tsx
 * const sendMessage = useSendMessageMutation(channelId);
 *
 * await sendMessage.mutateAsync({
 *   text: 'Hello!',
 * });
 * ```
 */
interface SendMessageContext {
  previousMessages: MessagesResponse | undefined;
  optimisticMessage: MessageWithSeq;
}

export function useSendMessageMutation(
  channelId: string,
  options?: Omit<UseMutationOptions<MessageWithSeq, Error, SendMessageInput, SendMessageContext>, 'mutationFn'>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation<MessageWithSeq, Error, SendMessageInput, SendMessageContext>({
    mutationFn: async (input: SendMessageInput): Promise<MessageWithSeq> => {
      return client.sendMessage(channelId, input as Parameters<typeof client.sendMessage>[1]);
    },
    // Optimistic update
    onMutate: async (newMessage: SendMessageInput): Promise<SendMessageContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: messageKeys.channel(channelId) });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<MessagesResponse>(
        messageKeys.list(channelId, { limit: 50 })
      );

      // Create optimistic message (compatible with both API formats)
      const optimisticId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        channelId,
        cid: channelId,
        type: 'regular' as const,
        text: newMessage.text || '',
        attachments: newMessage.attachments || [],
        status: 'sending' as const,
        seq: (previousMessages?.maxSeq || 0) + 1,
        clientMsgId: newMessage.clientMsgId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        reactionCount: 0,
        replyCount: 0,
        pinned: false,
      } as MessageWithSeq;

      queryClient.setQueryData<MessagesResponse>(
        messageKeys.list(channelId, { limit: 50 }),
        (old) => {
          if (!old) return { messages: [optimisticMessage], maxSeq: 1, hasMore: false };
          return {
            ...old,
            messages: [...old.messages, optimisticMessage],
          };
        }
      );

      return { previousMessages, optimisticMessage };
    },
    onError: (_err, _newMessage, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageKeys.list(channelId, { limit: 50 }),
          context.previousMessages
        );
      }
    },
    onSuccess: (sentMessage, _, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<MessagesResponse>(
        messageKeys.list(channelId, { limit: 50 }),
        (old) => {
          if (!old) return { messages: [sentMessage], maxSeq: sentMessage.seq, hasMore: false };
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === context?.optimisticMessage?.id ? sentMessage : m
            ),
            maxSeq: Math.max(old.maxSeq, sentMessage.seq),
          };
        }
      );
    },
    ...options,
  });
}

/**
 * useUpdateMessageMutation - Update a message
 */
export function useUpdateMessageMutation(
  channelId: string,
  options?: UseMutationOptions<MessageWithSeq, Error, { messageId: string; data: UpdateMessageInput }>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, data }): Promise<MessageWithSeq> => {
      return client.updateMessage(channelId, messageId, data);
    },
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData<MessagesResponse>(
        messageKeys.list(channelId, { limit: 50 }),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === updatedMessage.id ? updatedMessage : m
            ),
          };
        }
      );
    },
    ...options,
  });
}

/**
 * useDeleteMessageMutation - Delete a message
 */
export function useDeleteMessageMutation(
  channelId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string): Promise<void> => {
      await client.deleteMessage(channelId, messageId);
    },
    onSuccess: (_, messageId) => {
      queryClient.setQueryData<MessagesResponse>(
        messageKeys.list(channelId, { limit: 50 }),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.filter((m) => m.id !== messageId),
          };
        }
      );
    },
    ...options,
  });
}

/**
 * useReactionMutation - Add/remove reactions
 */
export function useReactionMutation(
  channelId: string,
  options?: UseMutationOptions<void, Error, { messageId: string; emoji: string; action: 'add' | 'remove' }>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji, action }): Promise<void> => {
      if (action === 'add') {
        await client.addReaction(channelId, messageId, emoji);
      } else {
        await client.removeReaction(channelId, messageId, emoji);
      }
    },
    onSuccess: () => {
      // Invalidate to refetch with updated reactions
      queryClient.invalidateQueries({ queryKey: messageKeys.channel(channelId) });
    },
    ...options,
  });
}
