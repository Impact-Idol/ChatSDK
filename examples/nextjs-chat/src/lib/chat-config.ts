/**
 * ChatSDK Configuration for Next.js
 *
 * This module provides a centralized configuration that works with
 * Next.js environment variables (NEXT_PUBLIC_*).
 */

export interface ChatConfig {
  apiUrl: string;
  apiKey: string;
  wsUrl: string;
  appId: string;
}

/**
 * Get the chat configuration from environment variables
 */
export function getChatConfig(): ChatConfig {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500',
    apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/connection/websocket',
    appId: process.env.NEXT_PUBLIC_APP_ID || 'default',
  };
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: ChatConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.apiUrl) {
    errors.push('NEXT_PUBLIC_API_URL is not set');
  }

  if (!config.apiKey) {
    errors.push('NEXT_PUBLIC_API_KEY is not set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
