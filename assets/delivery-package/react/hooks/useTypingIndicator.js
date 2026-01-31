/**
 * useTypingIndicator - Hook for typing indicators
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatClient } from './ChatProvider';
const TYPING_TIMEOUT = 3000; // 3 seconds
/**
 * useTypingIndicator - Handle typing indicators for a channel
 *
 * @example
 * ```tsx
 * const { typingUsers, startTyping, stopTyping } = useTypingIndicator(channelId);
 *
 * // In message input
 * <input
 *   onChange={(e) => {
 *     handleChange(e);
 *     startTyping();
 *   }}
 *   onBlur={stopTyping}
 * />
 *
 * // Show typing indicator
 * {typingUsers.length > 0 && (
 *   <TypingIndicator users={typingUsers} />
 * )}
 * ```
 */
export function useTypingIndicator(channelId) {
    const client = useChatClient();
    const [typingUsers, setTypingUsers] = useState([]);
    // Track typing timeouts per user
    const typingTimeoutsRef = useRef(new Map());
    const isTypingRef = useRef(false);
    const stopTypingTimeoutRef = useRef(null);
    // Subscribe to typing events
    useEffect(() => {
        if (!channelId) {
            setTypingUsers([]);
            return;
        }
        const unsubStart = client.on('typing.start', ({ channelId: cid, user }) => {
            if (cid !== channelId || user.id === client.user?.id)
                return;
            // Clear existing timeout for this user
            const existingTimeout = typingTimeoutsRef.current.get(user.id);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }
            // Add user to typing list
            setTypingUsers((prev) => {
                if (prev.some((u) => u.id === user.id))
                    return prev;
                return [...prev, user];
            });
            // Set timeout to remove user after TYPING_TIMEOUT
            const timeout = setTimeout(() => {
                setTypingUsers((prev) => prev.filter((u) => u.id !== user.id));
                typingTimeoutsRef.current.delete(user.id);
            }, TYPING_TIMEOUT);
            typingTimeoutsRef.current.set(user.id, timeout);
        });
        const unsubStop = client.on('typing.stop', ({ channelId: cid, user }) => {
            if (cid !== channelId || user.id === client.user?.id)
                return;
            // Clear timeout
            const existingTimeout = typingTimeoutsRef.current.get(user.id);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
                typingTimeoutsRef.current.delete(user.id);
            }
            // Remove user from typing list
            setTypingUsers((prev) => prev.filter((u) => u.id !== user.id));
        });
        return () => {
            unsubStart();
            unsubStop();
            // Clear all timeouts
            typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
            typingTimeoutsRef.current.clear();
        };
    }, [client, channelId]);
    // Send typing start
    const startTyping = useCallback(async () => {
        if (!channelId || isTypingRef.current)
            return;
        isTypingRef.current = true;
        await client.sendTypingStart(channelId);
        // Clear any pending stop timeout
        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
        }
        // Auto-stop after TYPING_TIMEOUT
        stopTypingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
        }, TYPING_TIMEOUT);
    }, [client, channelId]);
    // Send typing stop
    const stopTyping = useCallback(async () => {
        if (!channelId || !isTypingRef.current)
            return;
        isTypingRef.current = false;
        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
            stopTypingTimeoutRef.current = null;
        }
        await client.sendTypingStop(channelId);
    }, [client, channelId]);
    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (stopTypingTimeoutRef.current) {
                clearTimeout(stopTypingTimeoutRef.current);
            }
        };
    }, []);
    return {
        typingUsers,
        startTyping,
        stopTyping,
    };
}
/**
 * Format typing users for display
 */
export function formatTypingText(users) {
    if (users.length === 0)
        return '';
    if (users.length === 1)
        return `${users[0].name} is typing...`;
    if (users.length === 2)
        return `${users[0].name} and ${users[1].name} are typing...`;
    return `${users[0].name} and ${users.length - 1} others are typing...`;
}
