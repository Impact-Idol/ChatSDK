/**
 * Metrics Middleware
 * Work Stream 22 - TIER 4
 *
 * Tracks HTTP request metrics automatically
 */

import type { MiddlewareHandler } from 'hono';
import { httpRequestsInFlight, trackHttpRequest } from '../services/metrics';
import { logRequest } from '../services/logger';

/**
 * Middleware to track all HTTP requests
 */
export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const startTime = Date.now();

  // Increment in-flight requests
  httpRequestsInFlight.inc();

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
      c.req.path,
      c.res.status,
      duration,
      appId
    );

    // Log request
    logRequest(
      c.req.method,
      c.req.path,
      c.res.status,
      duration * 1000, // Convert back to ms for logging
      { app_id: appId }
    );
  } catch (error) {
    // Log error
    const duration = (Date.now() - startTime) / 1000;

    trackHttpRequest(
      c.req.method,
      c.req.path,
      500,
      duration
    );

    logRequest(
      c.req.method,
      c.req.path,
      500,
      duration * 1000,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    throw error;
  } finally {
    // Decrement in-flight requests
    httpRequestsInFlight.dec();
  }
};
