/**
 * Channel Server Actions for Next.js
 */

'use server';

import { z } from 'zod';

const createChannelSchema = z.object({
  type: z.enum(['direct', 'group', 'team']),
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.string()).optional(),
  workspaceId: z.string().uuid().optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional(),
  description: z.string().max(1000).optional(),
});

/**
 * Get user's channels
 */
export async function getChannels(
  token: string,
  apiUrl: string,
  options?: { limit?: number; workspaceId?: string }
) {
  const response = await fetch(`${apiUrl}/api/channels?limit=${options?.limit || 50}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channels: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get channel by ID
 */
export async function getChannel(
  token: string,
  apiUrl: string,
  channelId: string
) {
  const response = await fetch(`${apiUrl}/api/channels/${channelId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channel: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new channel
 */
export async function createChannel(
  token: string,
  apiUrl: string,
  data: z.infer<typeof createChannelSchema>
) {
  const validated = createChannelSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/channels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to create channel: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update channel
 */
export async function updateChannel(
  token: string,
  apiUrl: string,
  channelId: string,
  data: z.infer<typeof updateChannelSchema>
) {
  const validated = updateChannelSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/channels/${channelId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to update channel: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete channel
 */
export async function deleteChannel(
  token: string,
  apiUrl: string,
  channelId: string
) {
  const response = await fetch(`${apiUrl}/api/channels/${channelId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete channel: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add members to channel
 */
export async function addChannelMembers(
  token: string,
  apiUrl: string,
  channelId: string,
  userIds: string[]
) {
  const response = await fetch(`${apiUrl}/api/channels/${channelId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add members: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove member from channel
 */
export async function removeChannelMember(
  token: string,
  apiUrl: string,
  channelId: string,
  userId: string
) {
  const response = await fetch(`${apiUrl}/api/channels/${channelId}/members/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to remove member: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Mark channel as read
 */
export async function markChannelRead(
  token: string,
  apiUrl: string,
  channelId: string,
  lastReadSeq: number
) {
  const response = await fetch(`${apiUrl}/api/channels/${channelId}/read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lastReadSeq }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark as read: ${response.statusText}`);
  }

  return response.json();
}
