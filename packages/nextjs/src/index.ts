/**
 * ChatSDK Next.js Adapter
 * Server-side SDK for Next.js applications
 */

export { initChatSDK, getChatSDKConfig } from './client';
export type { ChatSDKConfig } from './client';

// Re-export all server actions
export * from './actions';
