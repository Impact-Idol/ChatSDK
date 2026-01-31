/**
 * Connection Manager
 *
 * Manages WebSocket connection lifecycle with automatic recovery.
 * Integrates with TokenManager for seamless token refresh on reconnection.
 *
 * Features:
 * - Fast reconnection (<2s instead of default 10s)
 * - Automatic token refresh on reconnection
 * - Connection state tracking with subscribe pattern
 * - Exponential backoff with configurable limits
 */
import { Centrifuge } from 'centrifuge';
export var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCONNECTED"] = "DISCONNECTED";
    ConnectionState["CONNECTING"] = "CONNECTING";
    ConnectionState["CONNECTED"] = "CONNECTED";
    ConnectionState["RECONNECTING"] = "RECONNECTING";
    ConnectionState["FAILED"] = "FAILED";
})(ConnectionState || (ConnectionState = {}));
export class ConnectionManager {
    constructor(config) {
        this.state = ConnectionState.DISCONNECTED;
        this.reconnectAttempts = 0;
        this.listeners = [];
        this.config = {
            url: config.url,
            tokenManager: config.tokenManager,
            minReconnectDelay: config.minReconnectDelay || 100,
            maxReconnectDelay: config.maxReconnectDelay || 2000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            debug: config.debug || false,
        };
        this.tokenManager = config.tokenManager;
        if (this.config.debug) {
            console.log('[ConnectionManager] Initializing with config', {
                url: this.config.url,
                minReconnectDelay: this.config.minReconnectDelay,
                maxReconnectDelay: this.config.maxReconnectDelay,
                maxReconnectAttempts: this.config.maxReconnectAttempts,
            });
        }
        this.centrifuge = new Centrifuge(config.url, {
            // Get fresh token for each connection
            getToken: async () => {
                if (this.config.debug) {
                    console.log('[ConnectionManager] Getting fresh token for connection');
                }
                const token = await this.tokenManager.getValidToken();
                return token;
            },
            // Fast reconnection configuration
            minReconnectDelay: this.config.minReconnectDelay,
            maxReconnectDelay: this.config.maxReconnectDelay,
            // Enable debug mode
            debug: this.config.debug,
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.centrifuge.on('connecting', (ctx) => {
            if (this.config.debug) {
                console.log('[ConnectionManager] Connecting...', ctx);
            }
            this.setState(this.reconnectAttempts > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING);
        });
        this.centrifuge.on('connected', (ctx) => {
            if (this.config.debug) {
                console.log('[ConnectionManager] Connected successfully', ctx);
            }
            this.reconnectAttempts = 0; // Reset on successful connection
            this.setState(ConnectionState.CONNECTED);
        });
        this.centrifuge.on('disconnected', (ctx) => {
            if (this.config.debug) {
                console.log('[ConnectionManager] Disconnected', ctx);
            }
            this.setState(ConnectionState.DISCONNECTED);
        });
        this.centrifuge.on('error', (ctx) => {
            console.error('[ConnectionManager] Connection error', ctx);
        });
    }
    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.config.debug) {
            console.log('[ConnectionManager] Initiating connection');
        }
        this.centrifuge.connect();
    }
    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.config.debug) {
            console.log('[ConnectionManager] Disconnecting');
        }
        this.centrifuge.disconnect();
        this.setState(ConnectionState.DISCONNECTED);
    }
    /**
     * Get the underlying Centrifuge instance
     * Useful for subscribing to channels
     */
    getCentrifuge() {
        return this.centrifuge;
    }
    /**
     * Get current connection state
     */
    getState() {
        return this.state;
    }
    /**
     * Check if currently connected
     */
    isConnected() {
        return this.state === ConnectionState.CONNECTED;
    }
    /**
     * Subscribe to connection state changes
     *
     * @param listener - Callback function that receives state updates
     * @returns Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        // Immediate callback with current state (wrapped in try-catch for safety)
        try {
            listener(this.state);
        }
        catch (error) {
            console.error('[ConnectionManager] Error in state listener (immediate callback)', error);
        }
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    /**
     * Update state and notify all listeners
     */
    setState(state) {
        const previousState = this.state;
        this.state = state;
        if (this.config.debug && previousState !== state) {
            console.log('[ConnectionManager] State changed', {
                from: previousState,
                to: state,
            });
        }
        // Notify all listeners
        this.listeners.forEach((listener) => {
            try {
                listener(state);
            }
            catch (error) {
                console.error('[ConnectionManager] Error in state listener', error);
            }
        });
    }
    /**
     * Reset reconnection attempts
     * Useful when manually triggering reconnection
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
        if (this.config.debug) {
            console.log('[ConnectionManager] Reconnection attempts reset');
        }
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.config.debug) {
            console.log('[ConnectionManager] Destroying connection manager');
        }
        this.disconnect();
        this.listeners = [];
    }
}
