/**
 * Workspace Hooks
 * React Query hooks for workspace operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Workspace, type CreateWorkspaceRequest } from '../lib/api-client';

/**
 * Fetch all workspaces
 */
export function useWorkspaces(enabled: boolean = true) {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.workspaces.list(),
    enabled,
  });
}

/**
 * Fetch single workspace
 */
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => api.workspaces.get(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) => api.workspaces.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

/**
 * Update a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkspaceRequest> }) =>
      api.workspaces.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

/**
 * Delete a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => api.workspaces.delete(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

/**
 * Invite member to workspace
 */
export function useInviteWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, email }: { workspaceId: string; email: string }) =>
      api.workspaces.invite(workspaceId, email),
    onSuccess: (_, variables) => {
      // Optionally refetch workspace to get updated member count
      queryClient.invalidateQueries({ queryKey: ['workspaces', variables.workspaceId] });
    },
  });
}

/**
 * Accept workspace invite
 */
export function useAcceptWorkspaceInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, token }: { workspaceId: string; token: string }) =>
      api.workspaces.acceptInvite(workspaceId, token),
    onSuccess: () => {
      // Refetch workspaces list to show the newly joined workspace
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
