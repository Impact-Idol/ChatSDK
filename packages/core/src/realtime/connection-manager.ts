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
import type { TokenManager } from '../auth/token-manager';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}

export interface ConnectionManagerConfig {
  /** WebSocket URL */
  url: string;

  /** Token manager for authentication */
  tokenManager: TokenManager;

  /** Minimum reconnection delay in milliseconds (default: 100) */
  minReconnectDelay?: number;

  /** Maximum reconnection delay in milliseconds (default: 2000) */
  maxReconnectDelay?: number;

  /** Maximum number of reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export class ConnectionManager {
  private centrifuge: Centrifuge;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private tokenManager: TokenManager;
  private listeners: ((state: ConnectionState) => void)[] = [];
  private config: Required<ConnectionManagerConfig>;

  constructor(config: ConnectionManagerConfig) {
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

  private setupEventHandlers(): void {
    this.centrifuge.on('connecting', (ctx) => {
      if (this.config.debug) {
        console.log('[ConnectionManager] Connecting...', ctx);
      }

      this.setState(
        this.reconnectAttempts > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING
      );
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
  connect(): void {
    if (this.config.debug) {
      console.log('[ConnectionManager] Initiating connection');
    }
    this.centrifuge.connect();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
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
  getCentrifuge(): Centrifuge {
    return this.centrifuge;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Subscribe to connection state changes
   *
   * @param listener - Callback function that receives state updates
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);

    // Immediate callback with current state (wrapped in try-catch for safety)
    try {
      listener(this.state);
    } catch (error) {
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
  private setState(state: ConnectionState): void {
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
      } catch (error) {
        console.error('[ConnectionManager] Error in state listener', error);
      }
    });
  }

  /**
   * Reset reconnection attempts
   * Useful when manually triggering reconnection
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    if (this.config.debug) {
      console.log('[ConnectionManager] Reconnection attempts reset');
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.config.debug) {
      console.log('[ConnectionManager] Destroying connection manager');
    }

    this.disconnect();
    this.listeners = [];
  }
}
