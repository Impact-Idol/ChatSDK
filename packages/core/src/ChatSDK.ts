/**
 * ChatSDK - ChatSDK 2.0 Simplified API
 *
 * Single-token authentication wrapper for ChatClient.
 * Reduces integration complexity from 4 steps to 1.
 *
 * @example Before (ChatSDK 1.x)
 * ```typescript
 * const client = createChatClient({ apiUrl: 'http://localhost:5500', wsUrl: 'ws://localhost:8001' });
 * const { token, wsToken } = await fetchToken(userId, displayName);
 * await client.connectUser({ id: userId, name: displayName }, { token, wsToken });
 * ```
 *
 * @example After (ChatSDK 2.0)
 * ```typescript
 * const client = await ChatSDK.connect({
 *   tokenProvider: () => fetch('/api/chat-token').then((res) => res.json()),
 *   userId: 'user123',
 *   displayName: 'John Doe',
 * });
 * ```
 */

import { ChatClient } from './client/ChatClient';
import type { ChatTokenProvider, ChatTokenSet, User } from './types';

function isClientRuntime(): boolean {
  return (
    (typeof window !== 'undefined' && typeof document !== 'undefined') ||
    (typeof navigator !== 'undefined' && navigator.product === 'ReactNative')
  );
}

export interface ChatSDKConnectConfig {
  /**
   * Server/app API key. Prefer tokenProvider for browser clients.
   * @deprecated Browser clients should use bearer tokens from tokenProvider instead.
   */
  apiKey?: string;

  /** Supplies user-scoped API and WebSocket tokens. Recommended for browser clients. */
  tokenProvider?: ChatTokenProvider;

  /** User ID (required) */
  userId: string;

  /** Display name (optional, defaults to userId) */
  displayName?: string;

  /** Avatar URL (optional) */
  avatar?: string;

  /** Email (optional) */
  email?: string;

  /** Custom metadata (optional) */
  metadata?: Record<string, any>;

  /** API base URL (optional, defaults to http://localhost:5500) */
  apiUrl?: string;

  /** WebSocket URL (optional, defaults to ws://localhost:8001/connection/websocket) */
  wsUrl?: string;

  /** Enable debug logging (optional) */
  debug?: boolean;

  /** Enable offline support (optional) */
  enableOfflineSupport?: boolean;
}

