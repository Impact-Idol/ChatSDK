import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'CENTRIFUGO_TOKEN_SECRET',
  'CENTRIFUGO_API_URL',
  'CENTRIFUGO_API_KEY',
  'ALLOWED_ORIGINS',
  'CENTRIFUGO_ALLOWED_ORIGINS',
  'MEILISEARCH_HOST',
  'MEILISEARCH_API_KEY',
];

const originalEnv = new Map(ENV_KEYS.map(key => [key, process.env[key]]));

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function setSearchEnv(nodeEnv = 'test'): void {
  process.env.NODE_ENV = nodeEnv;
  process.env.DATABASE_URL = 'postgresql://user:password@db.example.internal:5432/chatsdk';
  process.env.JWT_SECRET = '0123456789abcdefABCDEF!@#$%^&*()0123456789abcdef';
  process.env.CENTRIFUGO_TOKEN_SECRET = 'fedcba9876543210FEDCBA)(*&^%$#@!fedcba9876543210';
  process.env.CENTRIFUGO_API_URL = 'http://centrifugo:8000/api';
  process.env.CENTRIFUGO_API_KEY = '89abcdef01234567ABCDEF!@#$%^&*()89abcdef01234567';
  process.env.ALLOWED_ORIGINS = 'https://chat.example.com';
  process.env.CENTRIFUGO_ALLOWED_ORIGINS = 'https://chat.example.com';
  process.env.MEILISEARCH_HOST = 'https://search.example.internal';
  process.env.MEILISEARCH_API_KEY = 'valid-looking-search-key';
}

describe('search health', () => {
  afterEach(() => {
    vi.doUnmock('meilisearch');
    vi.resetModules();
    restoreEnv();
  });

  it('uses an authenticated index operation instead of public Meilisearch health', async () => {
    setSearchEnv();
    const health = vi.fn().mockResolvedValue({ status: 'available' });
    const getStats = vi.fn().mockResolvedValue({});
    const getSettings = vi.fn().mockResolvedValue({
      filterableAttributes: ['channelId', 'appId', 'userId', 'createdAt', 'attachmentTypes'],
      sortableAttributes: ['createdAt'],
    });
    vi.doMock('meilisearch', () => ({
      MeiliSearch: vi.fn(function MeiliSearch() {
        return {
        health,
        index: vi.fn(() => ({
          getStats,
          getSettings,
        })),
        };
      }),
    }));

    const { checkSearchHealth } = await import('../src/services/search');
    const result = await checkSearchHealth();

    expect(result).toEqual({ status: 'ok' });
    expect(getStats).toHaveBeenCalledOnce();
    expect(getSettings).toHaveBeenCalledOnce();
    expect(health).not.toHaveBeenCalled();
  });

  it('fails readiness when required Meilisearch settings cannot be verified', async () => {
    setSearchEnv();
    vi.doMock('meilisearch', () => ({
      MeiliSearch: vi.fn(function MeiliSearch() {
        return {
        index: vi.fn(() => ({
          getStats: vi.fn().mockResolvedValue({}),
          getSettings: vi.fn().mockResolvedValue({
            filterableAttributes: [],
            sortableAttributes: [],
          }),
          updateSettings: vi.fn().mockRejectedValue(new Error('settings rejected')),
        })),
        };
      }),
    }));

    const { checkSearchHealth } = await import('../src/services/search');
    const result = await checkSearchHealth();

    expect(result).toEqual({
      status: 'error',
      message: 'Meilisearch authenticated health check failed',
    });
  });

  it('fails authenticated readiness when the configured key cannot access the index', async () => {
    setSearchEnv();
    vi.doMock('meilisearch', () => ({
      MeiliSearch: vi.fn(function MeiliSearch() {
        return {
        index: vi.fn(() => ({
          getStats: vi.fn().mockRejectedValue(new Error('invalid api key')),
          getSettings: vi.fn(),
        })),
        };
      }),
    }));

    const { checkSearchHealth } = await import('../src/services/search');
    const result = await checkSearchHealth();

    expect(result).toEqual({
      status: 'error',
      message: 'Meilisearch authenticated health check failed',
    });
  });

  it('allows production startup during Meilisearch initialization failures', async () => {
    setSearchEnv('production');
    vi.doMock('meilisearch', () => ({
      MeiliSearch: vi.fn(function MeiliSearch() {
        return {
        index: vi.fn(() => ({
          getStats: vi.fn().mockRejectedValue(new Error('invalid api key')),
          getSettings: vi.fn(),
        })),
        createIndex: vi.fn().mockRejectedValue(new Error('invalid api key')),
        };
      }),
    }));

    const { initSearch } = await import('../src/services/search');

    await expect(initSearch()).resolves.toBeUndefined();
  });

  it('treats an empty channel filter as no visible search results', async () => {
    setSearchEnv();
    const search = vi.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 1 });
    vi.doMock('meilisearch', () => ({
      MeiliSearch: vi.fn(function MeiliSearch() {
        return {
        index: vi.fn(() => ({
          getStats: vi.fn().mockResolvedValue({}),
          getSettings: vi.fn().mockResolvedValue({
            filterableAttributes: ['channelId', 'appId', 'userId', 'createdAt', 'attachmentTypes'],
            sortableAttributes: ['createdAt'],
          }),
          updateSettings: vi.fn().mockResolvedValue({ taskUid: 1 }),
          waitForTask: vi.fn().mockResolvedValue({ status: 'succeeded' }),
          search,
        })),
        createIndex: vi.fn().mockResolvedValue({}),
        };
      }),
    }));

    const { initSearch, searchMessages } = await import('../src/services/search');
    await initSearch();
    const result = await searchMessages('00000000-0000-0000-0000-000000000001', 'secret', {
      filters: { channelIds: [] },
    });

    expect(result.hits).toEqual([]);
    expect(result.totalHits).toBe(0);
    expect(search).not.toHaveBeenCalled();
  });

  it('records failed Meilisearch indexing tasks as index failures', async () => {
    setSearchEnv();
    const addDocuments = vi.fn().mockResolvedValue({ taskUid: 42 });
    const waitForTask = vi.fn().mockResolvedValue({ status: 'failed' });
    vi.doMock('meilisearch', () => ({
      MeiliSearch: vi.fn(function MeiliSearch() {
        return {
        index: vi.fn(() => ({
          getStats: vi.fn().mockResolvedValue({}),
          getSettings: vi.fn().mockResolvedValue({
            filterableAttributes: ['channelId', 'appId', 'userId', 'createdAt', 'attachmentTypes'],
            sortableAttributes: ['createdAt'],
          }),
          updateSettings: vi.fn().mockResolvedValue({ taskUid: 1 }),
          addDocuments,
          waitForTask,
        })),
        createIndex: vi.fn().mockResolvedValue({}),
        };
      }),
    }));

    const { initSearch, indexMessage } = await import('../src/services/search');
    const { getMetrics } = await import('../src/services/metrics');

    await initSearch();
    await indexMessage({
      id: 'message-1',
      appId: 'app-search',
      channelId: 'channel-1',
      userId: 'user-1',
      userName: 'Alice',
      text: 'hello',
      createdAt: Date.now(),
    });

    const metrics = await getMetrics();

    expect(waitForTask).toHaveBeenCalledWith(42, { timeOutMs: 5000, intervalMs: 100 });
    expect(metrics).toContain('chatsdk_search_index_operations_total');
    expect(metrics).toContain('app_id="app-search",operation="index",result="failure"');
  });
});
