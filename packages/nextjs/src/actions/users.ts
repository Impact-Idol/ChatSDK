/**
 * User Server Actions for Next.js
 */

'use server';

import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
  custom: z.record(z.unknown()).optional(),
});

/**
 * Get current user
 */
export async function getCurrentUser(
  token: string,
  apiUrl: string
) {
  const response = await fetch(`${apiUrl}/api/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update current user
 */
export async function updateCurrentUser(
  token: string,
  apiUrl: string,
  data: z.infer<typeof updateUserSchema>
) {
  const validated = updateUserSchema.parse(data);

  const response = await fetch(`${apiUrl}/api/users/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  if (!response.ok) {
    throw new Error(`Failed to update user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user by ID
 */
export async function getUser(
  token: string,
  apiUrl: string,
  userId: string
) {
  const response = await fetch(`${apiUrl}/api/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query/search users
 */
export async function queryUsers(
  token: string,
  apiUrl: string,
  options?: { limit?: number; offset?: number; q?: string }
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.q) params.set('q', options.q);

  const response = await fetch(
    `${apiUrl}/api/users?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to query users: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Block a user
 */
export async function blockUser(
  token: string,
  apiUrl: string,
  userId: string
) {
  const response = await fetch(
    `${apiUrl}/api/users/${userId}/block`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to block user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Unblock a user
 */
export async function unblockUser(
  token: string,
  apiUrl: string,
  userId: string
) {
  const response = await fetch(
    `${apiUrl}/api/users/${userId}/block`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to unblock user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(
  token: string,
  apiUrl: string
) {
  const response = await fetch(
    `${apiUrl}/api/users/me/blocked`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch blocked users: ${response.statusText}`);
  }

  return response.json();
}
