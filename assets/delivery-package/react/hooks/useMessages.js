/**
 * useMessages - Hook for querying and subscribing to messages
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatClient } from './ChatProvider';
/**
 * useMessages - Query and subscribe to messages in a channel
 *
 * @example
 * ```tsx
 * const { messages, loading, sendMessage, loadMore, hasMore } = useMessages(channelId);
 *
 * return (
 *   <MessageList
 *     messages={messages}
 *     loading={loading}
 *     hasMore={hasMore}
 *     onLoadMore={loadMore}
 *   />
 * );
 * ```
 */
export function useMessages(channelId, options = {}) {
    const { limit = 50, initialLoad = true } = options;
    const client = useChatClient();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const loadingRef = useRef(false);
    const oldestMessageRef = useRef(null);
    // Load messages
    const loadMessages = useCallback(async (loadOlder = false) => {
        if (!channelId || loadingRef.current)
            return;
        loadingRef.current = true;
        try {
            setLoading(true);
            const result = await client.queryMessages(channelId, {
                limit,
                before: loadOlder ? oldestMessageRef.current ?? undefined : undefined,
            });
            if (loadOlder) {
                setMessages((prev) => [...result.messages, ...prev]);
            }
            else {
                setMessages(result.messages);
            }
            if (result.messages.length > 0) {
                oldestMessageRef.current = result.messages[0].id;
            }
            setHasMore(result.hasMore);
            setError(null);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [client, channelId, limit]);
    // Initial load and subscription
    useEffect(() => {
        if (!channelId) {
            setMessages([]);
            setLoading(false);
            return;
        }
        let isSubscribed = true;
        // Async initialization
        const init = async () => {
            if (isSubscribed) {
                // Subscribe to channel
                await client.subscribeToChannel(channelId);
                // Load initial messages
                if (initialLoad && isSubscribed) {
                    loadMessages(false);
                }
            }
        };
        init();
        // Subscribe to real-time message events
        const unsubNew = client.on('message.new', ({ channelId: cid, message }) => {
            if (cid === channelId) {
                setMessages((prev) => {
                    // Check for optimistic update (same clientMsgId)
                    const existingIndex = prev.findIndex((m) => m.id === message.id || (message.clientMsgId && m.clientMsgId === message.clientMsgId));
                    if (existingIndex >= 0) {
                        // Replace optimistic message with server message
                        const updated = [...prev];
                        updated[existingIndex] = message;
                        return updated;
                    }
                    return [...prev, message];
                });
            }
        });
        const unsubUpdated = client.on('message.updated', ({ channelId: cid, message }) => {
            if (cid === channelId) {
                setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
            }
        });
        const unsubDeleted = client.on('message.deleted', ({ channelId: cid, messageId }) => {
            if (cid === channelId) {
                setMessages((prev) => prev.map((m) => m.id === messageId
                    ? { ...m, type: 'deleted', text: undefined, deleted_at: new Date().toISOString() }
                    : m));
            }
        });
        const unsubStatus = client.on('message.status_changed', ({ channelId: cid, messageId, status }) => {
            if (cid === channelId) {
                setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)));
            }
        });
        // Handle reactions
        const unsubReactionAdded = client.on('reaction.added', ({ channelId: cid, messageId, reaction }) => {
            if (cid === channelId) {
                updateMessageReaction(messageId, reaction, true);
            }
        });
        const unsubReactionRemoved = client.on('reaction.removed', ({ channelId: cid, messageId, reaction }) => {
            if (cid === channelId) {
                updateMessageReaction(messageId, reaction, false);
            }
        });
        return () => {
            isSubscribed = false;
            unsubNew();
            unsubUpdated();
            unsubDeleted();
            unsubStatus();
            unsubReactionAdded();
            unsubReactionRemoved();
            client.unsubscribeFromChannel(channelId);
        };
    }, [client, channelId, initialLoad]);
    // Helper to update reactions
    const updateMessageReaction = (messageId, reaction, added) => {
        setMessages((prev) => prev.map((m) => {
            if (m.id !== messageId)
                return m;
            const reactions = m.reactions || [];
            const existingGroup = reactions.find((r) => r.type === reaction.type);
            if (added) {
                if (existingGroup) {
                    // Increment count
                    return {
                        ...m,
                        reactions: reactions.map((r) => r.type === reaction.type
                            ? {
                                ...r,
                                count: r.count + 1,
                                users: [...r.users, reaction.user].slice(0, 5),
                                own: reaction.user_id === client.user?.id ? true : r.own,
                            }
                            : r),
                    };
                }
                else {
                    // Add new reaction group
                    return {
                        ...m,
                        reactions: [
                            ...reactions,
                            {
                                type: reaction.type,
                                count: 1,
                                users: reaction.user ? [reaction.user] : [],
                                own: reaction.user_id === client.user?.id,
                            },
                        ],
                    };
                }
            }
            else {
                // Remove reaction
                return {
                    ...m,
                    reactions: reactions
                        .map((r) => r.type === reaction.type
                        ? {
                            ...r,
                            count: Math.max(0, r.count - 1),
                            users: r.users.filter((u) => u.id !== reaction.user_id),
                            own: reaction.user_id === client.user?.id ? false : r.own,
                        }
                        : r)
                        .filter((r) => r.count > 0),
                };
            }
        }));
    };
    // Send message with optimistic update
    const sendMessage = useCallback(async (text, sendOptions) => {
        if (!channelId)
            throw new Error('No channel selected');
        const clientMsgId = sendOptions?.clientMsgId || crypto.randomUUID();
        // Optimistic update
        const optimisticMessage = {
            id: clientMsgId,
            cid: channelId,
            type: 'regular',
            text,
            user: client.user,
            status: 'sending',
            created_at: new Date().toISOString(),
            seq: 0, // Will be assigned by server
            clientMsgId,
            attachments: sendOptions?.attachments,
            parent_id: sendOptions?.parentId,
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        try {
            const message = await client.sendMessage(channelId, {
                text,
                clientMsgId,
                attachments: sendOptions?.attachments,
                parentId: sendOptions?.parentId,
            });
            // Replace optimistic message with server response
            setMessages((prev) => prev.map((m) => (m.clientMsgId === clientMsgId ? message : m)));
            return message;
        }
        catch (err) {
            // Mark message as failed
            setMessages((prev) => prev.map((m) => m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m));
            throw err;
        }
    }, [client, channelId]);
    const updateMessage = useCallback(async (messageId, text) => {
        if (!channelId)
            throw new Error('No channel selected');
        await client.updateMessage(channelId, messageId, { text });
    }, [client, channelId]);
    const deleteMessage = useCallback(async (messageId) => {
        if (!channelId)
            throw new Error('No channel selected');
        await client.deleteMessage(channelId, messageId);
    }, [client, channelId]);
    const addReaction = useCallback(async (messageId, emoji) => {
        if (!channelId)
            throw new Error('No channel selected');
        await client.addReaction(channelId, messageId, emoji);
    }, [client, channelId]);
    const removeReaction = useCallback(async (messageId, emoji) => {
        if (!channelId)
            throw new Error('No channel selected');
        await client.removeReaction(channelId, messageId, emoji);
    }, [client, channelId]);
    const loadMore = useCallback(() => loadMessages(true), [loadMessages]);
    return {
        messages,
        loading,
        error,
        hasMore,
        loadMore,
        sendMessage,
        updateMessage,
        deleteMessage,
        addReaction,
        removeReaction,
    };
}
