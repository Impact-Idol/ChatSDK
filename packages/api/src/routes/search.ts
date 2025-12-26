/**
 * Search Routes
 * Message search endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { searchMessages, getSuggestions } from '../services/search';
import { db } from '../services/database';

export const searchRoutes = new Hono();

/**
 * Search messages
 * GET /api/search
 */
const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  channelId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

searchRoutes.get('/', requireUser, zValidator('query', searchQuerySchema), async (c) => {
  const auth = c.get('auth');
  const query = c.req.valid('query');

  // Get user's channel memberships for filtering
  const memberships = await db.query(
    `SELECT channel_id FROM channel_member WHERE app_id = $1 AND user_id = $2`,
    [auth.appId, auth.userId]
  );

  const memberChannelIds = memberships.rows.map((r) => r.channel_id);

  // If searching a specific channel, verify membership
  if (query.channelId && !memberChannelIds.includes(query.channelId)) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  const results = await searchMessages(auth.appId, query.q, {
    limit: query.limit,
    offset: query.offset,
    filters: {
      channelId: query.channelId,
      channelIds: query.channelId ? undefined : memberChannelIds,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    },
  });

  // Fetch channel names for results
  const channelIds = [...new Set(results.hits.map((h) => h.channelId))];
  const channelNames: Record<string, string> = {};

  if (channelIds.length > 0) {
    const channels = await db.query(
      `SELECT id, name FROM channel WHERE id = ANY($1)`,
      [channelIds]
    );
    for (const ch of channels.rows) {
      channelNames[ch.id] = ch.name || 'Untitled';
    }
  }

  return c.json({
    results: results.hits.map((hit) => ({
      messageId: hit.id,
      channelId: hit.channelId,
      channelName: channelNames[hit.channelId] || 'Unknown',
      userId: hit.userId,
      userName: hit.userName,
      text: hit.text,
      highlightedText: hit._formatted?.text,
      createdAt: new Date(hit.createdAt).toISOString(),
    })),
    query: results.query,
    totalHits: results.totalHits,
    processingTimeMs: results.processingTimeMs,
    offset: results.offset,
    limit: results.limit,
  });
});

/**
 * Get search suggestions (autocomplete)
 * GET /api/search/suggestions
 */
searchRoutes.get('/suggestions', requireUser, async (c) => {
  const auth = c.get('auth');
  const query = c.req.query('q') || '';
  const channelId = c.req.query('channelId');

  if (query.length < 2) {
    return c.json({ suggestions: [] });
  }

  // Get user's channels
  const memberships = await db.query(
    `SELECT channel_id FROM channel_member WHERE app_id = $1 AND user_id = $2`,
    [auth.appId, auth.userId]
  );

  const channelIds = channelId
    ? [channelId]
    : memberships.rows.map((r) => r.channel_id);

  const suggestions = await getSuggestions(auth.appId, query, channelIds);

  return c.json({ suggestions });
});

/**
 * Search within a specific channel
 * GET /api/channels/:channelId/search
 */
export const channelSearchRoutes = new Hono();

channelSearchRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  if (!query) {
    return c.json({ results: [], totalHits: 0 });
  }

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  const results = await searchMessages(auth.appId, query, {
    limit,
    offset,
    filters: { channelId },
  });

  return c.json({
    results: results.hits.map((hit) => ({
      messageId: hit.id,
      userId: hit.userId,
      userName: hit.userName,
      text: hit.text,
      highlightedText: hit._formatted?.text,
      createdAt: new Date(hit.createdAt).toISOString(),
    })),
    query: results.query,
    totalHits: results.totalHits,
    processingTimeMs: results.processingTimeMs,
  });
});
