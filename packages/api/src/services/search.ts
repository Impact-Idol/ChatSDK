/**
 * Search Service
 * Meilisearch integration for message search
 */

import { MeiliSearch, Index } from 'meilisearch';
import { config } from '../config/defaults';
import {
  trackSearchIndexOperation,
  trackSearchQuery,
} from './metrics';
import logger from './logger';
import { db } from './database';

const SEARCH_INDEX = 'messages';
const searchConfigured = Boolean(config.meilisearch.host);
function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const SEARCH_TASK_TIMEOUT_MS = parsePositiveInteger(process.env.SEARCH_TASK_TIMEOUT_MS, 5000);
const DEFAULT_SEARCH_OUTBOX_INTERVAL_MS = 5000;
const DEFAULT_SEARCH_OUTBOX_LIMIT = 50;
const DEFAULT_SEARCH_OUTBOX_MAX_ATTEMPTS = 10;
const DEFAULT_SEARCH_OUTBOX_STALE_LOCK_SECONDS = 300;
const SEARCH_SETTINGS = {
  searchableAttributes: ['text', 'userName'],
  filterableAttributes: ['channelId', 'appId', 'userId', 'createdAt', 'attachmentTypes'],
  sortableAttributes: ['createdAt'],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'createdAt:desc',
  ],
};

// Initialize Meilisearch client only when explicitly configured or using local defaults.
const client = searchConfigured
  ? new MeiliSearch({
    host: config.meilisearch.host,
    apiKey: config.meilisearch.apiKey || undefined,
  })
  : null;

export interface SearchableMessage {
  id: string;
  channelId: string;
  appId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  attachmentTypes?: string[];
}

export interface SearchFilters {
  channelId?: string;
  channelIds?: string[];
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  hasAttachments?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  highlightPreTag?: string;
  highlightPostTag?: string;
}

export interface SearchResultHit {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  _formatted?: {
    text?: string;
  };
}

export interface SearchResults {
  hits: SearchResultHit[];
  query: string;
  processingTimeMs: number;
  totalHits: number;
  offset: number;
  limit: number;
}

let messagesIndex: Index<SearchableMessage> | null = null;
let searchOutboxTimer: NodeJS.Timeout | null = null;
let searchOutboxInFlight = false;

type SearchIndexOperation = 'index' | 'update' | 'delete';
type SearchOutboxQueryClient = {
  query: (text: string, params?: any[]) => Promise<unknown>;
};

interface SearchIndexOutboxRow {
  id: string;
  app_id: string;
  message_id: string;
  operation: SearchIndexOperation;
  attempts: number;
}

async function waitForSearchTask(task: { taskUid?: number }, operation: string): Promise<void> {
  if (!messagesIndex || task.taskUid === undefined) {
    return;
  }

  const result = await messagesIndex.waitForTask(task.taskUid, {
    timeOutMs: SEARCH_TASK_TIMEOUT_MS,
    intervalMs: 100,
  });
  if (result.status === 'failed' || result.status === 'canceled') {
    throw new Error(`Meilisearch ${operation} task ${result.status}`);
  }
}

function containsAll(values: unknown, required: string[]): boolean {
  return Array.isArray(values) && required.every((value) => values.includes(value));
}

async function ensureSearchSettings(): Promise<void> {
  if (!messagesIndex) {
    throw new Error('Meilisearch index is not initialized');
  }

  const settings = await messagesIndex.getSettings();
  if (
    containsAll(settings.filterableAttributes, SEARCH_SETTINGS.filterableAttributes)
    && containsAll(settings.sortableAttributes, SEARCH_SETTINGS.sortableAttributes)
  ) {
    return;
  }

  const task = await messagesIndex.updateSettings(SEARCH_SETTINGS);
  await waitForSearchTask(task, 'settings');
}

