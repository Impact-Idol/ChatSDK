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
  type ChatClientOptions,
  type User,
  type ConnectionState,
} from '@chatsdk/core';

interface ChatContextValue {
  client: ChatClient | null;
  user: User | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  connectUser: (user: { id: string; name?: string; image?: string }, token: string) => Promise<User>;
  disconnect: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  children: ReactNode;
  apiKey: string;
  apiUrl?: string;
  wsUrl?: string;
  debug?: boolean;
}

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
export function ChatProvider({
  children,
  apiKey,
  apiUrl,
  wsUrl,
  debug,
}: ChatProviderProps) {
  const [client] = useState(() =>
    createChatClient({
      apiKey,
      apiUrl,
      wsUrl,
      debug,
    })
  );

  const [user, setUser] = useState<User | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Set up connection state listeners
  useEffect(() => {
    const unsubConnecting = client.on('connection.connecting', () => {
      setConnectionState('connecting');
    });

    const unsubConnected = client.on('connection.connected', () => {
      setConnectionState('connected');
    });

    const unsubDisconnected = client.on('connection.disconnected', () => {
      setConnectionState('disconnected');
      setUser(null);
    });

    const unsubReconnecting = client.on('connection.reconnecting', () => {
      setConnectionState('reconnecting');
    });

    return () => {
      unsubConnecting();
      unsubConnected();
      unsubDisconnected();
      unsubReconnecting();
    };
  }, [client]);

  const connectUser = useCallback(
    async (userData: { id: string; name?: string; image?: string }, token: string) => {
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
      connectUser,
      disconnect,
    }),
    [client, user, connectionState, connectUser, disconnect]
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
} {
  const { connectionState, isConnected, isConnecting } = useChatContext();
  return { state: connectionState, isConnected, isConnecting };
}

/**
 * useCurrentUser - Get the currently connected user
 */
export function useCurrentUser(): User | null {
  const { user } = useChatContext();
  return user;
}
