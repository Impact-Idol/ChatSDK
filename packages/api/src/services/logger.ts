/**
 * Structured Logging Service
 * Work Stream 22 - TIER 4
 *
 * Provides structured logging with Pino for:
 * - Request/response logging
 * - Error tracking
 * - Performance monitoring
 * - Security events
 */

import pino from 'pino';
import {
  getLogContext as getCurrentLogContext,
  runWithLogContext as runWithCurrentLogContext,
} from './log-context';

const isLocalLogging = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// Create logger instance
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isLocalLogging ? 'debug' : 'info'),
  redact: {
    paths: [
      'authorization',
      'Authorization',
      'x-api-key',
      'X-API-Key',
      '*.authorization',
      '*.Authorization',
      '*.x-api-key',
      '*.X-API-Key',
      '*.token',
      '*.refreshToken',
      '*.wsToken',
      '*.apiKey',
      '*.secret',
      '*.password',
      '*.DATABASE_URL',
      '*.REDIS_URL',
    ],
    censor: '[REDACTED]',
  },

  // Pretty print in development
  transport: isLocalLogging
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // Base fields included in all logs
  base: {
    env: process.env.NODE_ENV || 'unknown',
    service: 'chatsdk-api',
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Serialize errors
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

function withLogContext(args: unknown[]): unknown[] {
  const context = getCurrentLogContext();
  if (!context || Object.keys(context).length === 0) {
    return args;
  }

  const [first, ...rest] = args;
  if (first && typeof first === 'object' && !Array.isArray(first) && !(first instanceof Error)) {
    return [{ ...context, ...(first as Record<string, unknown>) }, ...rest];
  }
  return [context, ...args];
}

export const logger = new Proxy(baseLogger, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function' && ['debug', 'info', 'warn', 'error', 'fatal', 'trace'].includes(String(prop))) {
      return (...args: unknown[]) => value.apply(target, withLogContext(args));
    }
    return value;
  },
}) as typeof baseLogger;

export function runWithLogContext<T>(context: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  return runWithCurrentLogContext(context, fn);
}

export function getLogContext(): Record<string, unknown> {
  return getCurrentLogContext();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level]({
    type: 'http_request',
    method,
    url,
    status_code: statusCode,
    duration_ms: duration,
    ...metadata,
  }, `${method} ${url} ${statusCode} ${duration.toFixed(2)}ms`);
}

/**
 * Log message sent
 */
export function logMessageSent(
  appId: string,
  channelId: string,
  messageId: string,
  userId: string,
  metadata?: Record<string, any>
): void {
  logger.info({
    type: 'message_sent',
    app_id: appId,
    channel_id: channelId,
    message_id: messageId,
    user_id: userId,
    ...metadata,
  }, 'Message sent');
}

/**
 * Log channel created
 */
export function logChannelCreated(
  appId: string,
  channelId: string,
  channelType: string,
  createdBy: string,
  metadata?: Record<string, any>
): void {
  logger.info({
    type: 'channel_created',
    app_id: appId,
    channel_id: channelId,
    channel_type: channelType,
    created_by: createdBy,
    ...metadata,
  }, 'Channel created');
}

/**
 * Log user action
 */
export function logUserAction(
  action: string,
  appId: string,
  userId: string,
  metadata?: Record<string, any>
): void {
  logger.info({
    type: 'user_action',
    action,
    app_id: appId,
    user_id: userId,
    ...metadata,
  }, `User action: ${action}`);
}

/**
 * Log error
 */
export function logError(
  error: Error,
  context: string,
  metadata?: Record<string, any>
): void {
  logger.error({
    type: 'error',
    context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...metadata,
  }, `Error in ${context}: ${error.message}`);
}

/**
 * Log database query
 */
export function logDbQuery(
  operation: string,
  table: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const level = duration > 1000 ? 'warn' : 'debug';

  logger[level]({
    type: 'db_query',
    operation,
    table,
    duration_ms: duration,
    ...metadata,
  }, `DB ${operation} on ${table} (${duration.toFixed(2)}ms)`);
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  appId: string,
  userId: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
): void {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

  logger[level]({
    type: 'security_event',
    event,
    app_id: appId,
    user_id: userId,
    severity,
    ...metadata,
  }, `Security: ${event}`);
}

/**
 * Log webhook delivery
 */
export function logWebhookDelivery(
  webhookId: string,
  url: string,
  eventType: string,
  success: boolean,
  statusCode?: number,
  error?: string,
  metadata?: Record<string, any>
): void {
  const level = success ? 'info' : 'warn';

  logger[level]({
    type: 'webhook_delivery',
    webhook_id: webhookId,
    url,
    event_type: eventType,
    success,
    status_code: statusCode,
    error,
    ...metadata,
  }, `Webhook ${eventType} to ${url}: ${success ? 'success' : 'failed'}`);
}

/**
 * Log performance metric
 */
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const level = duration > 5000 ? 'warn' : 'debug';

  logger[level]({
    type: 'performance',
    operation,
    duration_ms: duration,
    ...metadata,
  }, `Performance: ${operation} took ${duration.toFixed(2)}ms`);
}

/**
 * Log cache operation
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  metadata?: Record<string, any>
): void {
  logger.debug({
    type: 'cache_operation',
    operation,
    key,
    ...metadata,
  }, `Cache ${operation}: ${key}`);
}

// Export default logger
export default logger;
