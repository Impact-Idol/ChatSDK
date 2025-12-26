/**
 * Search Service
 * Meilisearch integration for message search
 */

import { MeiliSearch, Index } from 'meilisearch';

const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_MASTER_KEY = process.env.MEILI_MASTER_KEY || 'chatsdk_dev_key';

// Initialize Meilisearch client
const client = new MeiliSearch({
  host: MEILI_HOST,
  apiKey: MEILI_MASTER_KEY,
});

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

/**
 * Initialize Meilisearch indices
 */
export async function initSearch(): Promise<void> {
  try {
    // Check if index exists
    try {
      messagesIndex = client.index<SearchableMessage>('messages');
      await messagesIndex.getStats();
    } catch {
      // Create index if it doesn't exist
      await client.createIndex('messages', { primaryKey: 'id' });
      messagesIndex = client.index<SearchableMessage>('messages');
    }

    // Configure index settings
    await messagesIndex.updateSettings({
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
    });

    console.log('Meilisearch connected');
  } catch (error) {
    console.warn('Failed to initialize Meilisearch:', error);
  }
}

/**
 * Index a message for search
 */
export async function indexMessage(message: SearchableMessage): Promise<void> {
  if (!messagesIndex) return;

  try {
    await messagesIndex.addDocuments([message]);
  } catch (error) {
    console.error('Failed to index message:', error);
  }
}

/**
 * Index multiple messages
 */
export async function indexMessages(messages: SearchableMessage[]): Promise<void> {
  if (!messagesIndex || messages.length === 0) return;

  try {
    await messagesIndex.addDocuments(messages);
  } catch (error) {
    console.error('Failed to index messages:', error);
  }
}

/**
 * Update a message in the index
 */
export async function updateMessageIndex(message: SearchableMessage): Promise<void> {
  if (!messagesIndex) return;

  try {
    await messagesIndex.updateDocuments([message]);
  } catch (error) {
    console.error('Failed to update message index:', error);
  }
}

/**
 * Remove a message from the index
 */
export async function removeFromIndex(messageId: string): Promise<void> {
  if (!messagesIndex) return;

  try {
    await messagesIndex.deleteDocument(messageId);
  } catch (error) {
    console.error('Failed to remove message from index:', error);
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

    return {
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
  } catch (error) {
    console.error('Search failed:', error);
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
  appId: string,
  query: string,
  channelIds?: string[],
  limit = 5
): Promise<string[]> {
  if (!messagesIndex || !query) return [];

  const filters = channelIds ? { channelIds } : {};

  const results = await searchMessages(appId, query, { limit, filters });

  // Extract unique suggestions from results
  const suggestions = new Set<string>();

  for (const hit of results.hits) {
    // Find the matched terms
    if (hit._formatted?.text) {
      const matches = hit._formatted.text.match(/<mark>([^<]+)<\/mark>/g);
      if (matches) {
        for (const match of matches) {
          const term = match.replace(/<\/?mark>/g, '');
          suggestions.add(term.toLowerCase());
        }
      }
    }
  }

  return Array.from(suggestions).slice(0, limit);
}

/**
 * Clear all messages for an app
 */
export async function clearAppIndex(appId: string): Promise<void> {
  if (!messagesIndex) return;

  try {
    await messagesIndex.deleteDocuments({ filter: `appId = "${appId}"` });
  } catch (error) {
    console.error('Failed to clear app index:', error);
  }
}
