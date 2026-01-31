/**
 * useThread - Hook for threaded conversations
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatClient } from './ChatProvider';
/**
 * useThread - Access and interact with a message thread
 *
 * @example
 * ```tsx
 * const { parent, replies, sendReply, loading } = useThread(channelId, messageId);
 *
 * // Display parent message
 * <ParentMessage message={parent} />
 *
 * // Display replies
 * {replies.map(reply => <Reply key={reply.id} message={reply} />)}
 *
 * // Send a reply
 * await sendReply('Thanks for the explanation!');
 * ```
 */
export function useThread(channelId, messageId, options = {}) {
    const { limit = 50, onNewReply } = options;
    const client = useChatClient();
    const [parent, setParent] = useState(null);
    const [replies, setReplies] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const onNewReplyRef = useRef(onNewReply);
    onNewReplyRef.current = onNewReply;
    // Fetch thread data
    const fetchThread = useCallback(async (before) => {
        if (!channelId || !messageId)
            return;
        try {
            const params = new URLSearchParams({ limit: String(limit) });
            if (before) {
                params.set('before', before);
            }
            const response = await client.fetch(`/api/channels/${channelId}/messages/${messageId}/thread?${params}`);
            if (before) {
                // Appending older replies
                setReplies((prev) => [...prev, ...response.replies]);
            }
            else {
                // Initial load
                setParent(response.parent);
                setReplies(response.replies);
            }
            setHasMore(response.hasMore);
            if (response.replies.length > 0) {
                setCursor(response.replies[response.replies.length - 1].created_at);
            }
        }
        catch (error) {
            console.error('Failed to fetch thread:', error);
        }
    }, [channelId, messageId, limit, client]);
    // Fetch participants
    const fetchParticipants = useCallback(async () => {
        if (!channelId || !messageId)
            return;
        try {
            const response = await client.fetch(`/api/channels/${channelId}/messages/${messageId}/thread/participants`);
            setParticipants(response.participants);
        }
        catch (error) {
            console.error('Failed to fetch participants:', error);
        }
    }, [channelId, messageId, client]);
    // Initial load
    useEffect(() => {
        if (!channelId || !messageId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setReplies([]);
        setParent(null);
        setCursor(null);
        Promise.all([fetchThread(), fetchParticipants()]).finally(() => setLoading(false));
    }, [channelId, messageId, fetchThread, fetchParticipants]);
    // Subscribe to real-time thread events
    useEffect(() => {
        if (!channelId || !messageId)
            return;
        const unsubReply = client.on('thread.reply', (data) => {
            if (data.channelId === channelId && data.parentId === messageId) {
                const newReply = data.message;
                setReplies((prev) => {
                    // Avoid duplicates
                    if (prev.some((r) => r.id === newReply.id)) {
                        return prev;
                    }
                    return [...prev, newReply];
                });
                // Update parent reply count
                setParent((prev) => prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev);
                // Callback
                onNewReplyRef.current?.(newReply);
            }
        });
        return () => {
            unsubReply();
        };
    }, [channelId, messageId, client]);
    // Load more (pagination)
    const loadMore = useCallback(async () => {
        if (!hasMore || !cursor)
            return;
        await fetchThread(cursor);
    }, [hasMore, cursor, fetchThread]);
    // Send a reply
    const sendReply = useCallback(async (text, attachments) => {
        if (!channelId || !messageId) {
            throw new Error('No channel or message selected');
        }
        const clientMsgId = crypto.randomUUID();
        // Optimistic update
        const optimisticReply = {
            id: clientMsgId,
            cid: channelId,
            type: 'regular',
            text,
            attachments: attachments || [],
            user: {
                id: client.user?.id || '',
                name: client.user?.name || '',
                image: client.user?.image,
            },
            parentId: messageId,
            parent_id: messageId,
            status: 'sending',
            created_at: new Date().toISOString(),
            reactions: [],
        };
        setReplies((prev) => [...prev, optimisticReply]);
        setParent((prev) => prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev);
        try {
            const response = await client.fetch(`/api/channels/${channelId}/messages/${messageId}/thread`, {
                method: 'POST',
                body: JSON.stringify({
                    text,
                    attachments,
                    clientMsgId,
                }),
            });
            // Update with server response
            setReplies((prev) => prev.map((r) => r.id === clientMsgId ? { ...response, status: 'sent' } : r));
            return response;
        }
        catch (error) {
            // Mark as failed
            setReplies((prev) => prev.map((r) => r.id === clientMsgId ? { ...r, status: 'failed' } : r));
            throw error;
        }
    }, [channelId, messageId, client]);
    // Refresh thread
    const refresh = useCallback(async () => {
        setCursor(null);
        await Promise.all([fetchThread(), fetchParticipants()]);
    }, [fetchThread, fetchParticipants]);
    return {
        parent,
        replies,
        participants,
        loading,
        hasMore,
        loadMore,
        sendReply,
        refresh,
    };
}
/**
 * useThreadPreview - Get thread preview for a message (reply count + participants)
 */
export function useThreadPreview(channelId, messageId) {
    const client = useChatClient();
    const [replyCount, setReplyCount] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!channelId || !messageId) {
            setLoading(false);
            return;
        }
        const fetchPreview = async () => {
            try {
                const response = await client.fetch(`/api/channels/${channelId}/messages/${messageId}/thread/participants`);
                setParticipants(response.participants);
                setReplyCount(response.participants.reduce((sum, p) => sum + p.replyCount, 0));
            }
            catch {
                // Ignore errors
            }
            finally {
                setLoading(false);
            }
        };
        fetchPreview();
        // Subscribe to thread updates
        const unsub = client.on('thread.reply', (data) => {
            if (data.channelId === channelId && data.parentId === messageId) {
                setReplyCount((prev) => prev + 1);
            }
        });
        return unsub;
    }, [channelId, messageId, client]);
    return { replyCount, participants, loading };
}
