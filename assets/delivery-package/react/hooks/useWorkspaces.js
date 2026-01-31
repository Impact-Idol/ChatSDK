/**
 * useWorkspaces - Hook for querying and managing workspaces
 *
 * Connection-aware: Only fetches when the client is connected.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatClient, useChatContext } from './ChatProvider';
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
export function useWorkspaces() {
    const client = useChatClient();
    const { isConnected } = useChatContext();
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspace, setActiveWorkspaceState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const hasFetchedRef = useRef(false);
    // Fetch workspaces from API
    const fetchWorkspaces = useCallback(async () => {
        setLoading(true);
        try {
            const response = await client.fetch('/api/workspaces');
            // Transform API response to hook interface
            const transformedWorkspaces = (response.workspaces || []).map((ws) => ({
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
        }
        catch (err) {
            console.error('Failed to fetch workspaces:', err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [client, activeWorkspace]);
    // Create a new workspace
    const createWorkspace = useCallback(async (data) => {
        try {
            const response = await client.fetch('/api/workspaces', {
                method: 'POST',
                body: JSON.stringify({
                    name: data.name,
                    type: data.type,
                    image_url: data.image,
                }),
            });
            const newWorkspace = {
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
        }
        catch (err) {
            console.error('Failed to create workspace:', err);
            throw err;
        }
    }, [client]);
    // Update a workspace
    const updateWorkspace = useCallback(async (id, data) => {
        try {
            const response = await client.fetch(`/api/workspaces/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: data.name,
                    type: data.type,
                    image_url: data.image,
                }),
            });
            const updatedWorkspace = {
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
            setWorkspaces((prev) => prev.map((ws) => (ws.id === id ? updatedWorkspace : ws)));
            // Update active workspace if it was the one updated
            if (activeWorkspace?.id === id) {
                setActiveWorkspaceState(updatedWorkspace);
            }
            return updatedWorkspace;
        }
        catch (err) {
            console.error('Failed to update workspace:', err);
            throw err;
        }
    }, [client, activeWorkspace]);
    // Delete a workspace
    const deleteWorkspace = useCallback(async (id) => {
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
        }
        catch (err) {
            console.error('Failed to delete workspace:', err);
            throw err;
        }
    }, [client, activeWorkspace, workspaces]);
    // Set active workspace with localStorage persistence
    const setActiveWorkspace = useCallback((workspace) => {
        setActiveWorkspaceState(workspace);
        // Persist to localStorage (only in browser)
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem('chatsdk:activeWorkspaceId', workspace.id);
            }
            catch (err) {
                console.warn('Failed to persist active workspace:', err);
            }
        }
    }, []);
    // Initial load - only when connected
    useEffect(() => {
        // Don't fetch until connected
        if (!isConnected) {
            return;
        }
        // Prevent duplicate fetches
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;
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
            }
            catch (err) {
                console.warn('Failed to restore active workspace:', err);
            }
        }
    }, [isConnected, fetchWorkspaces, workspaces]);
    // Reset fetch state on disconnect
    useEffect(() => {
        if (!isConnected) {
            hasFetchedRef.current = false;
        }
    }, [isConnected]);
    // Update a workspace member's role
    const updateMemberRole = useCallback(async (workspaceId, userId, role) => {
        return client.updateWorkspaceMemberRole(workspaceId, userId, role);
    }, [client]);
    // Add members to a workspace
    const addMembers = useCallback(async (workspaceId, userIds, role = 'member') => {
        const result = await client.addWorkspaceMembers(workspaceId, userIds, role);
        await fetchWorkspaces(); // Refresh to update memberCount
        return result;
    }, [client, fetchWorkspaces]);
    // Remove a member from a workspace
    const removeMember = useCallback(async (workspaceId, userId) => {
        await client.removeWorkspaceMember(workspaceId, userId);
        await fetchWorkspaces(); // Refresh to update memberCount
    }, [client, fetchWorkspaces]);
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
        updateMemberRole,
        addMembers,
        removeMember,
    };
}