async function enqueueSearchIndexOperation(
  appId: string | undefined,
  messageId: string,
  operation: SearchIndexOperation,
  error?: unknown
): Promise<void> {
  if (!searchConfigured || !appId) {
    return;
  }

  try {
    await db.withSystemContext(() =>
      enqueueSearchIndexOperationTx(db, appId, messageId, operation, error)
    );
  } catch (queueError) {
    logger.error({ error: queueError, app_id: appId, message_id: messageId, operation }, 'Failed to enqueue search index outbox row');
  }
}

export async function enqueueSearchIndexOperationTx(
  client: SearchOutboxQueryClient,
  appId: string,
  messageId: string,
  operation: SearchIndexOperation,
  error?: unknown
): Promise<void> {
  await client.query(
    `INSERT INTO search_index_outbox (app_id, message_id, operation, status, last_error)
     VALUES ($1, $2, $3, 'pending', $4)
     ON CONFLICT (app_id, message_id, operation)
       WHERE status IN ('pending', 'processing', 'failed')
     DO UPDATE SET
       status = 'pending',
       next_attempt_at = NOW(),
       last_error = EXCLUDED.last_error,
       updated_at = NOW()`,
    [
      appId,
      messageId,
      operation,
      error instanceof Error ? error.message : error ? String(error) : null,
    ]
  );
}

export interface SearchHealth {
  status: 'ok' | 'error' | 'skipped';
  message?: string;
}

export function isSearchConfigured(): boolean {
  return searchConfigured;
}

async function executeSearchIndexOperation(row: SearchIndexOutboxRow): Promise<void> {
  if (!messagesIndex) {
    throw new Error('Meilisearch index is not initialized');
  }

  if (row.operation === 'delete') {
    const task = await messagesIndex.deleteDocument(row.message_id);
    await waitForSearchTask(task, 'delete');
    return;
  }

  const message = await db.withSystemContext(async () => {
    const result = await db.query<{
      id: string;
      channel_id: string;
      app_id: string;
      user_id: string;
      user_name: string | null;
      text: string | null;
      attachments: any;
      created_at: string | Date;
    }>(
      `SELECT m.id, m.channel_id, m.app_id, m.user_id, u.name AS user_name,
              m.text, m.attachments, m.created_at
       FROM message m
       LEFT JOIN app_user u ON u.app_id = m.app_id AND u.id = m.user_id
       WHERE m.id = $1
         AND m.app_id = $2
         AND m.deleted_at IS NULL
         AND m.hard_deleted_at IS NULL`,
      [row.message_id, row.app_id]
    );
    return result.rows[0];
  });

  if (!message) {
    const task = await messagesIndex.deleteDocument(row.message_id);
    await waitForSearchTask(task, 'delete_missing');
    return;
  }

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const searchable: SearchableMessage = {
    id: message.id,
    channelId: message.channel_id,
    appId: message.app_id,
    userId: message.user_id,
    userName: message.user_name || message.user_id,
    text: message.text || '',
    createdAt: new Date(message.created_at).getTime(),
    attachmentTypes: attachments.map((attachment: any) => attachment.type).filter(Boolean),
  };

  const task = row.operation === 'update'
    ? await messagesIndex.updateDocuments([searchable])
    : await messagesIndex.addDocuments([searchable]);
  await waitForSearchTask(task, row.operation);
}

