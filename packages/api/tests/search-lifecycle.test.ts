import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { searchRoutes } from '../src/routes/search';

const mockDbQuery = vi.fn();
const mockSearchMessages = vi.fn();
const mockGetSuggestions = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockDbQuery(...args),
  },
}));

vi.mock('../src/services/search', () => ({
  searchMessages: (...args: any[]) => mockSearchMessages(...args),
  getSuggestions: (...args: any[]) => mockGetSuggestions(...args),
}));

const APP_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = 'alice';
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';

function testApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('auth', {
      authType: 'user',
      appId: APP_ID,
      userId: USER_ID,
      scopes: ['search:read'],
      user: { id: USER_ID, name: 'Alice' },
    });
    await next();
  });
  app.route('/api/search', searchRoutes);
  return app;
}

describe('search lifecycle and membership hardening', () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockSearchMessages.mockReset();
    mockGetSuggestions.mockReset();
  });

  it('fails closed when a user has no channel memberships', async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });

    const res = await testApp().request('/api/search?q=secret');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ results: [], totalHits: 0 });
    expect(mockSearchMessages).not.toHaveBeenCalled();
  });

  it('hydrates search hits from Postgres and drops hard-deleted stale index hits', async () => {
    mockSearchMessages.mockResolvedValue({
      hits: [
        {
          id: 'soft-deleted',
          channelId: CHANNEL_ID,
          userId: USER_ID,
          userName: 'Alice',
          text: 'stale soft body',
          createdAt: Date.now(),
          _formatted: { text: '<mark>stale</mark> soft body' },
        },
        {
          id: 'hard-deleted',
          channelId: CHANNEL_ID,
          userId: USER_ID,
          userName: 'Alice',
          text: 'hard purged body',
          createdAt: Date.now(),
        },
        {
          id: 'stale-edited',
          channelId: CHANNEL_ID,
          userId: USER_ID,
          userName: 'Alice',
          text: 'old leaked body',
          createdAt: Date.now(),
          _formatted: { text: '<mark>body</mark> from old edit' },
        },
        {
          id: 'live',
          channelId: CHANNEL_ID,
          userId: USER_ID,
          userName: 'Alice',
          text: 'live body',
          createdAt: Date.now(),
          _formatted: { text: '<mark>live</mark> body' },
        },
      ],
      query: 'body',
      processingTimeMs: 3,
      totalHits: 3,
      offset: 0,
      limit: 20,
    });

    mockDbQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM channel_member')) {
        return { rows: [{ channel_id: CHANNEL_ID }] };
      }
      if (sql.includes('FROM message')) {
        return {
          rows: [
            {
              id: 'stale-edited',
              channel_id: CHANNEL_ID,
              user_id: USER_ID,
              user_name: 'Alice Current',
              text: 'edited away',
              deleted_at: null,
              hard_deleted_at: null,
              created_at: '2026-06-08T00:00:30.000Z',
            },
            {
              id: 'live',
              channel_id: CHANNEL_ID,
              user_id: USER_ID,
              user_name: 'Alice Current',
              text: 'live body',
              deleted_at: null,
              hard_deleted_at: null,
              created_at: '2026-06-08T00:01:00.000Z',
            },
          ],
        };
      }
      if (sql.includes('FROM channel')) {
        return { rows: [{ id: CHANNEL_ID, name: 'General' }] };
      }
      return { rows: [] };
    });

    const res = await testApp().request('/api/search?q=body');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results.map((result: any) => result.messageId)).toEqual(['live']);
    expect(body.results[0].userName).toBe('Alice Current');
    expect(body.results[0].text).toBe('live body');
    expect(body.results[0].highlightedText).toBe('live <mark>body</mark>');
    expect(body.totalHits).toBe(1);
  });

  it('hydrates autocomplete candidates before returning suggestions', async () => {
    mockSearchMessages.mockResolvedValue({
      hits: [
        {
          id: 'soft-deleted',
          channelId: CHANNEL_ID,
          userId: USER_ID,
          userName: 'Alice',
          text: 'stale secret',
          createdAt: Date.now(),
          _formatted: { text: '<mark>secret</mark>' },
        },
        {
          id: 'live',
          channelId: CHANNEL_ID,
          userId: USER_ID,
          userName: 'Alice',
          text: 'live safe',
          createdAt: Date.now(),
          _formatted: { text: '<mark>safe</mark>' },
        },
      ],
      query: 'sa',
      processingTimeMs: 3,
      totalHits: 2,
      offset: 0,
      limit: 5,
    });

    mockDbQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM channel_member')) {
        return { rows: [{ channel_id: CHANNEL_ID }] };
      }
      if (sql.includes('FROM message')) {
        return {
          rows: [
            {
              id: 'soft-deleted',
              channel_id: CHANNEL_ID,
              user_id: USER_ID,
              user_name: 'Deleted user abcd1234',
              text: 'legacy deleted secret',
              deleted_at: '2026-06-08T00:00:00.000Z',
              hard_deleted_at: null,
              created_at: '2026-06-08T00:00:00.000Z',
            },
            {
              id: 'live',
              channel_id: CHANNEL_ID,
              user_id: USER_ID,
              user_name: 'Alice Current',
              text: 'live safe',
              deleted_at: null,
              hard_deleted_at: null,
              created_at: '2026-06-08T00:01:00.000Z',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await testApp().request('/api/search/suggestions?q=sa');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.suggestions).toEqual(['sa']);
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });
});
