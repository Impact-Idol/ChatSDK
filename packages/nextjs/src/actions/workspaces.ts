/**
 * Workspace Server Actions for Next.js
 */

'use server';

import { z } from 'zod';

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['team', 'project', 'conference', 'chapter']).default('team'),
  image: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  config: z.record(z.unknown()).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  config: z.record(z.unknown()).optional(),
});

const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
});

/**
 * Get user's workspaces
 */
export async function getWorkspaces(
  token: string,
  apiUrl: string
) {
  const response = await fetch(`${apiUrl}/api/workspaces`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workspaces: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(
  token: string,
  apiUrl: string,
  workspaceId: string
) {
  const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workspace: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
  token: string,
  apiUrl: string,
  data: z.infer<typeof createWorkspaceSchema>
) {
  const validated = createWorkspaceSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/workspaces`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to create workspace: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  token: string,
  apiUrl: string,
  workspaceId: string,
  data: z.infer<typeof updateWorkspaceSchema>
) {
  const validated = updateWorkspaceSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to update workspace: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(
  token: string,
  apiUrl: string,
  workspaceId: string
) {
  const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete workspace: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add members to workspace
 */
export async function addWorkspaceMembers(
  token: string,
  apiUrl: string,
  workspaceId: string,
  data: z.infer<typeof addMembersSchema>
) {
  const validated = addMembersSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to add members: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(
  token: string,
  apiUrl: string,
  workspaceId: string,
  userId: string
) {
  const response = await fetch(
    `${apiUrl}/api/workspaces/${workspaceId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove member: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get workspace channels
 */
export async function getWorkspaceChannels(
  token: string,
  apiUrl: string,
  workspaceId: string
) {
  const response = await fetch(
    `${apiUrl}/api/workspaces/${workspaceId}/channels`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch workspace channels: ${response.statusText}`);
  }

  return response.json();
}
