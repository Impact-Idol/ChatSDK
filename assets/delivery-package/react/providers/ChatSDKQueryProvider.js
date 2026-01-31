'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * ChatSDKQueryProvider - Pre-configured React Query provider for ChatSDK
 *
 * Provides sensible defaults for chat applications:
 * - retry: false for auth-dependent queries (don't retry 401/403 errors)
 * - Reasonable stale times for real-time data
 * - Garbage collection settings optimized for chat
 */
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
/**
 * Smart retry function that doesn't retry auth/client errors
 */
function shouldRetry(failureCount, error) {
    // Don't retry at all by default for chat apps (real-time updates handle this)
    // But if we do retry, never retry 4xx errors
    if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status;
        // Never retry client errors (400-499)
        if (status >= 400 && status < 500) {
            return false;
        }
    }
    // For network errors, retry up to 2 times
    return failureCount < 2;
}
/**
 * ChatSDKQueryProvider - Wrap your app with this for optimized React Query settings
 *
 * @example
 * ```tsx
 * import { ChatSDKQueryProvider } from '@chatsdk/react';
 *
 * function App() {
 *   return (
 *     <ChatSDKQueryProvider>
 *       <ChatProvider apiKey="...">
 *         <YourApp />
 *       </ChatProvider>
 *     </ChatSDKQueryProvider>
 *   );
 * }
 * ```
 *
 * @example With custom config
 * ```tsx
 * <ChatSDKQueryProvider config={{ staleTime: 60000, retry: 1 }}>
 *   <App />
 * </ChatSDKQueryProvider>
 * ```
 */
export function ChatSDKQueryProvider({ children, config = {}, }) {
    const { staleTime = 30000, // 30 seconds - real-time updates keep data fresh
    gcTime = 300000, // 5 minutes
    retry = false, // Don't retry by default - prevents console spam on auth errors
    refetchOnWindowFocus = false, // Real-time updates handle this
    refetchOnReconnect = true, } = config;
    // Create QueryClient inside useState to avoid sharing between requests (SSR-safe)
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime,
                gcTime,
                retry: retry === false ? false : retry === true ? shouldRetry : retry,
                refetchOnWindowFocus,
                refetchOnReconnect,
                // Don't throw errors - let components handle them
                throwOnError: false,
            },
            mutations: {
                // Never retry mutations
                retry: false,
                // Don't throw errors - let components handle them
                throwOnError: false,
            },
        },
    }));
    return (_jsx(QueryClientProvider, { client: queryClient, children: children }));
}
/**
 * Create a QueryClient with ChatSDK-optimized defaults
 * Use this if you need direct access to the QueryClient
 *
 * @example
 * ```tsx
 * const queryClient = createChatSDKQueryClient();
 *
 * // Use with your own QueryClientProvider
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 * ```
 */
export function createChatSDKQueryClient(config) {
    const { staleTime = 30000, gcTime = 300000, retry = false, refetchOnWindowFocus = false, refetchOnReconnect = true, } = config || {};
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime,
                gcTime,
                retry: retry === false ? false : retry === true ? shouldRetry : retry,
                refetchOnWindowFocus,
                refetchOnReconnect,
                throwOnError: false,
            },
            mutations: {
                retry: false,
                throwOnError: false,
            },
        },
    });
}
