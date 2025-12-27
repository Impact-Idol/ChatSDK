/**
 * Server-side ChatSDK configuration for Next.js
 * Server Actions use direct HTTP calls, not the WebSocket-based ChatClient
 */

export interface ChatSDKConfig {
  apiUrl: string;
  defaultToken?: string;
}

let globalConfig: ChatSDKConfig | null = null;

/**
 * Initialize global ChatSDK configuration for server-side usage
 */
export function initChatSDK(config: ChatSDKConfig): ChatSDKConfig {
  globalConfig = config;
  return config;
}

/**
 * Get existing ChatSDK configuration
 */
export function getChatSDKConfig(): ChatSDKConfig {
  if (!globalConfig) {
    throw new Error('ChatSDK not initialized. Call initChatSDK() first.');
  }
  return globalConfig;
}
