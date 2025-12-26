/**
 * ChatSDK API Server
 * Built with Hono for high-performance HTTP handling
 */

import 'dotenv/config';
import { serve as honoServe } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';

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
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:6007', 'http://localhost:5500'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.route('/tokens', tokenRoutes);

// Inngest webhook handler
app.on(['GET', 'POST', 'PUT'], '/api/inngest', inngestServe({ client: inngest, functions: allFunctions }));

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/users', userRoutes);
app.route('/api/channels', channelRoutes);
app.route('/api/devices', deviceRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/presence', presenceRoutes);

// Channel-specific routes
app.route('/api/channels/:channelId/messages', messageRoutes);
app.route('/api/channels/:channelId/uploads', channelUploadsRoutes);
app.route('/api/channels/:channelId/search', channelSearchRoutes);
app.route('/api/channels/:channelId/presence', channelPresenceRoutes);
app.route('/api/channels/:channelId/messages/:messageId/thread', threadRoutes);
app.route('/api/channels/:channelId/read', receiptRoutes);
app.route('/api/channels/:channelId/receipts', receiptRoutes);
app.route('/api/mentions', mentionRoutes);

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

// 404 handler
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
