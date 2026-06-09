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
  'SEARCH_INDEX_OUTBOX_STALE_LOCK_SECONDS',
];
const originalEnv = new Map(ENV_KEYS.map(key => [key, process.env[key]]));
const mockDbQuery = vi.fn();
const addDocuments = vi.fn();
const waitForTask = vi.fn();

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function setEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://user:password@db.example.internal:5432/chatsdk';
  process.env.JWT_SECRET = '0123456789abcdefABCDEF!@#$%^&*()0123456789abcdef';
  process.env.CENTRIFUGO_TOKEN_SECRET = 'fedcba9876543210FEDCBA)(*&^%$#@!fedcba9876543210';
  process.env.CENTRIFUGO_API_URL = 'http://centrifugo:8000/api';
  process.env.CENTRIFUGO_API_KEY = '89abcdef01234567ABCDEF!@#$%^&*()89abcdef01234567';
  process.env.ALLOWED_ORIGINS = 'https://chat.example.com';
  process.env.CENTRIFUGO_ALLOWED_ORIGINS = 'https://chat.example.com';
  process.env.MEILISEARCH_HOST = 'https://search.example.internal';
  process.env.MEILISEARCH_API_KEY = 'valid-looking-search-key-0123456789abcdef';
}

vi.doMock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockDbQuery(...args),
    withSystemContext: (fn: any) => fn(),
  },
}));

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
        updateDocuments: addDocuments,
        deleteDocument: vi.fn().mockResolvedValue({ taskUid: 3 }),
        waitForTask,
      })),
      createIndex: vi.fn().mockResolvedValue({}),
    };
  }),
}));

describe('search index outbox', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    restoreEnv();
  });

  it('enqueues failed indexing work for later catch-up', async () => {
    setEnv();
    addDocuments.mockRejectedValueOnce(new Error('meili down'));
    waitForTask.mockResolvedValue({ status: 'succeeded' });
    mockDbQuery.mockResolvedValue({ rows: [] });

    const { initSearch, indexMessage } = await import('../src/services/search');

    await initSearch();
    await indexMessage({
      id: '11111111-1111-4111-8111-111111111111',
      appId: '00000000-0000-0000-0000-000000000001',
      channelId: '22222222-2222-4222-8222-222222222222',
      userId: 'alice',
      userName: 'Alice',
      text: 'catch up later',
      createdAt: Date.now(),
    });

    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO search_index_outbox'),
      expect.arrayContaining([
        '00000000-0000-0000-0000-000000000001',
        '11111111-1111-4111-8111-111111111111',
        'index',
      ])
    );
  });

  it('drains pending search work by hydrating current Postgres message state', async () => {
    setEnv();
    addDocuments.mockResolvedValue({ taskUid: 10 });
    waitForTask.mockResolvedValue({ status: 'succeeded' });
    mockDbQuery.mockImplementation((sql: string) => {
      if (sql.includes('WITH due AS')) {
        return {
          rows: [{
            id: 'outbox-1',
            app_id: '00000000-0000-0000-0000-000000000001',
            message_id: '11111111-1111-4111-8111-111111111111',
            operation: 'index',
            attempts: 0,
          }],
        };
      }
      if (sql.includes('FROM message m')) {
        return {
          rows: [{
            id: '11111111-1111-4111-8111-111111111111',
            channel_id: '22222222-2222-4222-8222-222222222222',
            app_id: '00000000-0000-0000-0000-000000000001',
            user_id: 'alice',
            user_name: 'Alice Current',
            text: 'restored current text',
            attachments: [{ type: 'image' }],
            created_at: '2026-06-08T18:00:00.000Z',
          }],
        };
      }
      return { rows: [] };
    });

    const { initSearch, processPendingSearchIndexOperations } = await import('../src/services/search');

    await initSearch();
    const result = await processPendingSearchIndexOperations();

    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
    expect(addDocuments).toHaveBeenCalledWith([expect.objectContaining({
      id: '11111111-1111-4111-8111-111111111111',
      text: 'restored current text',
      userName: 'Alice Current',
      attachmentTypes: ['image'],
    })]);
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'completed'"),
      ['outbox-1']
    );
  });

  it('reclaims stale processing search work after a worker crash', async () => {
    setEnv();
    process.env.SEARCH_INDEX_OUTBOX_STALE_LOCK_SECONDS = '60';
    addDocuments.mockResolvedValue({ taskUid: 10 });
    waitForTask.mockResolvedValue({ status: 'succeeded' });
    mockDbQuery.mockImplementation((sql: string) => {
      if (sql.includes('WITH due AS')) {
        return {
          rows: [{
            id: 'outbox-stale-1',
            app_id: '00000000-0000-0000-0000-000000000001',
            message_id: '11111111-1111-4111-8111-111111111111',
            operation: 'update',
            attempts: 2,
          }],
        };
      }
      if (sql.includes('FROM message m')) {
        return {
          rows: [{
            id: '11111111-1111-4111-8111-111111111111',
            channel_id: '22222222-2222-4222-8222-222222222222',
            app_id: '00000000-0000-0000-0000-000000000001',
            user_id: 'alice',
            user_name: 'Alice',
            text: 'reclaimed after restart',
            attachments: [],
            created_at: '2026-06-08T18:00:00.000Z',
          }],
        };
      }
      return { rows: [] };
    });

    const { initSearch, processPendingSearchIndexOperations } = await import('../src/services/search');

    await initSearch();
    await processPendingSearchIndexOperations(25);

    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'processing'"),
      [25, 60]
    );
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("locked_at <= NOW() - (($2 || ' seconds')::interval)"),
      [25, 60]
    );
  });
});
