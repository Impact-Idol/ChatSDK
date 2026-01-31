/**
 * ChatSDK - ChatSDK 2.0 Simplified API
 *
 * Single-token authentication wrapper for ChatClient.
 * Reduces integration complexity from 4 steps to 1.
 *
 * @example Before (ChatSDK 1.x)
 * ```typescript
 * const client = createChatClient({ apiKey: 'xxx', apiUrl: 'http://localhost:5500', wsUrl: 'ws://localhost:8001' });
 * const { token, wsToken } = await fetchToken(userId, displayName);
 * await client.connectUser({ id: userId, name: displayName }, { token, wsToken });
 * ```
 *
 * @example After (ChatSDK 2.0)
 * ```typescript
 * const client = await ChatSDK.connect({
 *   apiKey: 'xxx',
 *   userId: 'user123',
 *   displayName: 'John Doe',
 * });
 * ```
 */
import { ChatClient } from './client/ChatClient';
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
     *   apiKey: 'your-api-key',
     *   userId: 'user123',
     *   displayName: 'John Doe',
     * });
     * ```
     *
     * @example With custom URLs (production)
     * ```typescript
     * const client = await ChatSDK.connect({
     *   apiKey: process.env.CHATSDK_API_KEY,
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
    static async connect(config) {
        const { apiKey, userId, displayName, avatar, email, metadata, apiUrl = 'http://localhost:5500', wsUrl = 'ws://localhost:8001/connection/websocket', debug = false, enableOfflineSupport = false, } = config;
        // 1. Create ChatClient instance
        const client = new ChatClient({
            apiKey,
            apiUrl,
            wsUrl,
            debug,
            enableOfflineSupport,
        });
        if (debug) {
            console.log('[ChatSDK] Connecting to API:', apiUrl);
        }
        try {
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
                throw new Error(`Failed to connect to ChatSDK: ${errorMessage}\n\n💡 ${errorSuggestion}`);
            }
            const data = await response.json();
            // 3. Connect user with tokens
            const user = await client.connectUser({
                id: data.user.id,
                name: data.user.displayName,
                image: data.user.avatar,
                custom: data.user.metadata,
            }, {
                token: data.token, // Access token (15 min)
                wsToken: data._internal.wsToken, // WebSocket token (24 hours)
            });
            // 4. Store refresh token for automatic renewal
            client._refreshToken = data.refreshToken;
            client._tokenExpiresAt = Date.now() + data.expiresIn * 1000;
            if (debug) {
                console.log('[ChatSDK] ✅ Connected successfully', {
                    userId: user.id,
                    displayName: user.name,
                    tokenExpiresIn: `${data.expiresIn}s`,
                });
            }
            return client;
        }
        catch (error) {
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
    static async connectDevelopment(config) {
        const { userId, displayName, avatar, apiUrl = 'http://localhost:5500', wsUrl = 'ws://localhost:8001/connection/websocket', debug = true, // Always debug in dev mode
         } = config;
        // Create ChatClient instance (no API key in dev mode)
        const client = new ChatClient({
            apiKey: 'dev-api-key', // Placeholder
            apiUrl,
            wsUrl,
            debug,
            enableOfflineSupport: false,
        });
        console.log('[ChatSDK] 🔧 Development mode - connecting without API key');
        try {
            // Call development endpoint (no API key required)
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
                    throw new Error('Development mode is not available. The /api/auth/connect-dev endpoint only exists when NODE_ENV !== "production".\n\nUse ChatSDK.connect() with an API key instead.');
                }
                throw new Error(`Failed to connect in dev mode: ${errorMessage}`);
            }
            const data = await response.json();
            // Connect user with tokens
            const user = await client.connectUser({
                id: data.user.id,
                name: data.user.displayName,
                image: data.user.avatar,
            }, {
                token: data.token,
                wsToken: data._internal.wsToken,
            });
            console.log('[ChatSDK] ✅ Connected in development mode', {
                userId: user.id,
                displayName: user.name,
                warning: 'This will not work in production!',
            });
            return client;
        }
        catch (error) {
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
    static async checkHealth(apiUrl = 'http://localhost:5500') {
        try {
            const response = await fetch(`${apiUrl}/health`, {
                method: 'GET',
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
