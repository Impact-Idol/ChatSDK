/**
 * Server-side data fetching utilities for React Server Components
 *
 * These utilities enable direct data fetching in RSC without client-side JavaScript.
 * Use these in your page.tsx or layout.tsx files with the 'server' directive.
 *
 * @example
 * ```tsx
 * // app/chat/page.tsx
 * import { getWorkspacesServer, getChannelsServer } from '@chatsdk/react/server';
 *
 * export default async function ChatPage() {
 *   const workspaces = await getWorkspacesServer({
 *     apiKey: process.env.CHATSDK_API_KEY!,
 *     apiUrl: process.env.CHATSDK_API_URL,
 *   });
 *
 *   return <WorkspaceList workspaces={workspaces} />;
 * }
 * ```
 */
/**
 * Internal helper for server-side API calls
 */
async function serverFetch(config) {
    const { apiKey, apiUrl = 'http://localhost:5500', userToken, path, fetchOptions } = config;
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        ...(fetchOptions?.headers || {}),
    };
    if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
    }
    const response = await fetch(`${apiUrl}${path}`, {
        ...fetchOptions,
        headers,
        // Default to no caching for real-time data
        cache: fetchOptions?.cache || 'no-store',
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`ChatSDK API Error (${response.status}): ${errorText}`);
    }
    return response.json();
}
/**
 * Fetch all workspaces for the authenticated user
 *
 * @example
 * ```tsx
 * const workspaces = await getWorkspacesServer({
 *   apiKey: process.env.CHATSDK_API_KEY!,
 *   userToken: session.user.chatToken,
 * });
 * ```
 */
export async function getWorkspacesServer(options) {
    return serverFetch({
        ...options,
        path: '/api/workspaces',
    });
}
/**
 * Fetch a single workspace by ID
 */
export async function getWorkspaceServer(workspaceId, options) {
    return serverFetch({
        ...options,
        path: `/api/workspaces/${workspaceId}`,
    });
}
/**
 * Fetch channels with optional filters
 *
 * @example
 * ```tsx
 * const channels = await getChannelsServer({
 *   apiKey: process.env.CHATSDK_API_KEY!,
 *   userToken: session.user.chatToken,
 * }, { workspaceId: 'workspace-id', limit: 20 });
 * ```
 */
export async function getChannelsServer(options, query) {
    const params = new URLSearchParams();
    if (query?.workspaceId)
        params.set('workspace_id', query.workspaceId);
    if (query?.limit)
        params.set('limit', String(query.limit));
    const queryString = params.toString();
    return serverFetch({
        ...options,
        path: `/api/channels${queryString ? `?${queryString}` : ''}`,
    });
}
/**
 * Fetch a single channel by ID
 */
export async function getChannelServer(channelId, options) {
    return serverFetch({
        ...options,
        path: `/api/channels/${channelId}`,
    });
}
/**
 * Fetch messages for a channel (for SSR initial data)
 *
 * @example
 * ```tsx
 * const { messages, hasMore } = await getMessagesServer(
 *   channelId,
 *   {
 *     apiKey: process.env.CHATSDK_API_KEY!,
 *     userToken: session.user.chatToken,
 *   },
 *   { limit: 50 }
 * );
 * ```
 */
export async function getMessagesServer(channelId, options, query) {
    const params = new URLSearchParams();
    if (query?.limit)
        params.set('limit', String(query.limit));
    if (query?.before)
        params.set('before', query.before);
    if (query?.after)
        params.set('after', query.after);
    if (query?.sinceSeq)
        params.set('since_seq', String(query.sinceSeq));
    const queryString = params.toString();
    return serverFetch({
        ...options,
        path: `/api/channels/${channelId}/messages${queryString ? `?${queryString}` : ''}`,
    });
}
/**
 * Fetch the current user's profile
 */
export async function getCurrentUserServer(options) {
    return serverFetch({
        ...options,
        path: '/api/users/me',
    });
}
/**
 * Fetch a user by ID
 */
export async function getUserServer(userId, options) {
    return serverFetch({
        ...options,
        path: `/api/users/${userId}`,
    });
}
/**
 * Fetch members of a channel
 */
export async function getChannelMembersServer(channelId, options, query) {
    const params = new URLSearchParams();
    if (query?.limit)
        params.set('limit', String(query.limit));
    const queryString = params.toString();
    return serverFetch({
        ...options,
        path: `/api/channels/${channelId}/members${queryString ? `?${queryString}` : ''}`,
    });
}
/**
 * Prefetch data with timestamp for hydration
 *
 * Use this to fetch data on the server and pass it to client components
 * for hydration with React Query.
 *
 * @example
 * ```tsx
 * // app/chat/[channelId]/page.tsx
 * export default async function ChannelPage({ params }) {
 *   const messagesData = await prefetchMessages(params.channelId, {
 *     apiKey: process.env.CHATSDK_API_KEY!,
 *     userToken: await getToken(),
 *   });
 *
 *   return (
 *     <HydrationBoundary state={{ messages: messagesData }}>
 *       <ChannelView channelId={params.channelId} />
 *     </HydrationBoundary>
 *   );
 * }
 * ```
 */
export async function prefetchMessages(channelId, options, query) {
    const data = await getMessagesServer(channelId, options, query);
    return {
        data,
        fetchedAt: Date.now(),
    };
}
export async function prefetchChannels(options, query) {
    const data = await getChannelsServer(options, query);
    return {
        data,
        fetchedAt: Date.now(),
    };
}
export async function prefetchWorkspaces(options) {
    const data = await getWorkspacesServer(options);
    return {
        data,
        fetchedAt: Date.now(),
    };
}
