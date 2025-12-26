/**
 * useReadReceipts - Hook for message read receipts
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatClient } from './ChatProvider';

export interface Reader {
  userId: string;
  name: string;
  image?: string;
  readAt: string;
}

export interface MessageReceipt {
  readCount: number;
  readers: Reader[];
}

export interface ChannelReadStatus {
  userId: string;
  name: string;
  image?: string;
  lastReadMessageId: string | null;
  lastReadSeq: number;
}

export interface UseReadReceiptsOptions {
  /** Auto-fetch receipts for visible messages */
  autoFetch?: boolean;
  /** Debounce delay for marking as read (ms) */
  markReadDelay?: number;
}

export interface UseReadReceiptsResult {
  /** Mark messages as read up to a specific message */
  markAsRead: (messageId: string) => Promise<void>;
  /** Get read receipts for a single message */
  getReceipts: (messageId: string) => Promise<{ readBy: Reader[]; readCount: number; totalMembers: number }>;
  /** Get read receipts for multiple messages */
  getMultipleReceipts: (messageIds: string[]) => Promise<Record<string, MessageReceipt>>;
  /** Get channel member read status */
  getChannelReadStatus: () => Promise<ChannelReadStatus[]>;
  /** Cached receipts */
  receipts: Record<string, MessageReceipt>;
}

/**
 * useReadReceipts - Track who has read messages
 *
 * @example
 * ```tsx
 * const { markAsRead, getReceipts } = useReadReceipts(channelId);
 *
 * // Mark as read when message becomes visible
 * useEffect(() => {
 *   if (lastVisibleMessageId) {
 *     markAsRead(lastVisibleMessageId);
 *   }
 * }, [lastVisibleMessageId]);
 *
 * // Show who read a message
 * const { readBy } = await getReceipts(message.id);
 * ```
 */
export function useReadReceipts(
  channelId: string | null,
  options: UseReadReceiptsOptions = {}
): UseReadReceiptsResult {
  const { markReadDelay = 1000 } = options;
  const client = useChatClient();
  const [receipts, setReceipts] = useState<Record<string, MessageReceipt>>({});
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastMarkedRef = useRef<string | null>(null);

  // Listen for real-time read receipt events
  useEffect(() => {
    if (!channelId) return;

    const unsub = client.on('read_receipt', (data: any) => {
      if (data.channelId === channelId) {
        // Update receipts cache
        setReceipts((prev) => {
          const messageId = data.messageId;
          const existing = prev[messageId] || { readCount: 0, readers: [] };

          // Check if already in list
          if (existing.readers.some((r) => r.userId === data.userId)) {
            return prev;
          }

          return {
            ...prev,
            [messageId]: {
              readCount: existing.readCount + 1,
              readers: [
                {
                  userId: data.userId,
                  name: data.userName,
                  image: data.userImage,
                  readAt: data.readAt,
                },
                ...existing.readers,
              ].slice(0, 10),
            },
          };
        });
      }
    });

    return unsub;
  }, [channelId, client]);

  // Mark messages as read (debounced)
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!channelId) return;

      // Don't mark the same message twice
      if (lastMarkedRef.current === messageId) return;

      // Clear previous timeout
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }

      // Debounce to avoid too many requests when scrolling
      markReadTimeoutRef.current = setTimeout(async () => {
        try {
          await client.fetch(`/api/channels/${channelId}/read`, {
            method: 'POST',
            body: JSON.stringify({ messageId }),
          });
          lastMarkedRef.current = messageId;
        } catch (error) {
          console.error('Failed to mark as read:', error);
        }
      }, markReadDelay);
    },
    [channelId, client, markReadDelay]
  );

  // Get receipts for a single message
  const getReceipts = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        return { readBy: [], readCount: 0, totalMembers: 0 };
      }

      const response = await client.fetch<{
        readBy: Reader[];
        readCount: number;
        totalMembers: number;
      }>(`/api/channels/${channelId}/receipts/messages/${messageId}/receipts`);

      // Cache the result
      setReceipts((prev) => ({
        ...prev,
        [messageId]: {
          readCount: response.readCount,
          readers: response.readBy,
        },
      }));

      return response;
    },
    [channelId, client]
  );

  // Get receipts for multiple messages
  const getMultipleReceipts = useCallback(
    async (messageIds: string[]) => {
      if (!channelId || messageIds.length === 0) {
        return {};
      }

      const response = await client.fetch<{
        receipts: Record<string, MessageReceipt>;
      }>(`/api/channels/${channelId}/receipts/query`, {
        method: 'POST',
        body: JSON.stringify({ messageIds }),
      });

      // Cache the results
      setReceipts((prev) => ({ ...prev, ...response.receipts }));

      return response.receipts;
    },
    [channelId, client]
  );

  // Get channel member read status
  const getChannelReadStatus = useCallback(async () => {
    if (!channelId) return [];

    const response = await client.fetch<{
      members: ChannelReadStatus[];
    }>(`/api/channels/${channelId}/receipts/read-status`);

    return response.members;
  }, [channelId, client]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
    };
  }, []);

  return {
    markAsRead,
    getReceipts,
    getMultipleReceipts,
    getChannelReadStatus,
    receipts,
  };
}

/**
 * Get read receipt indicator text
 */
export function formatReadReceipt(
  readCount: number,
  totalMembers: number,
  isSentByCurrentUser: boolean
): string {
  if (!isSentByCurrentUser) return '';

  if (readCount === 0) {
    return 'Sent';
  } else if (readCount >= totalMembers - 1) {
    return 'Read by all';
  } else if (readCount === 1) {
    return 'Read by 1';
  } else {
    return `Read by ${readCount}`;
  }
}

/**
 * Get read receipt status icon
 */
export type ReadReceiptStatus = 'sending' | 'sent' | 'delivered' | 'read';

export function getReadReceiptStatus(
  messageStatus: string,
  readCount: number,
  isSentByCurrentUser: boolean
): ReadReceiptStatus {
  if (!isSentByCurrentUser) return 'sent';

  if (messageStatus === 'sending') return 'sending';
  if (readCount > 0) return 'read';
  if (messageStatus === 'delivered') return 'delivered';
  return 'sent';
}
