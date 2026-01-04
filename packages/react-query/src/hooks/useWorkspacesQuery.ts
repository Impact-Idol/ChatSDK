'use client';

/**
 * useWorkspacesQuery - React Query hook for workspaces
 *
 * Provides native React Query integration with:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Devtools support
 * - Optimistic updates via mutations
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { useChatClient, useChatContext } from '@chatsdk/react';

export interface Workspace {
  id: string;
  name: string;
  type: string;
  image?: string;
  memberCount: number;
  channelCount: number;
  role: string;
  isDefault: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  type: string;
  image?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  type?: string;
  image?: string;
}

// Query keys factory for consistent key management
export const workspaceKeys = {
  all: ['chatsdk', 'workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...workspaceKeys.lists(), filters] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
};

/**
 * useWorkspacesQuery - Query workspaces with React Query
 *
 * @example
 * ```tsx
 * const { data: workspaces, isLoading, error } = useWorkspacesQuery();
 *
 * // With options
 * const { data } = useWorkspacesQuery({
 *   staleTime: 60000,
 *   refetchOnWindowFocus: true,
 * });
 * ```
 */
export function useWorkspacesQuery(
  options?: Omit<UseQueryOptions<Workspace[], Error>, 'queryKey' | 'queryFn'>
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();

  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: async (): Promise<Workspace[]> => {
      const response = await client.fetch<{ workspaces: any[] }>('/api/workspaces');

      return (response.workspaces || []).map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        type: ws.type,
        image: ws.image_url,
        memberCount: ws.member_count || 0,
        channelCount: ws.channel_count || 0,
        role: ws.role || 'member',
        isDefault: ws.is_default || false,
        expiresAt: ws.expires_at,
        createdAt: ws.created_at,
      }));
    },
    enabled: isConnected && (options?.enabled ?? true),
    staleTime: 30000, // 30 seconds
    ...options,
  });
}

/**
 * useWorkspaceQuery - Query a single workspace
 */
export function useWorkspaceQuery(
  workspaceId: string | null,
  options?: Omit<UseQueryOptions<Workspace | null, Error>, 'queryKey' | 'queryFn'>
) {
  const client = useChatClient();
  const { isConnected } = useChatContext();

  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId || ''),
    queryFn: async (): Promise<Workspace | null> => {
      if (!workspaceId) return null;

      const response = await client.fetch<any>(`/api/workspaces/${workspaceId}`);

      return {
        id: response.id,
        name: response.name,
        type: response.type,
        image: response.image_url,
        memberCount: response.member_count || 0,
        channelCount: response.channel_count || 0,
        role: response.role || 'member',
        isDefault: response.is_default || false,
        expiresAt: response.expires_at,
        createdAt: response.created_at,
      };
    },
    enabled: isConnected && !!workspaceId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * useCreateWorkspaceMutation - Create a new workspace
 *
 * @example
 * ```tsx
 * const createWorkspace = useCreateWorkspaceMutation();
 *
 * await createWorkspace.mutateAsync({
 *   name: 'My Workspace',
 *   type: 'team',
 * });
 * ```
 */
export function useCreateWorkspaceMutation(
  options?: UseMutationOptions<Workspace, Error, CreateWorkspaceInput>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput): Promise<Workspace> => {
      const response = await client.fetch<any>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          type: input.type,
          image_url: input.image,
        }),
      });

      return {
        id: response.id,
        name: response.name,
        type: response.type,
        image: response.image_url,
        memberCount: 1,
        channelCount: 0,
        role: 'admin',
        isDefault: false,
        createdAt: response.created_at,
      };
    },
    onSuccess: (newWorkspace) => {
      // Add to cache
      queryClient.setQueryData<Workspace[]>(workspaceKeys.lists(), (old) =>
        old ? [...old, newWorkspace] : [newWorkspace]
      );
    },
    ...options,
  });
}

/**
 * useUpdateWorkspaceMutation - Update a workspace
 */
export function useUpdateWorkspaceMutation(
  options?: UseMutationOptions<Workspace, Error, { id: string; data: UpdateWorkspaceInput }>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }): Promise<Workspace> => {
      const response = await client.fetch<any>(`/api/workspaces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          image_url: data.image,
        }),
      });

      return {
        id: response.id,
        name: response.name,
        type: response.type,
        image: response.image_url,
        memberCount: response.member_count || 0,
        channelCount: response.channel_count || 0,
        role: response.role || 'member',
        isDefault: response.is_default || false,
        expiresAt: response.expires_at,
        createdAt: response.created_at,
      };
    },
    onSuccess: (updatedWorkspace) => {
      // Update in list cache
      queryClient.setQueryData<Workspace[]>(workspaceKeys.lists(), (old) =>
        old?.map((ws) => (ws.id === updatedWorkspace.id ? updatedWorkspace : ws))
      );
      // Update detail cache
      queryClient.setQueryData(workspaceKeys.detail(updatedWorkspace.id), updatedWorkspace);
    },
    ...options,
  });
}

/**
 * useDeleteWorkspaceMutation - Delete a workspace
 */
export function useDeleteWorkspaceMutation(
  options?: UseMutationOptions<void, Error, string>
) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string): Promise<void> => {
      await client.fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, workspaceId) => {
      // Remove from list cache
      queryClient.setQueryData<Workspace[]>(workspaceKeys.lists(), (old) =>
        old?.filter((ws) => ws.id !== workspaceId)
      );
      // Invalidate detail cache
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
    ...options,
  });
}
