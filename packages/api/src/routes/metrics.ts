/**
 * Metrics & Health Routes
 * Work Stream 22 - TIER 4
 *
 * Exposes Prometheus metrics and health check endpoints
 */

import { Hono } from 'hono';
import { getMetrics } from '../services/metrics';
import { db } from '../services/database';
import logger from '../services/logger';

export const metricsRoutes = new Hono();

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
metricsRoutes.get('/', async (c) => {
  try {
    const metrics = await getMetrics();
    return c.text(metrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate metrics');
    return c.text('Error generating metrics', 500);
  }
});

/**
 * Health check endpoint (basic)
 * GET /health
 */
metricsRoutes.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
metricsRoutes.get('/health/detailed', async (c) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown' as 'ok' | 'error', message: '' },
      memory: { status: 'ok' as 'ok' | 'warning', usage: 0, limit: 0 },
    },
  };

  // Check database connection
  try {
    await db.query('SELECT 1');
    health.checks.database = { status: 'ok', message: 'Connected' };
  } catch (error: any) {
    health.status = 'error';
    health.checks.database = {
      status: 'error',
      message: error.message || 'Connection failed',
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

  health.checks.memory = {
    status: heapUsedMB / heapTotalMB > 0.9 ? 'warning' : 'ok',
    usage: Math.round(heapUsedMB),
    limit: Math.round(heapTotalMB),
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  return c.json(health, statusCode);
});

/**
 * Readiness probe (for Kubernetes)
 * GET /ready
 */
metricsRoutes.get('/ready', async (c) => {
  try {
    // Check if database is accessible
    await db.query('SELECT 1');

    // Check if critical services are initialized
    // Add more checks as needed

    return c.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error }, 'Readiness check failed');

    return c.json(
      {
        ready: false,
        error: error.message || 'Service not ready',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

/**
 * Liveness probe (for Kubernetes)
 * GET /live
 */
metricsRoutes.get('/live', async (c) => {
  // Simple liveness check - just return 200
  return c.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});
