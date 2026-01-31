/**
 * useReactions - Hook for message reactions
 */
import { useCallback, useEffect } from 'react';
import { useChatClient } from './ChatProvider';
// Common emoji reactions for quick access
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
/**
 * useReactions - Add and remove emoji reactions
 *
 * @example
 * ```tsx
 * const { addReaction, removeReaction, toggleReaction } = useReactions(channelId);
 *
 * // Toggle a reaction
 * <button onClick={() => toggleReaction(message.id, '👍', reaction.own)}>
 *   👍 {reaction.count}
 * </button>
 * ```
 */
export function useReactions(channelId, options = {}) {
    const { onReactionAdded, onReactionRemoved } = options;
    const client = useChatClient();
    // Listen for real-time reaction events
    useEffect(() => {
        if (!channelId)
            return;
        const unsubAdded = client.on('reaction.added', (data) => {
            if (data.channelId === channelId) {
                onReactionAdded?.({
                    messageId: data.messageId,
                    channelId: data.channelId,
                    emoji: data.reaction.type,
                    userId: data.reaction.userId,
                    user: data.reaction.user,
                    added: true,
                });
            }
        });
        const unsubRemoved = client.on('reaction.removed', (data) => {
            if (data.channelId === channelId) {
                onReactionRemoved?.({
                    messageId: data.messageId,
                    channelId: data.channelId,
                    emoji: data.reaction.type,
                    userId: data.reaction.userId,
                    user: data.reaction.user,
                    added: false,
                });
            }
        });
        return () => {
            unsubAdded();
            unsubRemoved();
        };
    }, [channelId, client, onReactionAdded, onReactionRemoved]);
    // Add reaction
    const addReaction = useCallback(async (messageId, emoji) => {
        if (!channelId)
            throw new Error('No channel selected');
        await client.fetch(`/api/channels/${channelId}/messages/${messageId}/reactions`, {
            method: 'POST',
            body: JSON.stringify({ emoji }),
        });
    }, [channelId, client]);
    // Remove reaction
    const removeReaction = useCallback(async (messageId, emoji) => {
        if (!channelId)
            throw new Error('No channel selected');
        await client.fetch(`/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, { method: 'DELETE' });
    }, [channelId, client]);
    // Toggle reaction (add if not own, remove if own)
    const toggleReaction = useCallback(async (messageId, emoji, currentlyOwn) => {
        if (currentlyOwn) {
            await removeReaction(messageId, emoji);
        }
        else {
            await addReaction(messageId, emoji);
        }
    }, [addReaction, removeReaction]);
    return {
        addReaction,
        removeReaction,
        toggleReaction,
    };
}
/**
 * Helper to update reactions in a message array after real-time event
 */
export function updateMessageReactions(messages, messageId, emoji, userId, userName, added, currentUserId) {
    return messages.map((msg) => {
        if (msg.id !== messageId)
            return msg;
        const reactions = [...(msg.reactions || [])];
        const existingIndex = reactions.findIndex((r) => r.type === emoji);
        if (added) {
            if (existingIndex >= 0) {
                // Update existing reaction
                const existing = reactions[existingIndex];
                reactions[existingIndex] = {
                    ...existing,
                    count: existing.count + 1,
                    own: existing.own || userId === currentUserId,
                    users: [...existing.users, { id: userId, name: userName }].slice(0, 5),
                };
            }
            else {
                // Add new reaction
                reactions.push({
                    type: emoji,
                    count: 1,
                    own: userId === currentUserId,
                    users: [{ id: userId, name: userName }],
                });
            }
        }
        else {
            if (existingIndex >= 0) {
                const existing = reactions[existingIndex];
                if (existing.count <= 1) {
                    // Remove reaction entirely
                    reactions.splice(existingIndex, 1);
                }
                else {
                    // Decrement count
                    reactions[existingIndex] = {
                        ...existing,
                        count: existing.count - 1,
                        own: userId === currentUserId ? false : existing.own,
                        users: existing.users.filter((u) => u.id !== userId),
                    };
                }
            }
        }
        return { ...msg, reactions };
    });
}
/**
 * Format reaction count for display
 */
export function formatReactionCount(count) {
    if (count < 1000)
        return String(count);
    if (count < 10000)
        return `${(count / 1000).toFixed(1)}k`;
    return `${Math.floor(count / 1000)}k`;
}
