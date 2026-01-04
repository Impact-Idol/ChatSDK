'use client';

/**
 * @chatsdk/react-query
 *
 * Native React Query (TanStack Query) hooks for ChatSDK.
 *
 * This package provides React Query hooks that wrap ChatSDK functionality,
 * giving you access to:
 * - React Query DevTools integration
 * - Automatic caching and deduplication
 * - Optimistic updates
 * - Background refetching
 * - Infinite queries for pagination
 *
 * @example Basic usage
 * ```tsx
 * import { ChatProvider } from '@chatsdk/react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { useChannelsQuery, useSendMessageMutation } from '@chatsdk/react-query';
 *
 * const queryClient = new QueryClient();
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <ChatProvider apiKey="..." userId="...">
 *         <Chat />
 *       </ChatProvider>
 *     </QueryClientProvider>
 *   );
 * }
 *
 * function Chat() {
 *   const { data: channels, isLoading } = useChannelsQuery();
 *   const sendMessage = useSendMessageMutation(channelId);
 *
 *   const handleSend = async (text: string) => {
 *     await sendMessage.mutateAsync({ text });
 *   };
 *
 *   // ...
 * }
 * ```
 */

// Export all hooks
export * from './hooks';

// Re-export useful types from React Query
export type {
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
  QueryClient,
} from '@tanstack/react-query';
