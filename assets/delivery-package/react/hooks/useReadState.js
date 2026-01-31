/**
 * useReadState - Hook for read receipts and unread counts
 */
import { useState, useEffect, useCallback } from 'react';
import { useChatClient } from './ChatProvider';
/**
 * useReadState - Handle read state and receipts for a channel
 *
 * @example
 * ```tsx
 * const { unreadCount, markAsRead } = useReadState(channelId);
 *
 * // Mark as read when channel is viewed
 * useEffect(() => {
 *   if (isActive) {
 *     markAsRead();
 *   }
 * }, [isActive, markAsRead]);
 *
 * // Show unread badge
 * {unreadCount > 0 && <Badge count={unreadCount} />}
 * ```
 */
export function useReadState(channelId) {
    const client = useChatClient();
    const [unreadCount, setUnreadCount] = useState(0);
    const [readReceipts, setReadReceipts] = useState([]);
    // Fetch initial unread count when channelId changes
    useEffect(() => {
        if (!channelId) {
            setUnreadCount(0);
            return;
        }
        // Fetch channel to get initial unread count
        client
            .fetch(`/api/channels/${channelId}`)
            .then((channel) => {
            if (channel.unreadCount !== undefined) {
                setUnreadCount(channel.unreadCount);
            }
        })
            .catch((err) => {
            console.warn('Failed to fetch initial unread count:', err);
        });
    }, [client, channelId]);
    // Subscribe to read receipt updates
    useEffect(() => {
        if (!channelId) {
            setUnreadCount(0);
            setReadReceipts([]);
            return;
        }
        const unsubRead = client.on('read.updated', ({ channelId: cid, userId, lastReadSeq }) => {
            if (cid !== channelId)
                return;
            // Update read receipts
            setReadReceipts((prev) => {
                const existing = prev.findIndex((r) => r.userId === userId);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = { userId, lastReadSeq };
                    return updated;
                }
                return [...prev, { userId, lastReadSeq }];
            });
            // If it's the current user, reset unread count
            if (userId === client.user?.id) {
                setUnreadCount(0);
            }
        });
        const unsubUnread = client.on('channel.unread_changed', ({ channelId: cid, count }) => {
            if (cid === channelId) {
                setUnreadCount(count);
            }
        });
        // Increment unread count on new messages (if not from current user)
        const unsubNewMessage = client.on('message.new', ({ channelId: cid, message }) => {
            if (cid === channelId && message.user?.id !== client.user?.id) {
                setUnreadCount((prev) => prev + 1);
            }
        });
        return () => {
            unsubRead();
            unsubUnread();
            unsubNewMessage();
        };
    }, [client, channelId]);
    // Mark channel as read
    const markAsRead = useCallback(async () => {
        if (!channelId)
            return;
        await client.markRead(channelId);
        setUnreadCount(0);
    }, [client, channelId]);
    return {
        unreadCount,
        readReceipts,
        markAsRead,
    };
}
/**
 * useTotalUnreadCount - Get total unread count across all channels
 */
export function useTotalUnreadCount() {
    const client = useChatClient();
    const [totalUnread, setTotalUnread] = useState(0);
    // Fetch initial total unread count
    useEffect(() => {
        client
            .fetch('/api/channels/unread-count')
            .then((result) => {
            setTotalUnread(result.count);
        })
            .catch((err) => {
            console.warn('Failed to fetch total unread count:', err);
        });
    }, [client]);
    // Subscribe to real-time updates
    useEffect(() => {
        const unsub = client.on('channel.total_unread_changed', ({ count }) => {
            setTotalUnread(count);
        });
        return unsub;
    }, [client]);
    return totalUnread;
}
