'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * ChatProvider - React context provider for ChatSDK
 */
import { createContext, useContext, useEffect, useState, useCallback, useMemo, } from 'react';
import { createChatClient, ConnectionState, } from '@chatsdk/core';
const ChatContext = createContext(null);
/**
 * ChatProvider - Wrap your app with this provider to enable ChatSDK hooks
 *
 * @example
 * ```tsx
 * <ChatProvider apiKey="your-api-key">
 *   <App />
 * </ChatProvider>
 * ```
 */
export function ChatProvider({ children, apiKey, apiUrl, wsUrl, debug, }) {
    const [client] = useState(() => createChatClient({
        apiKey,
        apiUrl,
        wsUrl,
        debug,
    }));
    const [user, setUser] = useState(null);
    const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
    const [reconnectIn, setReconnectIn] = useState(null);
    // Set up connection state listeners
    useEffect(() => {
        const unsubConnecting = client.on('connection.connecting', () => {
            setConnectionState(ConnectionState.CONNECTING);
        });
        const unsubConnected = client.on('connection.connected', () => {
            setConnectionState(ConnectionState.CONNECTED);
            setReconnectIn(null);
        });
        const unsubDisconnected = client.on('connection.disconnected', () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            setReconnectIn(null);
            setUser(null);
        });
        const unsubReconnecting = client.on('connection.reconnecting', (data) => {
            setConnectionState(ConnectionState.RECONNECTING);
            setReconnectIn(data.reconnectIn ?? null);
        });
        return () => {
            unsubConnecting();
            unsubConnected();
            unsubDisconnected();
            unsubReconnecting();
        };
    }, [client]);
    const connectUser = useCallback(async (userData, token) => {
        const connectedUser = await client.connectUser(userData, token);
        setUser(connectedUser);
        return connectedUser;
    }, [client]);
    const disconnect = useCallback(async () => {
        await client.disconnect();
        setUser(null);
    }, [client]);
    const value = useMemo(() => ({
        client,
        user,
        connectionState,
        isConnected: connectionState === ConnectionState.CONNECTED,
        isConnecting: connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING,
        reconnectIn,
        connectUser,
        disconnect,
    }), [client, user, connectionState, reconnectIn, connectUser, disconnect]);
    return _jsx(ChatContext.Provider, { value: value, children: children });
}
/**
 * useChatContext - Get the full chat context
 */
export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
}
/**
 * useChatClient - Get the ChatClient instance
 */
export function useChatClient() {
    const { client } = useChatContext();
    if (!client) {
        throw new Error('ChatClient not initialized');
    }
    return client;
}
/**
 * useConnectionState - Get the current connection state
 */
export function useConnectionState() {
    const { connectionState, isConnected, isConnecting, reconnectIn } = useChatContext();
    return { state: connectionState, isConnected, isConnecting, reconnectIn };
}
/**
 * useCurrentUser - Get the currently connected user
 */
export function useCurrentUser() {
    const { user } = useChatContext();
    return user;
}
