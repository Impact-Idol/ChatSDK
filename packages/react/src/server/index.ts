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

export interface ServerFetchOptions {
  /**
   * API key for authentication
   */
  apiKey: string;
  /**
   * API base URL (defaults to http://localhost:5500)
   */
  apiUrl?: string;
  /**
   * User token for authenticated requests
   */
  userToken?: string;
  /**
   * Custom fetch options (headers, cache, etc.)
   */
  fetchOptions?: RequestInit;
}

interface ServerFetchConfig extends ServerFetchOptions {
  path: string;
}

/**
 * Internal helper for server-side API calls
 */
async function serverFetch<T>(config: ServerFetchConfig): Promise<T> {
  const { apiKey, apiUrl = 'http://localhost:5500', userToken, path, fetchOptions } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    ...((fetchOptions?.headers as Record<string, string>) || {}),
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

// ============================================================================
// Workspace Utilities
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  type: string;
  imageUrl?: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
export async function getWorkspacesServer(
  options: ServerFetchOptions
): Promise<Workspace[]> {
  return serverFetch<Workspace[]>({
    ...options,
    path: '/api/workspaces',
  });
}

/**
 * Fetch a single workspace by ID
 */
export async function getWorkspaceServer(
  workspaceId: string,
  options: ServerFetchOptions
): Promise<Workspace> {
  return serverFetch<Workspace>({
    ...options,
    path: `/api/workspaces/${workspaceId}`,
  });
}

// ============================================================================
// Channel Utilities
// ============================================================================

export interface Channel {
  id: string;
  workspaceId: string;
  type: string;
  name?: string | null;
  imageUrl?: string | null;
  memberCount: number;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelQueryOptions {
  /**
   * Filter by workspace ID
   */
  workspaceId?: string;
  /**
   * Maximum number of channels to return
   */
  limit?: number;
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
export async function getChannelsServer(
  options: ServerFetchOptions,
  query?: ChannelQueryOptions
): Promise<Channel[]> {
  const params = new URLSearchParams();
  if (query?.workspaceId) params.set('workspace_id', query.workspaceId);
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  return serverFetch<Channel[]>({
    ...options,
    path: `/api/channels${queryString ? `?${queryString}` : ''}`,
  });
}

/**
 * Fetch a single channel by ID
 */
export async function getChannelServer(
  channelId: string,
  options: ServerFetchOptions
): Promise<Channel> {
  return serverFetch<Channel>({
    ...options,
    path: `/api/channels/${channelId}`,
  });
}

// ============================================================================
// Message Utilities
// ============================================================================

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  seq: number;
  text?: string | null;
  attachments?: Array<{
    type: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }> | null;
  status: 'sending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
}

export interface MessagesResponse {
  messages: Message[];
  maxSeq: number;
  hasMore: boolean;
}

export interface MessageQueryOptions {
  /**
   * Maximum number of messages to return
   */
  limit?: number;
  /**
   * Fetch messages before this message ID
   */
  before?: string;
  /**
   * Fetch messages after this message ID
   */
  after?: string;
  /**
   * Fetch messages since this sequence number
   */
  sinceSeq?: number;
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
export async function getMessagesServer(
  channelId: string,
  options: ServerFetchOptions,
  query?: MessageQueryOptions
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.before) params.set('before', query.before);
  if (query?.after) params.set('after', query.after);
  if (query?.sinceSeq) params.set('since_seq', String(query.sinceSeq));

  const queryString = params.toString();
  return serverFetch<MessagesResponse>({
    ...options,
    path: `/api/channels/${channelId}/messages${queryString ? `?${queryString}` : ''}`,
  });
}

// ============================================================================
// User Utilities
// ============================================================================

export interface User {
  id: string;
  name: string;
  imageUrl?: string | null;
  online?: boolean;
  lastActive?: string | null;
  custom?: Record<string, unknown>;
}

/**
 * Fetch the current user's profile
 */
export async function getCurrentUserServer(
  options: ServerFetchOptions
): Promise<User> {
  return serverFetch<User>({
    ...options,
    path: '/api/users/me',
  });
}

/**
 * Fetch a user by ID
 */
export async function getUserServer(
  userId: string,
  options: ServerFetchOptions
): Promise<User> {
  return serverFetch<User>({
    ...options,
    path: `/api/users/${userId}`,
  });
}

// ============================================================================
// Member Utilities
// ============================================================================

export interface Member {
  userId: string;
  channelId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: string;
  user?: User;
}

/**
 * Fetch members of a channel
 */
export async function getChannelMembersServer(
  channelId: string,
  options: ServerFetchOptions,
  query?: { limit?: number }
): Promise<Member[]> {
  const params = new URLSearchParams();
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  return serverFetch<Member[]>({
    ...options,
    path: `/api/channels/${channelId}/members${queryString ? `?${queryString}` : ''}`,
  });
}

// ============================================================================
// Prefetch Helpers (for hydration)
// ============================================================================

export interface PrefetchResult<T> {
  data: T;
  fetchedAt: number;
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
export async function prefetchMessages(
  channelId: string,
  options: ServerFetchOptions,
  query?: MessageQueryOptions
): Promise<PrefetchResult<MessagesResponse>> {
  const data = await getMessagesServer(channelId, options, query);
  return {
    data,
    fetchedAt: Date.now(),
  };
}

export async function prefetchChannels(
  options: ServerFetchOptions,
  query?: ChannelQueryOptions
): Promise<PrefetchResult<Channel[]>> {
  const data = await getChannelsServer(options, query);
  return {
    data,
    fetchedAt: Date.now(),
  };
}

export async function prefetchWorkspaces(
  options: ServerFetchOptions
): Promise<PrefetchResult<Workspace[]>> {
  const data = await getWorkspacesServer(options);
  return {
    data,
    fetchedAt: Date.now(),
  };
}
