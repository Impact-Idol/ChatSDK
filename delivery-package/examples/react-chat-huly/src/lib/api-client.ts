/**
 * ChatSDK API Client
 * Type-safe wrapper around the ChatSDK REST API
 */

import { getStoredTokens } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5501';
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * API Error Response
 */
export interface APIError {
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Base API request handler with auth
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...options.headers as Record<string, string>,
  };

  // Add auth token if available
  if (tokens?.token) {
    headers['Authorization'] = `Bearer ${tokens.token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: APIError = await response.json().catch(() => ({
      error: { message: response.statusText },
    }));
    throw new Error(error.error.message);
  }

  return response.json();
}

// ============================================================================
// WORKSPACE API
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  icon?: string;
  description?: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  inviterId: string;
  token: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  expiresAt: string;
}

export const workspaceApi = {
  list: () => apiRequest<{ workspaces: Workspace[] }>('/api/workspaces'),

  get: (id: string) => apiRequest<Workspace>(`/api/workspaces/${id}`),

  create: (data: CreateWorkspaceRequest) =>
    apiRequest<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateWorkspaceRequest>) =>
    apiRequest<Workspace>(`/api/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/workspaces/${id}`, {
      method: 'DELETE',
    }),

  invite: (workspaceId: string, email: string) =>
    apiRequest<WorkspaceInvite>(`/api/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  acceptInvite: (workspaceId: string, token: string) =>
    apiRequest<{ success: boolean; member: WorkspaceMember }>(
      `/api/workspaces/${workspaceId}/invite/${token}`,
      { method: 'POST' }
    ),
};

// ============================================================================
// CHANNEL API
// ============================================================================

export interface Channel {
  id: string;
  appId: string;
  workspaceId?: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'group' | 'messaging';
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  starred?: boolean;
  muted?: boolean;
  unreadCount?: number;
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  type: 'public' | 'private' | 'group' | 'messaging';
  workspaceId?: string;
  memberIds?: string[];
}

export const channelApi = {
  list: (params?: { workspaceId?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.append('workspaceId', params.workspaceId);
    if (params?.type) query.append('type', params.type);
    const queryString = query.toString();
    return apiRequest<{ channels: Channel[] }>(
      `/api/channels${queryString ? `?${queryString}` : ''}`
    );
  },

  get: (id: string) => apiRequest<Channel>(`/api/channels/${id}`),

  create: (data: CreateChannelRequest) =>
    apiRequest<Channel>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateChannelRequest>) =>
    apiRequest<Channel>(`/api/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/channels/${id}`, {
      method: 'DELETE',
    }),

  star: (id: string, starred: boolean) =>
    apiRequest<{ success: boolean; starred: boolean }>(
      `/api/channels/${id}/star`,
      {
        method: 'PATCH',
        body: JSON.stringify({ starred }),
      }
    ),

  mute: (id: string, muted: boolean) =>
    apiRequest<{ success: boolean; muted: boolean }>(
      `/api/channels/${id}/mute`,
      {
        method: 'PATCH',
        body: JSON.stringify({ muted }),
      }
    ),

  addMembers: (id: string, userIds: string[]) =>
    apiRequest<{ success: boolean }>(`/api/channels/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),

  removeMember: (id: string, userId: string) =>
    apiRequest<{ success: boolean }>(`/api/channels/${id}/members/${userId}`, {
      method: 'DELETE',
    }),

  getMembers: (id: string) =>
    apiRequest<{ members: Array<{ id: string; role: string; joinedAt: string }> }>(
      `/api/channels/${id}/members`
    ),
};

// ============================================================================
// MESSAGE API
// ============================================================================

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  parentId?: string;
  threadCount?: number;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string }>;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  mentions?: string[];
}

export interface SendMessageRequest {
  channelId: string;
  text: string;
  parentId?: string;
  mentions?: string[];
}

export const messageApi = {
  list: (channelId: string, params?: { limit?: number; before?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.before) query.append('before', params.before);
    const queryString = query.toString();
    return apiRequest<{ messages: Message[] }>(
      `/api/channels/${channelId}/messages${queryString ? `?${queryString}` : ''}`
    );
  },

  send: (data: SendMessageRequest) =>
    apiRequest<Message>(`/api/channels/${data.channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, text: string) =>
    apiRequest<Message>(`/api/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/messages/${id}`, {
      method: 'DELETE',
    }),

  pin: (messageId: string, pinned: boolean, channelId: string) =>
    apiRequest<{ success: boolean }>(
      `/api/channels/${channelId}/messages/${messageId}/pin`,
      {
        method: pinned ? 'POST' : 'DELETE',
      }
    ),

  addReaction: (id: string, emoji: string) =>
    apiRequest<{ success: boolean }>(`/api/messages/${id}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  removeReaction: (id: string, emoji: string) =>
    apiRequest<{ success: boolean }>(`/api/messages/${id}/reactions/${emoji}`, {
      method: 'DELETE',
    }),

  getThreadReplies: (id: string) =>
    apiRequest<{ messages: Message[] }>(`/api/messages/${id}/replies`),
};

// ============================================================================
// SEARCH API
// ============================================================================

export interface SearchParams {
  query: string;
  channelId?: string;
  userId?: string;
  before?: string;
  after?: string;
  limit?: number;
}

export const searchApi = {
  messages: (params: SearchParams) => {
    const query = new URLSearchParams();
    query.append('query', params.query);
    if (params.channelId) query.append('channelId', params.channelId);
    if (params.userId) query.append('userId', params.userId);
    if (params.before) query.append('before', params.before);
    if (params.after) query.append('after', params.after);
    if (params.limit) query.append('limit', params.limit.toString());

    return apiRequest<{ messages: Message[] }>(`/api/search?${query.toString()}`);
  },
};

// ============================================================================
// FILE UPLOAD API
// ============================================================================

export interface UploadResponse {
  url: string;
  key: string;
}

export const fileApi = {
  getUploadUrl: (fileName: string, fileType: string) =>
    apiRequest<{ uploadUrl: string; fileUrl: string; key: string }>(
      '/api/upload/presigned-url',
      {
        method: 'POST',
        body: JSON.stringify({ fileName, fileType }),
      }
    ),

  uploadFile: async (file: File): Promise<UploadResponse> => {
    // Step 1: Get presigned URL
    const { uploadUrl, fileUrl, key } = await fileApi.getUploadUrl(
      file.name,
      file.type
    );

    // Step 2: Upload to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return { url: fileUrl, key };
  },
};

// ============================================================================
// USER API
// ============================================================================

export interface User {
  id: string;
  name: string;
  email?: string;
  image?: string;
  custom?: Record<string, any>;
  lastActiveAt?: string;
  online?: boolean;
}

export const userApi = {
  list: () => apiRequest<{ users: User[] }>('/api/users'),

  get: (id: string) => apiRequest<User>(`/api/users/${id}`),
};

// Export a combined API object
export const api = {
  workspaces: workspaceApi,
  channels: channelApi,
  messages: messageApi,
  search: searchApi,
  files: fileApi,
  users: userApi,
};
