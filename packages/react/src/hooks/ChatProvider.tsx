'use client';

/**
 * ChatProvider - React context provider for ChatSDK
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  ChatClient,
  createChatClient,
  type ChatTokenSet,
  type ChatTokenProvider,
  type ConnectionState,
  type User,
} from '@chatsdk/core';

interface ChatContextValue {
  client: ChatClient | null;
  user: User | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  reconnectIn: number | null;
  connectUser: (user: { id: string; name?: string; image?: string }, token?: string | ChatTokenSet) => Promise<User>;
  disconnect: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  children: ReactNode;
  client?: ChatClient;
  /**
   * Ignored in browser clients. Use tokenProvider instead.
   * @deprecated ChatProvider is a client component and never sends app API keys.
   */
  apiKey?: string;
  tokenProvider?: ChatTokenProvider;
  apiUrl?: string;
  wsUrl?: string;
  debug?: boolean;
}

/**
 * ChatProvider - Wrap your app with this provider to enable ChatSDK hooks
 *
 * @example
 * ```tsx
 * <ChatProvider tokenProvider={() => fetch('/api/chat-token').then((res) => res.json())}>
 *   <App />
 * </ChatProvider>
 * ```
 */
export function ChatProvider({
  children,
  client: providedClient,
  apiKey: _apiKey,
  tokenProvider,
  apiUrl,
  wsUrl,
  debug,
}: ChatProviderProps) {
  const [client] = useState(() =>
    providedClient ?? createChatClient({
      tokenProvider,
      apiUrl,
      wsUrl,
      debug,
    })
  );

  const [user, setUser] = useState<User | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectIn, setReconnectIn] = useState<number | null>(null);

  // Set up connection state listeners
  useEffect(() => {
    const unsubConnecting = client.on('connection.connecting', () => {
      setConnectionState('connecting');
    });

    const unsubConnected = client.on('connection.connected', () => {
      setConnectionState('connected');
      setReconnectIn(null);
    });

    const unsubDisconnected = client.on('connection.disconnected', () => {
      setConnectionState('disconnected');
      setReconnectIn(null);
      setUser(null);
    });

    const unsubReconnecting = client.on('connection.reconnecting', (data) => {
      setConnectionState('reconnecting');
      setReconnectIn(data.reconnectIn ?? null);
    });

    return () => {
      unsubConnecting();
      unsubConnected();
      unsubDisconnected();
      unsubReconnecting();
    };
  }, [client]);

  const connectUser = useCallback(
    async (userData: { id: string; name?: string; image?: string }, token?: string | ChatTokenSet) => {
      const connectedUser = await client.connectUser(userData, token);
      setUser(connectedUser);
      return connectedUser;
    },
    [client]
  );

  const disconnect = useCallback(async () => {
    await client.disconnect();
    setUser(null);
  }, [client]);

  const value = useMemo<ChatContextValue>(
    () => ({
      client,
      user,
      connectionState,
      isConnected: connectionState === 'connected',
      isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
      reconnectIn,
      connectUser,
      disconnect,
    }),
    [client, user, connectionState, reconnectIn, connectUser, disconnect]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * useChatContext - Get the full chat context
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

/**
 * useChatClient - Get the ChatClient instance
 */
export function useChatClient(): ChatClient {
  const { client } = useChatContext();
  if (!client) {
    throw new Error('ChatClient not initialized');
  }
  return client;
}

/**
 * useConnectionState - Get the current connection state
 */
export function useConnectionState(): {
  state: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  reconnectIn: number | null;
} {
  const { connectionState, isConnected, isConnecting, reconnectIn } = useChatContext();
  return { state: connectionState, isConnected, isConnecting, reconnectIn };
}

/**
 * useCurrentUser - Get the currently connected user
 */
export function useCurrentUser(): User | null {
  const { user } = useChatContext();
  return user;
}