export async function processPendingSearchIndexOperations(
  limit = DEFAULT_SEARCH_OUTBOX_LIMIT
): Promise<{ claimed: number; completed: number; failed: number }> {
  if (!searchConfigured || !messagesIndex) {
    return { claimed: 0, completed: 0, failed: 0 };
  }

  const rows = await db.withSystemContext(async () => {
    const staleLockSeconds = parsePositiveInteger(
      process.env.SEARCH_INDEX_OUTBOX_STALE_LOCK_SECONDS,
      DEFAULT_SEARCH_OUTBOX_STALE_LOCK_SECONDS
    );
    const result = await db.query<SearchIndexOutboxRow>(
      `WITH due AS (
         SELECT id
         FROM search_index_outbox
         WHERE (
             status IN ('pending', 'failed')
             AND next_attempt_at <= NOW()
           )
           OR (
             status = 'processing'
             AND locked_at <= NOW() - (($2 || ' seconds')::interval)
           )
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE search_index_outbox o
       SET status = 'processing',
           locked_at = NOW(),
           updated_at = NOW()
       FROM due
       WHERE o.id = due.id
       RETURNING o.id::text, o.app_id::text, o.message_id::text, o.operation, o.attempts`,
      [limit, staleLockSeconds]
    );
    return result.rows;
  });

  let completed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await executeSearchIndexOperation(row);
      await db.withSystemContext(() =>
        db.query(
          `UPDATE search_index_outbox
           SET status = 'completed',
               completed_at = NOW(),
               updated_at = NOW(),
               last_error = NULL
           WHERE id = $1`,
          [row.id]
        )
      );
      completed += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      await db.withSystemContext(() =>
        db.query(
          `UPDATE search_index_outbox
           SET status = 'failed',
               attempts = $2,
               next_attempt_at = NOW() + (($3 || ' seconds')::interval),
               updated_at = NOW(),
               last_error = $4
           WHERE id = $1`,
          [
            row.id,
            attempts,
            Math.min(300, Math.pow(2, Math.min(attempts, DEFAULT_SEARCH_OUTBOX_MAX_ATTEMPTS))),
            error instanceof Error ? error.message : String(error),
          ]
        )
      );
      failed += 1;
    }
  }

  return { claimed: rows.length, completed, failed };
}

export function startSearchIndexOutboxWorker(): void {
  if (!searchConfigured || searchOutboxTimer) {
    return;
  }

  const intervalMs = parsePositiveInteger(
    process.env.SEARCH_INDEX_OUTBOX_INTERVAL_MS,
    DEFAULT_SEARCH_OUTBOX_INTERVAL_MS
  );
  searchOutboxTimer = setInterval(() => {
    if (searchOutboxInFlight) {
      return;
    }
    searchOutboxInFlight = true;
    processPendingSearchIndexOperations()
      .catch((error) => logger.warn({ error }, 'Search index outbox drain failed'))
      .finally(() => {
        searchOutboxInFlight = false;
      });
  }, intervalMs);
}

export function stopSearchIndexOutboxWorker(): void {
  if (searchOutboxTimer) {
    clearInterval(searchOutboxTimer);
    searchOutboxTimer = null;
  }
}

export async function checkSearchHealth(): Promise<SearchHealth> {
  if (!client) {
    return { status: 'skipped', message: 'Meilisearch not configured' };
  }

  try {
    messagesIndex = client.index<SearchableMessage>(SEARCH_INDEX);
    await messagesIndex.getStats();
    await ensureSearchSettings();
    return { status: 'ok' };
  } catch (error: any) {
    logger.warn({ error }, 'Meilisearch authenticated health check failed');
    return {
      status: 'error',
      message: 'Meilisearch authenticated health check failed',
    };
  }
}

/**
 * Initialize Meilisearch indices
 */
export async function initSearch(): Promise<void> {
  if (!client) {
    logger.info('Meilisearch not configured; search disabled');
    return;
  }

  try {
    // Check if index exists
    try {
      messagesIndex = client.index<SearchableMessage>(SEARCH_INDEX);
      await messagesIndex.getStats();
    } catch {
      // Create index if it doesn't exist
      await client.createIndex(SEARCH_INDEX, { primaryKey: 'id' });
      messagesIndex = client.index<SearchableMessage>(SEARCH_INDEX);
    }

    // Configure index settings
    const task = await messagesIndex.updateSettings(SEARCH_SETTINGS);
    await waitForSearchTask(task, 'settings');

    logger.info('Meilisearch connected');
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize Meilisearch');
  }
}

