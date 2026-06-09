/**
 * Metrics Middleware
 * Work Stream 22 - TIER 4
 *
 * Tracks HTTP request metrics automatically
 */

import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'crypto';
import { httpRequestsInFlight, normalizeHttpRoute, trackHttpRequest } from '../services/metrics';
import { logRequest } from '../services/logger';
import { runWithLogContext } from '../services/log-context';

/**
 * Middleware to track all HTTP requests
 */
export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const startTime = Date.now();
  const requestId = c.req.header('X-Request-ID') || c.req.header('x-request-id') || randomUUID();
  const traceparent = c.req.header('traceparent');
  const route = normalizeHttpRoute(c.req.path);
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  if (traceparent) {
    c.header('traceparent', traceparent);
  }

  // Increment in-flight requests
  httpRequestsInFlight.inc();

  return runWithLogContext({
    request_id: requestId,
    ...(traceparent && { traceparent }),
  }, async () => {
  try {
    // Process request
    await next();

    // Calculate duration
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds

    // Extract app_id from auth context if available
    const auth = c.get('auth');
    const appId = auth?.appId;

    // Track metrics
    trackHttpRequest(
      c.req.method,
      route,
      c.res.status,
      duration,
      appId
    );

    // Log request
    logRequest(
      c.req.method,
      route,
      c.res.status,
      duration * 1000, // Convert back to ms for logging
      { app_id: appId, request_id: requestId }
    );
  } catch (error) {
    // Log error
    const duration = (Date.now() - startTime) / 1000;

    trackHttpRequest(
      c.req.method,
      route,
      500,
      duration
    );

    logRequest(
      c.req.method,
      route,
      500,
      duration * 1000,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId,
      }
    );

    throw error;
  } finally {
    // Decrement in-flight requests
    httpRequestsInFlight.dec();
  }
  });
};
