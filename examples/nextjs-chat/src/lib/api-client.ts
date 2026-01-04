/**
 * API Client for Next.js
 *
 * A simplified API client that works with Next.js environment variables.
 * This demonstrates how to integrate with ChatSDK APIs in Next.js.
 */

import { getChatConfig } from './chat-config';

// Types
export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  status?: 'online' | 'offline' | 'away';
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: string;
  updatedAt: string;
  user?: User;
  reactions?: Reaction[];
  threadId?: string;
  replyCount?: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

// API functions
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getChatConfig();

  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// Workspace API
export async function getWorkspaces(): Promise<Workspace[]> {
  const data = await apiFetch<{ workspaces: Workspace[] }>('/api/workspaces');
  return data.workspaces;
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const data = await apiFetch<{ workspace: Workspace }>(
    `/api/workspaces/${workspaceId}`
  );
  return data.workspace;
}

// Channel API
export async function getChannels(workspaceId: string): Promise<Channel[]> {
  const data = await apiFetch<{ channels: Channel[] }>(
    `/api/workspaces/${workspaceId}/channels`
  );
  return data.channels;
}

export async function getChannel(channelId: string): Promise<Channel> {
  const data = await apiFetch<{ channel: Channel }>(
    `/api/channels/${channelId}`
  );
  return data.channel;
}

// Message API
export async function getMessages(
  channelId: string,
  options: { limit?: number; before?: string } = {}
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);

  const query = params.toString();
  const endpoint = `/api/channels/${channelId}/messages${query ? `?${query}` : ''}`;

  return apiFetch<{ messages: Message[]; hasMore: boolean }>(endpoint);
}

export async function sendMessage(
  channelId: string,
  content: string,
  userId: string
): Promise<Message> {
  const data = await apiFetch<{ message: Message }>(
    `/api/channels/${channelId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content, userId }),
    }
  );
  return data.message;
}

// Auth API
export async function getWsToken(userId: string): Promise<string> {
  const config = getChatConfig();

  const response = await fetch(`${config.apiUrl}/api/auth/ws-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({ userId, appId: config.appId }),
  });

  if (!response.ok) {
    throw new Error('Failed to get WebSocket token');
  }

  const data = await response.json();
  return data.token;
}
