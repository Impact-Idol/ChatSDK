/**
 * useSearch - Hook for searching messages
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatClient } from './ChatProvider';

export interface SearchResult {
  messageId: string;
  channelId: string;
  channelName?: string;
  userId: string;
  userName: string;
  text: string;
  highlightedText?: string;
  createdAt: string;
}

export interface UseSearchOptions {
  channelId?: string;
  debounceMs?: number;
  limit?: number;
}

export interface UseSearchResult {
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  totalHits: number;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clear: () => void;
  suggestions: string[];
  getSuggestions: (query: string) => Promise<void>;
}

/**
 * useSearch - Search messages across channels
 *
 * @example
 * ```tsx
 * const { results, loading, search, suggestions } = useSearch();
 *
 * const handleSearch = async (query: string) => {
 *   await search(query);
 * };
 *
 * return (
 *   <div>
 *     <input onChange={(e) => handleSearch(e.target.value)} />
 *     {results.map((result) => (
 *       <div key={result.messageId}>
 *         <strong>{result.userName}</strong>: {result.highlightedText || result.text}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const { channelId, debounceMs = 300, limit = 20 } = options;
  const client = useChatClient();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const currentQueryRef = useRef('');
  const offsetRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(
    async (query: string) => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      currentQueryRef.current = query;
      offsetRef.current = 0;

      if (!query.trim()) {
        setResults([]);
        setTotalHits(0);
        setError(null);
        return;
      }

      // Debounce the search
      return new Promise<void>((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          setLoading(true);
          setError(null);

          try {
            const params = new URLSearchParams({
              q: query,
              limit: String(limit),
              offset: '0',
            });

            if (channelId) {
              params.set('channelId', channelId);
            }

            const response = await client.fetch<{
              results: SearchResult[];
              totalHits: number;
            }>(`/api/search?${params}`);

            // Only update if this is still the current query
            if (currentQueryRef.current === query) {
              setResults(response.results);
              setTotalHits(response.totalHits);
            }
          } catch (err) {
            if (currentQueryRef.current === query) {
              setError(err as Error);
            }
          } finally {
            if (currentQueryRef.current === query) {
              setLoading(false);
            }
          }
          resolve();
        }, debounceMs);
      });
    },
    [client, channelId, limit, debounceMs]
  );

  const loadMore = useCallback(async () => {
    if (loading || !currentQueryRef.current) return;

    const newOffset = offsetRef.current + limit;
    if (newOffset >= totalHits) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({
        q: currentQueryRef.current,
        limit: String(limit),
        offset: String(newOffset),
      });

      if (channelId) {
        params.set('channelId', channelId);
      }

      const response = await client.fetch<{
        results: SearchResult[];
        totalHits: number;
      }>(`/api/search?${params}`);

      setResults((prev) => [...prev, ...response.results]);
      offsetRef.current = newOffset;
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client, channelId, limit, loading, totalHits]);

  const clear = useCallback(() => {
    currentQueryRef.current = '';
    offsetRef.current = 0;
    setResults([]);
    setTotalHits(0);
    setError(null);
    setSuggestions([]);
  }, []);

  const getSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const params = new URLSearchParams({ q: query });
        if (channelId) {
          params.set('channelId', channelId);
        }

        const response = await client.fetch<{ suggestions: string[] }>(
          `/api/search/suggestions?${params}`
        );

        setSuggestions(response.suggestions);
      } catch {
        setSuggestions([]);
      }
    },
    [client, channelId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    results,
    loading,
    error,
    totalHits,
    search,
    loadMore,
    clear,
    suggestions,
    getSuggestions,
  };
}
