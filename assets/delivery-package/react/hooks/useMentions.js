/**
 * useMentions - Hook for @user mentions
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatClient } from './ChatProvider';
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
export function useMentions(options = {}) {
    const { unreadOnly = false, limit = 50 } = options;
    const client = useChatClient();
    const [mentions, setMentions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const cursorRef = useRef(null);
    // Fetch mentions
    const fetchMentions = useCallback(async (cursor) => {
        const params = new URLSearchParams({
            limit: String(limit),
            ...(unreadOnly && { unread: 'true' }),
            ...(cursor && { before: cursor }),
        });
        const response = await client.fetch(`/api/mentions?${params}`);
        return response;
    }, [client, limit, unreadOnly]);
    // Fetch unread count
    const fetchUnreadCount = useCallback(async () => {
        const response = await client.fetch('/api/mentions/unread-count');
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
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [fetchMentions, fetchUnreadCount]);
    // Listen for new mentions
    useEffect(() => {
        const unsub = client.on('mention', (data) => {
            const newMention = {
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
        if (!hasMore || !cursorRef.current)
            return;
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
export function useMentionSearch(options = {}) {
    const { channelId, debounceMs = 200 } = options;
    const client = useChatClient();
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef();
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
                const response = await client.fetch(`/api/mentions/search?${params}`);
                setUsers(response.users);
            }
            catch {
                setUsers([]);
            }
            finally {
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
export function parseMentions(text) {
    const mentions = [];
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
export function formatMention(user) {
    // Use brackets if name contains spaces
    if (user.name.includes(' ')) {
        return `@[${user.name}]`;
    }
    return `@${user.name}`;
}
/**
 * Highlight mentions in text for rendering
 */
export function highlightMentions(text, currentUserId) {
    const parts = [];
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
