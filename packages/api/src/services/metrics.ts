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
  help: 'Number of members in a channel',
  labelNames: ['app_id', 'channel_id'],
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
  labelNames: ['app_id', 'content_type'],
  registers: [register],
});

export const uploadSize = new prometheus.Histogram({
  name: 'chatsdk_upload_size_bytes',
  help: 'Upload file size in bytes',
  labelNames: ['app_id', 'content_type'],
  buckets: [1024, 10240, 102400, 1024000, 10240000, 104857600], // 1KB to 100MB
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
  labelNames: ['app_id', 'poll_id'],
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

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}