/**
 * Index a message for search
 */
export async function indexMessage(message: SearchableMessage): Promise<void> {
  const startedAt = Date.now();
  const lagSeconds = message.createdAt ? Math.max(0, (Date.now() - message.createdAt) / 1000) : undefined;
  if (!messagesIndex) {
    trackSearchIndexOperation({
      appId: message.appId,
      operation: 'index',
      result: 'skipped',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
    await enqueueSearchIndexOperation(message.appId, message.id, 'index', 'Meilisearch index is not initialized');
    return;
  }

  try {
    const task = await messagesIndex.addDocuments([message]);
    await waitForSearchTask(task, 'index');
    trackSearchIndexOperation({
      appId: message.appId,
      operation: 'index',
      result: 'success',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
  } catch (error) {
    trackSearchIndexOperation({
      appId: message.appId,
      operation: 'index',
      result: 'failure',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
    logger.error({ error, app_id: message.appId, operation: 'index' }, 'Failed to index message');
    await enqueueSearchIndexOperation(message.appId, message.id, 'index', error);
  }
}

/**
 * Index multiple messages
 */
export async function indexMessages(messages: SearchableMessage[]): Promise<void> {
  const startedAt = Date.now();
  if (messages.length === 0) return;
  const appId = messages[0]?.appId;
  const lagSeconds = Math.max(
    0,
    ...messages.map((message) => message.createdAt ? (Date.now() - message.createdAt) / 1000 : 0)
  );
  if (!messagesIndex) {
    trackSearchIndexOperation({
      appId,
      operation: 'bulk_index',
      result: 'skipped',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
    await Promise.all(messages.map((message) =>
      enqueueSearchIndexOperation(message.appId, message.id, 'index', 'Meilisearch index is not initialized')
    ));
    return;
  }

  try {
    const task = await messagesIndex.addDocuments(messages);
    await waitForSearchTask(task, 'bulk_index');
    trackSearchIndexOperation({
      appId,
      operation: 'bulk_index',
      result: 'success',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
  } catch (error) {
    trackSearchIndexOperation({
      appId,
      operation: 'bulk_index',
      result: 'failure',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
    logger.error({ error, app_id: appId, operation: 'bulk_index' }, 'Failed to index messages');
    await Promise.all(messages.map((message) =>
      enqueueSearchIndexOperation(message.appId, message.id, 'index', error)
    ));
  }
}

/**
 * Update a message in the index
 */
export async function updateMessageIndex(message: SearchableMessage): Promise<void> {
  const startedAt = Date.now();
  const lagSeconds = message.createdAt ? Math.max(0, (Date.now() - message.createdAt) / 1000) : undefined;
  if (!messagesIndex) {
    trackSearchIndexOperation({
      appId: message.appId,
      operation: 'update',
      result: 'skipped',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
    await enqueueSearchIndexOperation(message.appId, message.id, 'update', 'Meilisearch index is not initialized');
    return;
  }

  try {
    const task = await messagesIndex.updateDocuments([message]);
    await waitForSearchTask(task, 'update');
    trackSearchIndexOperation({
      appId: message.appId,
      operation: 'update',
      result: 'success',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
  } catch (error) {
    trackSearchIndexOperation({
      appId: message.appId,
      operation: 'update',
      result: 'failure',
      durationSeconds: (Date.now() - startedAt) / 1000,
      lagSeconds,
    });
    logger.error({ error, app_id: message.appId, operation: 'update' }, 'Failed to update message index');
    await enqueueSearchIndexOperation(message.appId, message.id, 'update', error);
  }
}

/**
 * Remove a message from the index
 */
export async function removeFromIndex(messageId: string, appId?: string): Promise<void> {
  const startedAt = Date.now();
  if (!messagesIndex) {
    trackSearchIndexOperation({
      appId,
      operation: 'delete',
      result: 'skipped',
      durationSeconds: (Date.now() - startedAt) / 1000,
    });
    await enqueueSearchIndexOperation(appId, messageId, 'delete', 'Meilisearch index is not initialized');
    return;
  }

  try {
    const task = await messagesIndex.deleteDocument(messageId);
    await waitForSearchTask(task, 'delete');
    trackSearchIndexOperation({
      appId,
      operation: 'delete',
      result: 'success',
      durationSeconds: (Date.now() - startedAt) / 1000,
    });
  } catch (error) {
    trackSearchIndexOperation({
      appId,
      operation: 'delete',
      result: 'failure',
      durationSeconds: (Date.now() - startedAt) / 1000,
    });
    logger.error({ error, app_id: appId, operation: 'delete' }, 'Failed to remove message from index');
    await enqueueSearchIndexOperation(appId, messageId, 'delete', error);
  }
}

/**
 * Search messages
 */
export async function searchMessages(
  appId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResults> {
  if (!messagesIndex) {
    trackSearchQuery(appId, 'skipped');
    return {
      hits: [],
      query,
      processingTimeMs: 0,
      totalHits: 0,
      offset: 0,
      limit: options.limit ?? 20,
    };
  }

  const {
    limit = 20,
    offset = 0,
    filters = {},
    highlightPreTag = '<mark>',
    highlightPostTag = '</mark>',
  } = options;

  // Build filter string
  const filterParts: string[] = [`appId = "${appId}"`];

  if (filters.channelId) {
    filterParts.push(`channelId = "${filters.channelId}"`);
  }

  if (filters.channelIds && filters.channelIds.length > 0) {
    const channelFilter = filters.channelIds.map((id) => `channelId = "${id}"`).join(' OR ');
    filterParts.push(`(${channelFilter})`);
  } else if (Array.isArray(filters.channelIds)) {
    return {
      hits: [],
      query,
      processingTimeMs: 0,
      totalHits: 0,
      offset,
      limit,
    };
  }

  if (filters.userId) {
    filterParts.push(`userId = "${filters.userId}"`);
  }

  if (filters.fromDate) {
    filterParts.push(`createdAt >= ${filters.fromDate.getTime()}`);
  }

  if (filters.toDate) {
    filterParts.push(`createdAt <= ${filters.toDate.getTime()}`);
  }

  if (filters.hasAttachments) {
    filterParts.push(`attachmentTypes IS NOT NULL`);
  }

  const filterString = filterParts.join(' AND ');

  try {
    const results = await messagesIndex.search(query, {
      limit,
      offset,
      filter: filterString,
      attributesToHighlight: ['text'],
      highlightPreTag,
      highlightPostTag,
      sort: ['createdAt:desc'],
    });

    const response = {
      hits: results.hits.map((hit) => ({
        id: hit.id,
        channelId: hit.channelId,
        userId: hit.userId,
        userName: hit.userName,
        text: hit.text,
        createdAt: hit.createdAt,
        _formatted: hit._formatted,
      })),
      query,
      processingTimeMs: results.processingTimeMs,
      totalHits: results.estimatedTotalHits ?? 0,
      offset,
      limit,
    };
    trackSearchQuery(appId, 'success');
    return response;
  } catch (error) {
    trackSearchQuery(appId, 'failure');
    logger.error({ error, app_id: appId }, 'Search failed');
    return {
      hits: [],
      query,
      processingTimeMs: 0,
      totalHits: 0,
      offset,
      limit,
    };
  }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSuggestions(
  _appId: string,
  _query: string,
  _channelIds?: string[],
  _limit = 5
): Promise<string[]> {
  return [];
}

/**
 * Clear all messages for an app
 */
export async function clearAppIndex(appId: string): Promise<void> {
  if (!messagesIndex) return;

  try {
    await messagesIndex.deleteDocuments({ filter: `appId = "${appId}"` });
  } catch (error) {
    logger.error({ error, app_id: appId }, 'Failed to clear app index');
  }
}
