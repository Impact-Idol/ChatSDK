/**
 * Prometheus Metrics Service
 * Work Stream 22 - TIER 4
 *
 * Exposes application metrics for monitoring:
 * - HTTP request metrics (count, duration, errors)
 * - Message metrics (sent, received, deleted)
 * - Channel metrics (created, deleted, active)
 * - WebSocket metrics (connections, subscriptions)
 * - Database metrics (query duration, connections)
 */

import prometheus from 'prom-client';

// Create a Registry to register the metrics
export const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestsTotal = new prometheus.Counter({
  name: 'chatsdk_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'app_id'],
  registers: [register],
});

export const httpRequestDuration = new prometheus.Histogram({
  name: 'chatsdk_http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpRequestsInFlight = new prometheus.Gauge({
  name: 'chatsdk_http_requests_in_flight',
  help: 'Current number of HTTP requests being processed',
  registers: [register],
});

// ============================================================================
// Message Metrics
// ============================================================================

export const messagesTotal = new prometheus.Counter({
  name: 'chatsdk_messages_total',
  help: 'Total number of messages sent',
  labelNames: ['app_id', 'channel_type'],
  registers: [register],
});

export const messagesDeleted = new prometheus.Counter({
  name: 'chatsdk_messages_deleted_total',
  help: 'Total number of messages deleted',
  labelNames: ['app_id'],
  registers: [register],
});

export const messagesUpdated = new prometheus.Counter({
  name: 'chatsdk_messages_updated_total',
  help: 'Total number of messages updated',
  labelNames: ['app_id'],
  registers: [register],
});

export const messageSize = new prometheus.Histogram({
  name: 'chatsdk_message_size_bytes',
  help: 'Message size in bytes',
  labelNames: ['app_id'],
  buckets: [100, 500, 1000, 5000, 10000, 50000],
  registers: [register],
});

// ============================================================================
// Channel Metrics
// ============================================================================

export const channelsTotal = new prometheus.Gauge({
  name: 'chatsdk_channels_total',
  help: 'Total number of active channels',
  labelNames: ['app_id', 'type'],
  registers: [register],
});

export const channelsCreated = new prometheus.Counter({
  name: 'chatsdk_channels_created_total',
  help: 'Total number of channels created',
  labelNames: ['app_id', 'type'],
  registers: [register],
});

export const channelMembers = new prometheus.Gauge({
  name: 'chatsdk_channel_members',
  help: 'Number of members observed by channel type',
  labelNames: ['app_id', 'channel_type'],
  registers: [register],
});

// ============================================================================
// User Metrics
// ============================================================================

export const usersOnline = new prometheus.Gauge({
  name: 'chatsdk_users_online',
  help: 'Number of currently online users',
  labelNames: ['app_id'],
  registers: [register],
});

export const usersCreated = new prometheus.Counter({
  name: 'chatsdk_users_created_total',
  help: 'Total number of users created',
  labelNames: ['app_id'],
  registers: [register],
});

// ============================================================================
// WebSocket Metrics
// ============================================================================

export const websocketConnections = new prometheus.Gauge({
  name: 'chatsdk_websocket_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['app_id'],
  registers: [register],
});

export const websocketSubscriptions = new prometheus.Gauge({
  name: 'chatsdk_websocket_subscriptions',
  help: 'Number of active channel subscriptions',
  labelNames: ['app_id'],
  registers: [register],
});

export const websocketMessagesPublished = new prometheus.Counter({
  name: 'chatsdk_websocket_messages_published_total',
  help: 'Total number of messages published via WebSocket',
  labelNames: ['app_id', 'event_type'],
  registers: [register],
});

export const realtimeOutboxDepth = new prometheus.Gauge({
  name: 'chatsdk_realtime_outbox_depth',
  help: 'Number of realtime outbox events by status',
  labelNames: ['status'],
  registers: [register],
});

export const realtimeOutboxOldestPendingSeconds = new prometheus.Gauge({
  name: 'chatsdk_realtime_outbox_oldest_pending_seconds',
  help: 'Age of the oldest pending or failed realtime outbox event in seconds',
  registers: [register],
});

export const realtimeOutboxPublishAttempts = new prometheus.Counter({
  name: 'chatsdk_realtime_outbox_publish_attempts_total',
  help: 'Total realtime outbox publish attempts',
  labelNames: ['app_id', 'event_type', 'result'],
  registers: [register],
});

