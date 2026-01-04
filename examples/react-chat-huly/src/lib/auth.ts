/**
 * ChatSDK Authentication Utility
 * Handles token generation using the /tokens endpoint
 */

import { getApiConfig } from './api-client';

export interface ChatTokens {
  token: string; // JWT for API requests
  wsToken: string; // JWT for WebSocket connection
  user: {
    id: string;
    name: string;
    image?: string;
  };
  expiresIn: number; // Seconds until expiry
}

export interface DemoUser {
  id: string;
  name: string;
  image?: string;
}

/**
 * Demo users for testing
 */
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
  },
  {
    id: 'user-2',
    name: 'Bob Smith',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
  },
  {
    id: 'user-3',
    name: 'Charlie Davis',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'
  }
];

/**
 * Generate chat tokens for a user
 * This simulates what a third-party backend would do
 */
export async function generateChatTokens(user: DemoUser): Promise<ChatTokens> {
  const config = getApiConfig();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key if configured
  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }

  const response = await fetch(`${config.apiUrl}/tokens`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: user.id,
      name: user.name,
      image: user.image,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`Failed to generate tokens: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Check if tokens are expired
 */
export function areTokensExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Store tokens in localStorage
 */
export function storeTokens(tokens: ChatTokens): void {
  const expiresAt = Date.now() + (tokens.expiresIn * 1000);

  localStorage.setItem('chatToken', tokens.token);
  localStorage.setItem('chatWsToken', tokens.wsToken);
  localStorage.setItem('chatUser', JSON.stringify(tokens.user));
  localStorage.setItem('chatTokenExpiresAt', expiresAt.toString());
}

/**
 * Retrieve tokens from localStorage
 */
export function getStoredTokens(): ChatTokens | null {
  const token = localStorage.getItem('chatToken');
  const wsToken = localStorage.getItem('chatWsToken');
  const userStr = localStorage.getItem('chatUser');
  const expiresAtStr = localStorage.getItem('chatTokenExpiresAt');

  if (!token || !wsToken || !userStr || !expiresAtStr) {
    return null;
  }

  const expiresAt = parseInt(expiresAtStr, 10);

  if (areTokensExpired(expiresAt)) {
    clearTokens();
    return null;
  }

  return {
    token,
    wsToken,
    user: JSON.parse(userStr),
    expiresIn: Math.floor((expiresAt - Date.now()) / 1000)
  };
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  localStorage.removeItem('chatToken');
  localStorage.removeItem('chatWsToken');
  localStorage.removeItem('chatUser');
  localStorage.removeItem('chatTokenExpiresAt');
}
