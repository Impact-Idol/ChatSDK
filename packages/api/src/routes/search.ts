/**
 * Search Routes
 * Message search endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireScope, requireUser } from '../middleware/auth';
import { searchMessages } from '../services/search';
import { db } from '../services/database';
import { isChannelMember } from '../services/authorization';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';

export const searchRoutes = new Hono();

type HydratedSearchHit = Awaited<ReturnType<typeof searchMessages>>['hits'][number];

async function hydrateSearchHits(
  appId: string,
  hits: HydratedSearchHit[],
  allowedChannelIds: string[],
  query: string
): Promise<HydratedSearchHit[]> {
  if (hits.length === 0) {
    return [];
  }

  const hitById = new Map(hits.map((hit) => [hit.id, hit]));
  const ids = [...hitById.keys()];
  const result = await db.query(
    `SELECT m.id, m.channel_id, m.user_id, u.name AS user_name,
            m.text, m.created_at
     FROM message m
     JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
     WHERE m.app_id = $1
       AND m.id = ANY($2)
       AND m.channel_id = ANY($3)
       AND m.deleted_at IS NULL
       AND m.hard_deleted_at IS NULL`,
    [appId, ids, allowedChannelIds]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleById = new Map(result.rows.map((row) => [row.id, row]));
  return hits.flatMap((hit) => {
    const row = visibleById.get(hit.id);
    if (!row) {
      return [];
    }

    const text = String(row.text ?? '');
    if (normalizedQuery && !text.toLowerCase().includes(normalizedQuery)) {
      return [];
    }

    return [{
      ...hit,
      channelId: row.channel_id,
      userId: row.user_id,
      userName: row.user_name,
      text,
      createdAt: new Date(row.created_at).getTime(),
      _formatted: buildFormattedText(text, normalizedQuery),
    }];
  });
}

function suggestionsFromHydratedHits(hits: HydratedSearchHit[], limit = 5): string[] {
  const suggestions = new Set<string>();
  for (const hit of hits) {
    const matches = hit._formatted?.text?.match(/<mark>([^<]+)<\/mark>/g);
    if (!matches) {
      continue;
    }
    for (const match of matches) {
      suggestions.add(match.replace(/<\/?mark>/g, '').toLowerCase());
      if (suggestions.size >= limit) {
        return [...suggestions];
      }
    }
  }
  return [...suggestions];
}

function buildFormattedText(text: string, normalizedQuery: string): { text?: string } | undefined {
  if (!normalizedQuery) {
    return undefined;
  }

  const index = text.toLowerCase().indexOf(normalizedQuery);
  if (index === -1) {
    return undefined;
  }

  const before = escapeHtml(text.slice(0, index));
  const match = escapeHtml(text.slice(index, index + normalizedQuery.length));
  const after = escapeHtml(text.slice(index + normalizedQuery.length));
  return { text: `${before}<mark>${match}</mark>${after}` };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

searchRoutes.get(
  '/',
  requireUser,
  requireScope('search:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.search, (c) => ({ channelId: c.req.query('channelId') })),
  zValidator('query', searchQuerySchema),
  async (c) => {
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

  if (!query.channelId && memberChannelIds.length === 0) {
    return c.json({
      results: [],
      query: query.q,
      totalHits: 0,
      processingTimeMs: 0,
      offset: query.offset,
      limit: query.limit,
    });
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
  const allowedChannelIds = query.channelId ? [query.channelId] : memberChannelIds;
  const hits = await hydrateSearchHits(auth.appId, results.hits, allowedChannelIds, query.q);

  // Fetch channel names for results
  const channelIds = [...new Set(hits.map((h) => h.channelId))];
  const channelNames: Record<string, string> = {};

  if (channelIds.length > 0) {
    const channels = await db.query(
      `SELECT id, name FROM channel WHERE app_id = $1 AND id = ANY($2)`,
      [auth.appId, channelIds]
    );
    for (const ch of channels.rows) {
      channelNames[ch.id] = ch.name || 'Untitled';
    }
  }

    return c.json({
      results: hits.map((hit) => ({
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
      totalHits: hits.length,
      processingTimeMs: results.processingTimeMs,
      offset: results.offset,
      limit: results.limit,
    });
  }
);

/**
 * Get search suggestions (autocomplete)
 * GET /api/search/suggestions
 */
searchRoutes.get(
  '/suggestions',
  requireUser,
  requireScope('search:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.search, (c) => ({ channelId: c.req.query('channelId') })),
  async (c) => {
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

  if (channelId && !(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  if (channelIds.length === 0) {
    return c.json({ suggestions: [] });
  }

  const results = await searchMessages(auth.appId, query, {
    limit: 5,
    filters: { channelIds },
  });
  const hits = await hydrateSearchHits(auth.appId, results.hits, channelIds, query);
  const suggestions = suggestionsFromHydratedHits(hits, 5);

    return c.json({ suggestions });
  }
);

/**
 * Search within a specific channel
 * GET /api/channels/:channelId/search
 */
export const channelSearchRoutes = new Hono();

channelSearchRoutes.get(
  '/',
  requireUser,
  requireScope('search:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.search, (c) => ({ channelId: c.req.param('channelId') })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  if (!query) {
    return c.json({ results: [], totalHits: 0 });
  }

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  const results = await searchMessages(auth.appId, query, {
    limit,
    offset,
    filters: { channelId },
  });
  const hits = await hydrateSearchHits(auth.appId, results.hits, [channelId], query);

    return c.json({
      results: hits.map((hit) => ({
        messageId: hit.id,
        userId: hit.userId,
        userName: hit.userName,
        text: hit.text,
        highlightedText: hit._formatted?.text,
        createdAt: new Date(hit.createdAt).toISOString(),
      })),
      query: results.query,
      totalHits: hits.length,
      processingTimeMs: results.processingTimeMs,
    });
  }
);
