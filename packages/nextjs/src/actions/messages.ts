/**
 * Message Server Actions for Next.js
 */

'use server';

import { z } from 'zod';

const sendMessageSchema = z.object({
  text: z.string().min(1).max(5000).optional(),
  attachments: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    name: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  replyToId: z.string().uuid().optional(),
  mentionedUserIds: z.array(z.string()).optional(),
});

const updateMessageSchema = z.object({
  text: z.string().min(1).max(5000),
});

/**
 * Get messages from a channel
 */
export async function getMessages(
  token: string,
  apiUrl: string,
  channelId: string,
  options?: { limit?: number; before?: string; after?: string }
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.before) params.set('before', options.before);
  if (options?.after) params.set('after', options.after);

  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Send a message to a channel
 */
export async function sendMessage(
  token: string,
  apiUrl: string,
  channelId: string,
  data: z.infer<typeof sendMessageSchema>
) {
  const validated = sendMessageSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update a message
 */
export async function updateMessage(
  token: string,
  apiUrl: string,
  channelId: string,
  messageId: string,
  data: z.infer<typeof updateMessageSchema>
) {
  const validated = updateMessageSchema.parse(data);

  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a message
 */
export async function deleteMessage(
  token: string,
  apiUrl: string,
  channelId: string,
  messageId: string
) {
  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages/${messageId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add reaction to a message
 */
export async function addReaction(
  token: string,
  apiUrl: string,
  channelId: string,
  messageId: string,
  emoji: string
) {
  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages/${messageId}/reactions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to add reaction: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove reaction from a message
 */
export async function removeReaction(
  token: string,
  apiUrl: string,
  channelId: string,
  messageId: string,
  emoji: string
) {
  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove reaction: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Pin a message
 */
export async function pinMessage(
  token: string,
  apiUrl: string,
  channelId: string,
  messageId: string
) {
  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages/${messageId}/pin`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to pin message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Unpin a message
 */
export async function unpinMessage(
  token: string,
  apiUrl: string,
  channelId: string,
  messageId: string
) {
  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/messages/${messageId}/pin`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to unpin message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get pinned messages for a channel
 */
export async function getPinnedMessages(
  token: string,
  apiUrl: string,
  channelId: string
) {
  const response = await fetch(
    `${apiUrl}/api/channels/${channelId}/pins`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch pinned messages: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save/bookmark a message
 */
export async function saveMessage(
  token: string,
  apiUrl: string,
  messageId: string
) {
  const response = await fetch(
    `${apiUrl}/api/messages/${messageId}/save`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to save message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Unsave/unbookmark a message
 */
export async function unsaveMessage(
  token: string,
  apiUrl: string,
  messageId: string
) {
  const response = await fetch(
    `${apiUrl}/api/messages/${messageId}/save`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to unsave message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user's saved messages
 */
export async function getSavedMessages(
  token: string,
  apiUrl: string,
  options?: { limit?: number; offset?: number }
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const response = await fetch(
    `${apiUrl}/api/users/me/saved?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch saved messages: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Report a message
 */
export async function reportMessage(
  token: string,
  apiUrl: string,
  messageId: string,
  reason: 'harassment' | 'spam' | 'inappropriate' | 'violence' | 'hate_speech',
  details?: string
) {
  const response = await fetch(
    `${apiUrl}/api/messages/${messageId}/report`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, details }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to report message: ${response.statusText}`);
  }

  return response.json();
}
