/**
 * ChatSDK Core
 * OpenIMSDK-inspired chat SDK for web and mobile
 */

// Types
export * from './types';

// EventBus
export { EventBus, getEventBus, resetEventBus } from './callbacks/EventBus';

// ChatSDK 2.0 - Simplified API (Recommended)
export { ChatSDK } from './ChatSDK';
export type { ChatSDKConnectConfig } from './ChatSDK';

// ChatClient (Lower-level API, backward compatibility)
export { ChatClient, createChatClient } from './client/ChatClient';
export type { ChatClientConfig } from './client/ChatClient';

// MessageSyncer
export { MessageSyncer } from './sync/MessageSyncer';
export type { MessageSyncerOptions, SyncStorage } from './sync/MessageSyncer';

// OfflineQueue
export { OfflineQueue } from './offline/OfflineQueue';
export type { OfflineQueueOptions, OfflineStorage, LocalMessage } from './offline/OfflineQueue';

// Storage
export { IndexedDBStorage } from './storage/IndexedDBStorage';
