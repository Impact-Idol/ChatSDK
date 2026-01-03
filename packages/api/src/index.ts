/**
 * ChatSDK API Server
 * Built with Hono for high-performance HTTP handling
 */

import 'dotenv/config';
import { serve as honoServe } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';
import path from 'path';
import { fileURLToPath } from 'url';

import { authMiddleware } from './middleware/auth';
import { channelRoutes } from './routes/channels';
import { messageRoutes } from './routes/messages';
import { userRoutes } from './routes/users';
import { tokenRoutes } from './routes/tokens';
import { deviceRoutes } from './routes/devices';
import { uploadRoutes, channelUploadsRoutes } from './routes/uploads';
import { searchRoutes, channelSearchRoutes } from './routes/search';
import { presenceRoutes, channelPresenceRoutes } from './routes/presence';
import { threadRoutes } from './routes/threads';
import { receiptRoutes } from './routes/receipts';
import { mentionRoutes } from './routes/mentions';
import { webPushRoutes } from './routes/webpush';
import { workspaceRoutes } from './routes/workspaces';
import { pollRoutes } from './routes/polls';
import { moderationRoutes } from './routes/moderation';
import { adminRoutes } from './routes/admin';
import { supervisionRoutes } from './routes/supervision';
import { enrollmentRoutes } from './routes/enrollment';
import { templatesRoutes } from './routes/templates';
import { emojiRoutes } from './routes/emoji';
import { webhooksRoutes } from './routes/webhooks';
import { metricsRoutes } from './routes/metrics';
import { metricsMiddleware } from './middleware/metrics';
import { db, initDB } from './services/database';
import { initCentrifugo } from './services/centrifugo';
import { initNovu } from './services/novu';
import { initStorage } from './services/storage';
import { initSearch } from './services/search';
import { inngest, allFunctions } from './inngest';
import { serve as inngestServe } from 'inngest/hono';

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', timing());
app.use('*', prettyJSON());
app.use('*', metricsMiddleware);

// Manual CORS middleware
app.use('*', async (c, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5175',
    'http://localhost:6007',
    'http://localhost:6001',
    'http://localhost:5500',
    'http://localhost:5502'
  ];

  const origin = c.req.header('Origin');

  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

// Metrics & Health routes (public, no auth required)
app.route('/', metricsRoutes);

// Public routes
app.route('/tokens', tokenRoutes);

// Admin routes (uses own authentication middleware)
app.route('/admin', adminRoutes);

// Inngest webhook handler with development mode guard
app.use('/api/inngest', async (c, next) => {
  const eventKey = process.env.INNGEST_EVENT_KEY || '';
  const signingKey = process.env.INNGEST_SIGNING_KEY || '';

  // Check if using test/dummy keys (development mode)
  if (eventKey.includes('test_') || signingKey.includes('test_')) {
    const method = c.req.method;
    if (method === 'PUT') {
      // Inngest probe request - return success to stop spam
      return c.json({ ok: true, message: 'Development mode - using test keys' }, 200);
    }
  }

  await next();
});

app.on(['GET', 'POST', 'PUT'], '/api/inngest', inngestServe({ client: inngest, functions: allFunctions }));

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/users', userRoutes);
app.route('/api/channels', channelRoutes);
app.route('/api/devices', deviceRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/presence', presenceRoutes);
app.route('/api/webpush', webPushRoutes);
app.route('/api/workspaces', workspaceRoutes);
app.route('/api/moderation', moderationRoutes);

// Channel-specific routes
app.route('/api/channels/:channelId/messages', messageRoutes);
app.route('/api/channels/:channelId/uploads', channelUploadsRoutes);
app.route('/api/channels/:channelId/search', channelSearchRoutes);
app.route('/api/channels/:channelId/presence', channelPresenceRoutes);
app.route('/api/channels/:channelId/messages/:messageId/thread', threadRoutes);
app.route('/api/channels/:channelId/messages/:messageId/polls', pollRoutes);
app.route('/api/channels/:channelId/read', receiptRoutes);
app.route('/api/channels/:channelId/receipts', receiptRoutes);
app.route('/api/mentions', mentionRoutes);
app.route('/api/polls', pollRoutes);

// TIER 3 Routes (Competitive Differentiators)
app.route('/api/users', supervisionRoutes); // Supervision routes are under /api/users/:userId/supervise
app.route('/api/enrollment', enrollmentRoutes);
app.route('/api/templates', templatesRoutes);
app.route('/api/emoji', emojiRoutes);

// TIER 4 Routes (Developer Experience)
app.route('/api/webhooks', webhooksRoutes);

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      error: {
        message: err.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
});

// Serve React app static files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactAppPath = path.resolve(__dirname, '../../../examples/react-chat/dist');

app.use('/*', serveStatic({ root: reactAppPath }));

// SPA fallback - serve index.html for non-API routes
app.get('*', serveStatic({ path: reactAppPath + '/index.html' }));

// 404 handler for API routes (this won't be reached due to SPA fallback)
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: 'Not Found',
        code: 'NOT_FOUND',
      },
    },
    404
  );
});

// Start server
const port = parseInt(process.env.PORT || '5500', 10);

async function main() {
  try {
    // Initialize database connection
    await initDB();
    console.log('Database connected');

    // Initialize Centrifugo client
    await initCentrifugo();
    console.log('Centrifugo connected');

    // Initialize Novu client (optional - for push notifications)
    await initNovu();
    console.log('Novu initialized');

    // Initialize MinIO storage
    await initStorage();
    console.log('Storage initialized');

    // Initialize Meilisearch
    await initSearch();
    console.log('Search initialized');

    // Start HTTP server
    honoServe({
      fetch: app.fetch,
      port,
    });

    console.log(`API server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export { app };