export const realtimeOutboxPublishDuration = new prometheus.Histogram({
  name: 'chatsdk_realtime_outbox_publish_duration_seconds',
  help: 'Realtime outbox publish duration in seconds',
  labelNames: ['app_id', 'event_type'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// ============================================================================
// Database Metrics
// ============================================================================

export const dbQueryDuration = new prometheus.Histogram({
  name: 'chatsdk_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionsActive = new prometheus.Gauge({
  name: 'chatsdk_db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const dbErrors = new prometheus.Counter({
  name: 'chatsdk_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

// ============================================================================
// Reaction Metrics
// ============================================================================

export const reactionsAdded = new prometheus.Counter({
  name: 'chatsdk_reactions_added_total',
  help: 'Total number of reactions added',
  labelNames: ['app_id', 'emoji'],
  registers: [register],
});

export const reactionsRemoved = new prometheus.Counter({
  name: 'chatsdk_reactions_removed_total',
  help: 'Total number of reactions removed',
  labelNames: ['app_id', 'emoji'],
  registers: [register],
});

// ============================================================================
// Upload Metrics
// ============================================================================

export const uploadsTotal = new prometheus.Counter({
  name: 'chatsdk_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['app_id', 'content_kind'],
  registers: [register],
});

export const uploadSize = new prometheus.Histogram({
  name: 'chatsdk_upload_size_bytes',
  help: 'Upload file size in bytes',
  labelNames: ['app_id', 'content_kind'],
  buckets: [1024, 10240, 102400, 1024000, 10240000, 104857600], // 1KB to 100MB
  registers: [register],
});

export const uploadOperationsTotal = new prometheus.Counter({
  name: 'chatsdk_upload_operations_total',
  help: 'Upload operations by result and reason',
  labelNames: ['app_id', 'operation', 'result', 'reason'],
  registers: [register],
});

export const uploadOperationDuration = new prometheus.Histogram({
  name: 'chatsdk_upload_operation_duration_seconds',
  help: 'Upload operation duration in seconds',
  labelNames: ['operation', 'result'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const rateLimitDecisions = new prometheus.Counter({
  name: 'chatsdk_rate_limit_decisions_total',
  help: 'Rate-limit decisions by action, result, and backing store',
  labelNames: ['app_id', 'action', 'result', 'store'],
  registers: [register],
});

// ============================================================================
// Search Metrics
// ============================================================================

export const searchIndexOperationsTotal = new prometheus.Counter({
  name: 'chatsdk_search_index_operations_total',
  help: 'Search index operations by result',
  labelNames: ['app_id', 'operation', 'result'],
  registers: [register],
});

export const searchIndexOperationDuration = new prometheus.Histogram({
  name: 'chatsdk_search_index_operation_duration_seconds',
  help: 'Search index operation duration in seconds',
  labelNames: ['operation', 'result'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const searchIndexLag = new prometheus.Histogram({
  name: 'chatsdk_search_index_lag_seconds',
  help: 'Age of a message when it is submitted to the search index',
  labelNames: ['app_id', 'operation'],
  buckets: [0.1, 1, 5, 15, 30, 60, 300, 900, 3600],
  registers: [register],
});

export const searchQueriesTotal = new prometheus.Counter({
  name: 'chatsdk_search_queries_total',
  help: 'Search query operations by result',
  labelNames: ['app_id', 'result'],
  registers: [register],
});

// ============================================================================
// Lifecycle Purge Metrics
// ============================================================================

export const lifecyclePurgeDepth = new prometheus.Gauge({
  name: 'chatsdk_lifecycle_purge_depth',
  help: 'Number of lifecycle purge ledger rows by status',
  labelNames: ['status'],
  registers: [register],
});

export const lifecyclePurgeOldestPendingSeconds = new prometheus.Gauge({
  name: 'chatsdk_lifecycle_purge_oldest_pending_seconds',
  help: 'Age of the oldest pending lifecycle storage purge in seconds',
  registers: [register],
});

export const lifecyclePurgeAttemptsTotal = new prometheus.Counter({
  name: 'chatsdk_lifecycle_purge_attempts_total',
  help: 'Lifecycle storage purge attempts by result',
  labelNames: ['app_id', 'result'],
  registers: [register],
});

export const lifecyclePurgeDuration = new prometheus.Histogram({
  name: 'chatsdk_lifecycle_purge_duration_seconds',
  help: 'Lifecycle storage purge object deletion duration in seconds',
  labelNames: ['result'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// ============================================================================
// Webhook Metrics
// ============================================================================

export const webhookDeliveries = new prometheus.Counter({
  name: 'chatsdk_webhook_deliveries_total',
  help: 'Total number of webhook deliveries',
  labelNames: ['app_id', 'event_type', 'success'],
  registers: [register],
});

export const webhookDeliveryDuration = new prometheus.Histogram({
  name: 'chatsdk_webhook_delivery_duration_seconds',
  help: 'Webhook delivery duration in seconds',
  labelNames: ['app_id', 'event_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// ============================================================================
// Business Metrics
// ============================================================================

export const appsTotal = new prometheus.Gauge({
  name: 'chatsdk_apps_total',
  help: 'Total number of registered applications',
  registers: [register],
});

export const workspacesTotal = new prometheus.Gauge({
  name: 'chatsdk_workspaces_total',
  help: 'Total number of workspaces',
  labelNames: ['app_id'],
  registers: [register],
});

export const pollsCreated = new prometheus.Counter({
  name: 'chatsdk_polls_created_total',
  help: 'Total number of polls created',
  labelNames: ['app_id'],
  registers: [register],
});

export const pollVotes = new prometheus.Counter({
  name: 'chatsdk_poll_votes_total',
  help: 'Total number of poll votes cast',
  labelNames: ['app_id'],
  registers: [register],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track HTTP request
 */
export function trackHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  appId?: string
): void {
  httpRequestsTotal.inc({
    method,
    route,
    status_code: statusCode,
    app_id: appId || 'unknown',
  });

  httpRequestDuration.observe(
    { method, route, status_code: statusCode },
    duration
  );
}

const routeTemplates: Array<[RegExp, string]> = [
  [/^\/admin\/apps\/[^/]+\/regenerate-key$/, '/admin/apps/:appId/regenerate-key'],
  [/^\/admin\/apps\/[^/]+$/, '/admin/apps/:appId'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/thread\/participants$/, '/api/channels/:channelId/messages/:messageId/thread/participants'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/thread$/, '/api/channels/:channelId/messages/:messageId/thread'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/polls\/[^/]+\/results$/, '/api/channels/:channelId/messages/:messageId/polls/:pollId/results'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/polls\/[^/]+\/vote$/, '/api/channels/:channelId/messages/:messageId/polls/:pollId/vote'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/polls$/, '/api/channels/:channelId/messages/:messageId/polls'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/purge$/, '/api/channels/:channelId/messages/:messageId/purge'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/reactions\/[^/]+$/, '/api/channels/:channelId/messages/:messageId/reactions/:emoji'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/reactions$/, '/api/channels/:channelId/messages/:messageId/reactions'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+\/(pin|save)$/, '/api/channels/:channelId/messages/:messageId/$1'],
  [/^\/api\/channels\/[^/]+\/messages\/[^/]+$/, '/api/channels/:channelId/messages/:messageId'],
  [/^\/api\/channels\/[^/]+\/messages$/, '/api/channels/:channelId/messages'],
  [/^\/api\/channels\/[^/]+\/uploads$/, '/api/channels/:channelId/uploads'],
  [/^\/api\/channels\/[^/]+\/search$/, '/api/channels/:channelId/search'],
  [/^\/api\/channels\/[^/]+\/presence\/live$/, '/api/channels/:channelId/presence/live'],
  [/^\/api\/channels\/[^/]+\/presence$/, '/api/channels/:channelId/presence'],
  [/^\/api\/channels\/[^/]+\/read\/messages\/[^/]+\/receipts$/, '/api/channels/:channelId/read/messages/:messageId/receipts'],
  [/^\/api\/channels\/[^/]+\/read\/read-status$/, '/api/channels/:channelId/read/read-status'],
  [/^\/api\/channels\/[^/]+\/read$/, '/api/channels/:channelId/read'],
  [/^\/api\/channels\/[^/]+\/receipts\/messages\/[^/]+\/receipts$/, '/api/channels/:channelId/receipts/messages/:messageId/receipts'],
  [/^\/api\/channels\/[^/]+\/receipts\/read-status$/, '/api/channels/:channelId/receipts/read-status'],
  [/^\/api\/channels\/[^/]+\/receipts$/, '/api/channels/:channelId/receipts'],
  [/^\/api\/channels\/[^/]+\/members\/[^/]+$/, '/api/channels/:channelId/members/:userId'],
  [/^\/api\/channels\/[^/]+\/members$/, '/api/channels/:channelId/members'],
  [/^\/api\/channels\/[^/]+\/(archive|unarchive|mute|unmute)$/, '/api/channels/:channelId/$1'],
  [/^\/api\/channels\/[^/]+$/, '/api/channels/:channelId'],
  [/^\/api\/devices\/[^/]+$/, '/api/devices/:token'],
  [/^\/api\/emoji\/search$/, '/api/emoji/search'],
  [/^\/api\/emoji\/[^/]+\/(use|analytics)$/, '/api/emoji/:emojiId/$1'],
  [/^\/api\/emoji\/[^/]+$/, '/api/emoji/:emojiId'],
  [/^\/api\/enrollment\/[^/]+\/(pause|resume)$/, '/api/enrollment/:ruleId/$1'],
  [/^\/api\/enrollment\/[^/]+$/, '/api/enrollment/:ruleId'],
  [/^\/api\/moderation\/reports\/[^/]+$/, '/api/moderation/reports/:reportId'],
  [/^\/api\/polls\/[^/]+\/results$/, '/api/polls/:pollId/results'],
  [/^\/api\/polls\/[^/]+\/vote$/, '/api/polls/:pollId/vote'],
  [/^\/api\/polls\/[^/]+$/, '/api/polls/:pollId'],
  [/^\/api\/templates\/[^/]+\/(activate|deactivate)$/, '/api/templates/:templateId/$1'],
  [/^\/api\/templates\/[^/]+$/, '/api/templates/:templateId'],
  [/^\/api\/uploads\/content$/, '/api/uploads/content'],
  [/^\/api\/uploads\/[^/]+\/content$/, '/api/uploads/:key/content'],
  [/^\/api\/uploads\/[^/]+\/download$/, '/api/uploads/:key/download'],
  [/^\/api\/uploads\/[^/]+\/confirm$/, '/api/uploads/:key/confirm'],
  [/^\/api\/uploads\/[^/]+$/, '/api/uploads/:key'],
  [/^\/api\/users\/[^/]+\/supervise\/[^/]+$/, '/api/users/:userId/supervise/:supervisionId'],
  [/^\/api\/users\/[^/]+\/supervise$/, '/api/users/:userId/supervise'],
  [/^\/api\/users\/[^/]+\/activity$/, '/api/users/:userId/activity'],
  [/^\/api\/users\/[^/]+\/supervisors$/, '/api/users/:userId/supervisors'],
  [/^\/api\/users\/[^/]+\/block$/, '/api/users/:userId/block'],
  [/^\/api\/users\/[^/]+\/(export|revoke-tokens|revoke-device-tokens|revoke-channel-tokens)$/, '/api/users/:userId/$1'],
  [/^\/api\/users\/[^/]+$/, '/api/users/:userId'],
  [/^\/api\/webhooks\/[^/]+\/deliveries$/, '/api/webhooks/:webhookId/deliveries'],
  [/^\/api\/webhooks\/[^/]+\/test$/, '/api/webhooks/:webhookId/test'],
  [/^\/api\/webhooks\/[^/]+\/rotate-secret$/, '/api/webhooks/:webhookId/rotate-secret'],
  [/^\/api\/webhooks\/[^/]+$/, '/api/webhooks/:webhookId'],
  [/^\/api\/workspaces\/invites\/[^/]+$/, '/api/workspaces/invites/:token'],
  [/^\/api\/workspaces\/[^/]+\/members\/[^/]+$/, '/api/workspaces/:workspaceId/members/:userId'],
  [/^\/api\/workspaces\/[^/]+\/members$/, '/api/workspaces/:workspaceId/members'],
  [/^\/api\/workspaces\/[^/]+\/channels$/, '/api/workspaces/:workspaceId/channels'],
  [/^\/api\/workspaces\/[^/]+\/invite$/, '/api/workspaces/:workspaceId/invite'],
  [/^\/api\/workspaces\/[^/]+$/, '/api/workspaces/:workspaceId'],
];

const staticRouteSegments = new Set([
  'admin', 'api', 'apps', 'regenerate-key',
  'auth', 'refresh', 'tokens', 'validate', 'validate-ws',
  'metrics', 'health', 'detailed', 'ready', 'live',
  'users', 'me', 'blocked', 'block', 'export', 'revoke-tokens', 'revoke-device-tokens', 'revoke-channel-tokens',
  'channels', 'messages', 'thread', 'participants', 'polls', 'results', 'vote', 'purge', 'reactions',
  'pin', 'save', 'members', 'uploads', 'search', 'presence', 'read', 'receipts', 'read-status',
  'archive', 'unarchive', 'mute', 'unmute',
  'devices', 'preferences', 'uploads', 'content', 'download', 'confirm',
  'realtime', 'subscription-token', 'webpush', 'vapid-key', 'subscribe', 'unsubscribe', 'test',
  'workspaces', 'invites', 'invite',
  'moderation', 'reports', 'supervise', 'activity', 'supervisors',
  'enrollment', 'pause', 'resume',
  'templates', 'activate', 'deactivate',
  'emoji', 'use', 'analytics',
  'webhooks', 'deliveries', 'rotate-secret',
  'mentions', 'unread-count',
]);

export function normalizeHttpRoute(path: string): string {
  const cleanPath = (path.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  for (const [pattern, template] of routeTemplates) {
    const match = pattern.exec(cleanPath);
    if (match) {
      return cleanPath.replace(pattern, template);
    }
  }

  return cleanPath
    .split('/')
    .map((segment, index) => {
      if (index === 0 || staticRouteSegments.has(segment)) {
        return segment;
      }
      return ':id';
    })
    .join('/');
}

/**
 * Track message sent
 */
export function trackMessageSent(appId: string, channelType: string, sizeBytes: number): void {
  messagesTotal.inc({ app_id: appId, channel_type: channelType });
  messageSize.observe({ app_id: appId }, sizeBytes);
}

/**
 * Track channel created
 */
export function trackChannelCreated(appId: string, type: string): void {
  channelsCreated.inc({ app_id: appId, type });
  channelsTotal.inc({ app_id: appId, type });
}

/**
 * Track webhook delivery
 */
export function trackWebhookDelivery(
  appId: string,
  eventType: string,
  success: boolean,
  duration: number
): void {
  webhookDeliveries.inc({
    app_id: appId,
    event_type: eventType,
    success: success ? 'true' : 'false',
  });

  webhookDeliveryDuration.observe(
    { app_id: appId, event_type: eventType },
    duration
  );
}

export function trackUploadOperation(
  appId: string | undefined,
  operation: string,
  result: 'success' | 'failure',
  reason: string,
  durationSeconds: number
): void {
  uploadOperationsTotal.inc({
    app_id: appId || 'unknown',
    operation,
    result,
    reason,
  });
  uploadOperationDuration.observe({ operation, result }, durationSeconds);
}

export function trackUploadAccepted(appId: string | undefined, contentType: string, sizeBytes: number): void {
  const contentKind = normalizeContentKind(contentType);
  uploadsTotal.inc({ app_id: appId || 'unknown', content_kind: contentKind });
  uploadSize.observe({ app_id: appId || 'unknown', content_kind: contentKind }, sizeBytes);
}

export function normalizeContentKind(contentType: string | undefined): string {
  const normalized = (contentType || '').toLowerCase();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  return 'other';
}

export function trackSearchIndexOperation(input: {
  appId?: string;
  operation: string;
  result: 'success' | 'failure' | 'skipped';
  durationSeconds: number;
  lagSeconds?: number;
}): void {
  searchIndexOperationsTotal.inc({
    app_id: input.appId || 'unknown',
    operation: input.operation,
    result: input.result,
  });
  searchIndexOperationDuration.observe(
    { operation: input.operation, result: input.result },
    input.durationSeconds
  );
  if (input.lagSeconds !== undefined && input.result !== 'skipped') {
    searchIndexLag.observe(
      { app_id: input.appId || 'unknown', operation: input.operation },
      Math.max(0, input.lagSeconds)
    );
  }
}

export function trackSearchQuery(appId: string | undefined, result: 'success' | 'failure' | 'skipped'): void {
  searchQueriesTotal.inc({
    app_id: appId || 'unknown',
    result,
  });
}

export function trackLifecyclePurgeAttempt(
  appId: string | undefined,
  result: 'success' | 'failure' | 'rejected',
  durationSeconds: number
): void {
  lifecyclePurgeAttemptsTotal.inc({
    app_id: appId || 'unknown',
    result,
  });
  lifecyclePurgeDuration.observe({ result }, durationSeconds);
}

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}
