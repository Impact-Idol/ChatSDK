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
// ChatClient (Lower-level API, backward compatibility)
export { ChatClient, createChatClient } from './client/ChatClient';
// MessageSyncer
export { MessageSyncer } from './sync/MessageSyncer';
// OfflineQueue
export { OfflineQueue } from './offline/OfflineQueue';
// Storage
export { IndexedDBStorage } from './storage/IndexedDBStorage';
// Retry Logic (Week 3)
export { retryAsync, shouldRetry, calculateBackoff, DEFAULT_RETRY_CONFIG } from './lib/retry';
// Circuit Breaker (Week 3)
export { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from './lib/circuit-breaker';
// Request Deduplication (Week 3)
export { RequestDeduplicator, DuplicateRequestError, Debouncer } from './lib/deduplication';
// Network Quality Monitor (Week 4)
export { NetworkQualityMonitor, NetworkQuality } from './network/quality-monitor';
// Token Manager (Week 4)
export { TokenManager } from './auth/token-manager';
// Connection Manager (Week 4)
export { ConnectionManager, ConnectionState } from './realtime/connection-manager';
// Logger (Week 6)
export { logger, LogLevel } from './lib/logger';
// Enhanced Errors (Week 6)
export { ChatSDKError, AuthenticationError, NetworkError, PermissionError, RateLimitError, ValidationError, ConnectionError, TimeoutError, ConfigurationError, createError, assert, withErrorHandling, ErrorCodes, } from './lib/errors';
// Performance Profiler (Week 6)
export { profiler, Profile } from './lib/profiler';
