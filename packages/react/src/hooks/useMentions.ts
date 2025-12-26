/**
 * useMentions - Hook for @user mentions
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChatClient } from './ChatProvider';

export interface MentionUser {
  id: string;
  name: string;
  image?: string;
}

export interface Mention {
  id: string;
  mentionedAt: string;
  message: {
    id: string;
    channelId: string;
    text: string;
    createdAt: string;
  };
  mentioner: MentionUser;
  channel: {
    id: string;
    name: string;
    type: string;
  };
  read: boolean;
}

export interface UseMentionsOptions {
  /** Only fetch unread mentions */
  unreadOnly?: boolean;
  /** Limit number of mentions */
  limit?: number;
}

export interface UseMentionsResult {
  /** List of mentions */
  mentions: Mention[];
  /** Loading state */
  loading: boolean;
  /** Has more mentions to load */
  hasMore: boolean;
  /** Unread mention count */
  unreadCount: number;
  /** Load more mentions */
  loadMore: () => Promise<void>;
  /** Refresh mentions */
  refresh: () => Promise<void>;
}

/**
 * useMentions - Get and track @mentions for the current user
 *
 * @example
 * ```tsx
 * const { mentions, unreadCount, loading } = useMentions();
 *
 * // Show badge with unread count
 * <Badge count={unreadCount} />
 *
 * // List mentions
 * {mentions.map(m => (
 *   <MentionItem key={m.id} mention={m} />
 * ))}
 * ```
 */
export function useMentions(options: UseMentionsOptions = {}): UseMentionsResult {
  const { unreadOnly = false, limit = 50 } = options;
  const client = useChatClient();

  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const cursorRef = useRef<string | null>(null);

  // Fetch mentions
  const fetchMentions = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({
        limit: String(limit),
        ...(unreadOnly && { unread: 'true' }),
        ...(cursor && { before: cursor }),
      });

      const response = await client.fetch<{
        mentions: Mention[];
        hasMore: boolean;
      }>(`/api/mentions?${params}`);

      return response;
    },
    [client, limit, unreadOnly]
  );

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const response = await client.fetch<{ count: number }>('/api/mentions/unread-count');
    setUnreadCount(response.count);
  }, [client]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mentionsResponse] = await Promise.all([
          fetchMentions(),
          fetchUnreadCount(),
        ]);

        setMentions(mentionsResponse.mentions);
        setHasMore(mentionsResponse.hasMore);

        if (mentionsResponse.mentions.length > 0) {
          cursorRef.current =
            mentionsResponse.mentions[mentionsResponse.mentions.length - 1].mentionedAt;
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fetchMentions, fetchUnreadCount]);

  // Listen for new mentions
  useEffect(() => {
    const unsub = client.on('mention', (data: any) => {
      const newMention: Mention = {
        id: data.id,
        mentionedAt: data.mentionedAt,
        message: data.message,
        mentioner: data.mentioner,
        channel: data.channel,
        read: false,
      };

      setMentions((prev) => [newMention, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return unsub;
  }, [client]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || !cursorRef.current) return;

    const response = await fetchMentions(cursorRef.current);
    setMentions((prev) => [...prev, ...response.mentions]);
    setHasMore(response.hasMore);

    if (response.mentions.length > 0) {
      cursorRef.current = response.mentions[response.mentions.length - 1].mentionedAt;
    }
  }, [hasMore, fetchMentions]);

  // Refresh
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    const [mentionsResponse] = await Promise.all([
      fetchMentions(),
      fetchUnreadCount(),
    ]);

    setMentions(mentionsResponse.mentions);
    setHasMore(mentionsResponse.hasMore);

    if (mentionsResponse.mentions.length > 0) {
      cursorRef.current =
        mentionsResponse.mentions[mentionsResponse.mentions.length - 1].mentionedAt;
    }
  }, [fetchMentions, fetchUnreadCount]);

  return {
    mentions,
    loading,
    hasMore,
    unreadCount,
    loadMore,
    refresh,
  };
}

export interface UseMentionSearchOptions {
  /** Channel ID to search within (optional) */
  channelId?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
}

export interface UseMentionSearchResult {
  /** Search query */
  query: string;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Search results */
  users: MentionUser[];
  /** Loading state */
  loading: boolean;
}

/**
 * useMentionSearch - Search for users to @mention
 *
 * @example
 * ```tsx
 * const { query, setQuery, users, loading } = useMentionSearch({ channelId });
 *
 * // When user types @
 * <input onChange={(e) => setQuery(e.target.value.slice(1))} />
 *
 * // Show suggestions
 * {users.map(user => (
 *   <MentionSuggestion key={user.id} user={user} />
 * ))}
 * ```
 */
export function useMentionSearch(
  options: UseMentionSearchOptions = {}
): UseMentionSearchResult {
  const { channelId, debounceMs = 200 } = options;
  const client = useChatClient();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Search users
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 1) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          ...(channelId && { channelId }),
        });

        const response = await client.fetch<{ users: MentionUser[] }>(
          `/api/mentions/search?${params}`
        );

        setUsers(response.users);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, channelId, debounceMs, client]);

  return {
    query,
    setQuery,
    users,
    loading,
  };
}

/**
 * Parse mentions from text
 * Returns array of mentioned user IDs/names
 */
export function parseMentions(text: string): string[] {
  const mentions: string[] = [];

  // Match @username
  const simplePattern = /@(\w+)/g;
  let match;
  while ((match = simplePattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  // Match @[User Name]
  const bracketPattern = /@\[([^\]]+)\]/g;
  while ((match = bracketPattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Format mention for display/sending
 */
export function formatMention(user: MentionUser): string {
  // Use brackets if name contains spaces
  if (user.name.includes(' ')) {
    return `@[${user.name}]`;
  }
  return `@${user.name}`;
}

/**
 * Highlight mentions in text for rendering
 */
export function highlightMentions(
  text: string,
  currentUserId?: string
): Array<{ type: 'text' | 'mention'; content: string; isCurrentUser?: boolean }> {
  const parts: Array<{
    type: 'text' | 'mention';
    content: string;
    isCurrentUser?: boolean;
  }> = [];

  // Combined pattern for both mention formats
  const mentionPattern = /@(\w+)|@\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add mention
    const mentionName = match[1] || match[2];
    parts.push({
      type: 'mention',
      content: mentionName,
      isCurrentUser: mentionName === currentUserId,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}
