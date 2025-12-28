/**
 * useWorkspaces - Hook for querying and managing workspaces
 */

import { useState, useEffect, useCallback } from 'react';
import { useChatClient } from './ChatProvider';

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

export interface UseWorkspacesResult {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createWorkspace: (data: CreateWorkspaceData) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<CreateWorkspaceData>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export interface CreateWorkspaceData {
  name: string;
  type: string;
  image?: string;
}

/**
 * useWorkspaces - Query and manage workspaces
 *
 * @example
 * ```tsx
 * const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspaces();
 *
 * return (
 *   <WorkspaceSwitcher
 *     workspaces={workspaces}
 *     activeWorkspace={activeWorkspace}
 *     onSwitch={setActiveWorkspace}
 *   />
 * );
 * ```
 */
export function useWorkspaces(): UseWorkspacesResult {
  const client = useChatClient();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch workspaces from API
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.fetch('/api/workspaces') as any;

      // Transform API response to hook interface
      const transformedWorkspaces: Workspace[] = (response.workspaces || []).map((ws: any) => ({
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

      setWorkspaces(transformedWorkspaces);

      // Set active workspace
      if (!activeWorkspace) {
        // Set default workspace or first workspace as active
        const defaultWorkspace = transformedWorkspaces.find((w) => w.isDefault);
        setActiveWorkspaceState(defaultWorkspace || transformedWorkspaces[0] || null);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client, activeWorkspace]);

  // Create a new workspace
  const createWorkspace = useCallback(
    async (data: CreateWorkspaceData): Promise<Workspace> => {
      try {
        const response = await client.fetch('/api/workspaces', {
          method: 'POST',
          body: JSON.stringify({
            name: data.name,
            type: data.type,
            image_url: data.image,
          }),
        }) as any;

        const newWorkspace: Workspace = {
          id: response.id,
          name: response.name,
          type: response.type,
          image: response.image_url,
          memberCount: 1, // Creator is the first member
          channelCount: 0,
          role: 'admin', // Creator is admin
          isDefault: false,
          createdAt: response.created_at,
        };

        setWorkspaces((prev) => [...prev, newWorkspace]);

        return newWorkspace;
      } catch (err) {
        console.error('Failed to create workspace:', err);
        throw err;
      }
    },
    [client]
  );

  // Update a workspace
  const updateWorkspace = useCallback(
    async (id: string, data: Partial<CreateWorkspaceData>): Promise<Workspace> => {
      try {
        const response = await client.fetch(`/api/workspaces/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: data.name,
            type: data.type,
            image_url: data.image,
          }),
        }) as any;

        const updatedWorkspace: Workspace = {
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

        setWorkspaces((prev) =>
          prev.map((ws) => (ws.id === id ? updatedWorkspace : ws))
        );

        // Update active workspace if it was the one updated
        if (activeWorkspace?.id === id) {
          setActiveWorkspaceState(updatedWorkspace);
        }

        return updatedWorkspace;
      } catch (err) {
        console.error('Failed to update workspace:', err);
        throw err;
      }
    },
    [client, activeWorkspace]
  );

  // Delete a workspace
  const deleteWorkspace = useCallback(
    async (id: string): Promise<void> => {
      try {
        await client.fetch(`/api/workspaces/${id}`, {
          method: 'DELETE',
        });

        setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));

        // If deleted workspace was active, switch to another
        if (activeWorkspace?.id === id) {
          const remaining = workspaces.filter((ws) => ws.id !== id);
          setActiveWorkspaceState(remaining[0] || null);
        }
      } catch (err) {
        console.error('Failed to delete workspace:', err);
        throw err;
      }
    },
    [client, activeWorkspace, workspaces]
  );

  // Set active workspace with localStorage persistence
  const setActiveWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    // Persist to localStorage (only in browser)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('chatsdk:activeWorkspaceId', workspace.id);
      } catch (err) {
        console.warn('Failed to persist active workspace:', err);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWorkspaces();

    // Try to restore active workspace from localStorage (only in browser)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedWorkspaceId = window.localStorage.getItem('chatsdk:activeWorkspaceId');
        if (savedWorkspaceId && workspaces.length > 0) {
          const savedWorkspace = workspaces.find((w) => w.id === savedWorkspaceId);
          if (savedWorkspace) {
            setActiveWorkspaceState(savedWorkspace);
          }
        }
      } catch (err) {
        console.warn('Failed to restore active workspace:', err);
      }
    }
  }, [fetchWorkspaces, workspaces]);

  return {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    loading,
    error,
    refresh: fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}