export class ChatSDK {
  /**
   * Connect to ChatSDK with single-token authentication
   *
   * This is the recommended way to connect in ChatSDK 2.0.
   * It handles token generation internally and returns a connected ChatClient.
   *
   * @example Basic usage
 * ```typescript
 * const client = await ChatSDK.connect({
 *   tokenProvider: () => fetch('/api/chat-token').then((res) => res.json()),
 *   userId: 'user123',
 *   displayName: 'John Doe',
 * });
   * ```
   *
   * @example With custom URLs (production)
 * ```typescript
 * const client = await ChatSDK.connect({
 *   tokenProvider: () => fetch('/api/chat-token').then((res) => res.json()),
 *   userId: currentUser.id,
 *   displayName: currentUser.name,
   *   avatar: currentUser.avatar,
   *   apiUrl: 'https://api.example.com',
   *   wsUrl: 'wss://ws.example.com/connection/websocket',
   * });
   * ```
   *
   * @param config - Connection configuration
   * @returns Connected ChatClient instance
   * @throws Error if connection fails
   */
  static async connect(config: ChatSDKConnectConfig): Promise<ChatClient> {
    const {
      apiKey,
      tokenProvider,
      userId,
      displayName,
      avatar,
      email,
      metadata,
      apiUrl = 'http://localhost:5500',
      wsUrl = 'ws://localhost:8001/connection/websocket',
      debug = false,
      enableOfflineSupport = false,
    } = config;

    if (debug) {
      console.log('[ChatSDK] Connecting to API:', apiUrl);
    }

    try {
      if (tokenProvider) {
        const client = new ChatClient({
          tokenProvider,
          apiUrl,
          wsUrl,
          debug,
          enableOfflineSupport,
        });

        const tokens = await tokenProvider({
          id: userId,
          name: displayName,
          image: avatar,
          custom: metadata,
        });

        const tokenUser = tokens.user;
        const user: User = await client.connectUser(
          {
            id: tokenUser?.id ?? userId,
            name: tokenUser?.displayName ?? tokenUser?.name ?? displayName ?? userId,
            image: tokenUser?.avatar ?? tokenUser?.image ?? avatar,
            custom: tokenUser?.metadata ?? tokenUser?.custom ?? metadata,
          },
          tokens
        );

        this.storeTokenMetadata(client, tokens);

        if (debug) {
          console.log('[ChatSDK] Connected successfully', {
            userId: user.id,
            displayName: user.name,
            tokenExpiresIn: tokens.expiresIn ? `${tokens.expiresIn}s` : undefined,
          });
        }

        return client;
      }

      if (!apiKey) {
        throw new Error('ChatSDK.connect requires tokenProvider for browser clients or apiKey for legacy server-side token brokering.');
      }

      if (isClientRuntime()) {
        throw new Error('ChatSDK.connect apiKey is server-only. Browser and mobile clients must use tokenProvider.');
      }

      // 2. Call /api/auth/connect to generate tokens
      const response = await fetch(`${apiUrl}/api/auth/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          userId,
          displayName,
          avatar,
          email,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorSuggestion = errorData?.error?.suggestion || 'Check your API key and network connection';

        throw new Error(
          `Failed to connect to ChatSDK: ${errorMessage}\n\n💡 ${errorSuggestion}`
        );
      }

      const data = await response.json();
      let latestRefreshToken = data.refreshToken;
      const refreshProvider: ChatTokenProvider = async () => {
        if (!latestRefreshToken) {
          throw new Error('Missing ChatSDK refresh token');
        }

        const refreshResponse = await fetch(`${apiUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${latestRefreshToken}`,
          },
        });

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.json().catch(() => null);
          const errorMessage = errorData?.error?.message || `HTTP ${refreshResponse.status}`;
          throw new Error(`Failed to refresh ChatSDK token: ${errorMessage}`);
        }

        const refreshData = await refreshResponse.json();
        latestRefreshToken = refreshData.refreshToken ?? latestRefreshToken;
        return {
          token: refreshData.token,
          wsToken: refreshData.wsToken ?? refreshData._internal?.wsToken,
          refreshToken: latestRefreshToken,
          expiresIn: refreshData.expiresIn,
        };
      };
      const tokens: ChatTokenSet = {
        token: data.token,
        wsToken: data._internal.wsToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      };

      const client = new ChatClient({
        tokenProvider: refreshProvider,
        apiUrl,
        wsUrl,
        debug,
        enableOfflineSupport,
      });

      // 3. Connect user with tokens
      const user: User = await client.connectUser(
        {
          id: data.user.id,
          name: data.user.displayName,
          image: data.user.avatar,
          custom: data.user.metadata,
        },
        tokens
      );

      // 4. Store refresh token for automatic renewal
      this.storeTokenMetadata(client, tokens);

      if (debug) {
        console.log('[ChatSDK] ✅ Connected successfully', {
          userId: user.id,
          displayName: user.name,
          tokenExpiresIn: `${data.expiresIn}s`,
        });
      }

      return client;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to ChatSDK: ' + String(error));
    }
  }

  /**
   * Development Mode - Connect without API key
   *
   * ONLY WORKS IN DEVELOPMENT (when API server is not in production mode)
   *
   * Useful for quick prototyping and testing without setting up API keys.
   *
   * @example
   * ```typescript
   * const client = await ChatSDK.connectDevelopment({
   *   userId: 'alice',
   *   displayName: 'Alice Johnson',
   * });
   * ```
   *
   * @param config - Minimal configuration (no API key needed)
   * @returns Connected ChatClient instance
   */
  static async connectDevelopment(config: {
    userId: string;
    displayName?: string;
    avatar?: string;
    apiUrl?: string;
    wsUrl?: string;
    debug?: boolean;
  }): Promise<ChatClient> {
    const {
      userId,
      displayName,
      avatar,
      apiUrl = 'http://localhost:5500',
      wsUrl = 'ws://localhost:8001/connection/websocket',
      debug = true, // Always debug in dev mode
    } = config;

    const tokenProvider: ChatTokenProvider = async () => {
      const response = await fetch(`${apiUrl}/api/auth/connect-dev`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          displayName,
          avatar,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;

        if (response.status === 404) {
          throw new Error(
            'Development mode is not available. The /api/auth/connect-dev endpoint only exists when NODE_ENV !== "production".\n\nUse ChatSDK.connect() with a backend tokenProvider instead.'
          );
        }

        throw new Error(`Failed to connect in dev mode: ${errorMessage}`);
      }

      const data = await response.json();
      return {
        token: data.token,
        wsToken: data._internal?.wsToken ?? data.wsToken ?? data.token,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        user: data.user,
      };
    };

    // Create ChatClient instance (no API key in dev mode)
    const client = new ChatClient({
      tokenProvider,
      apiUrl,
      wsUrl,
      debug,
      enableOfflineSupport: false,
    });

    console.log('[ChatSDK] 🔧 Development mode - connecting without API key');

    try {
      const data = await tokenProvider();
      const tokenUser = data.user;

      // Connect user with tokens
      const user: User = await client.connectUser(
        {
          id: tokenUser?.id ?? userId,
          name: tokenUser?.displayName ?? tokenUser?.name ?? displayName ?? userId,
          image: tokenUser?.avatar ?? tokenUser?.image ?? avatar,
        },
        {
          token: data.token,
          wsToken: data.wsToken ?? data.token,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        }
      );

      console.log('[ChatSDK] ✅ Connected in development mode', {
        userId: user.id,
        displayName: user.name,
        warning: 'This will not work in production!',
      });

      return client;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect in dev mode: ' + String(error));
    }
  }

  /**
   * Check if ChatSDK API is reachable
   *
   * Useful for debugging connection issues.
   *
   * @param apiUrl - API base URL
   * @returns true if API is reachable, false otherwise
   */
  static async checkHealth(apiUrl: string = 'http://localhost:5500'): Promise<boolean> {
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private static storeTokenMetadata(client: ChatClient, tokens: ChatTokenSet): void {
    if (tokens.refreshToken) {
      (client as any)._refreshToken = tokens.refreshToken;
    }
    if (tokens.expiresIn) {
      (client as any)._tokenExpiresAt = Date.now() + tokens.expiresIn * 1000;
    }
  }
}
