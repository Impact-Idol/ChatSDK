import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionManager, ConnectionState } from './connection-manager';
import { TokenManager } from '../auth/token-manager';
import { Centrifuge } from 'centrifuge';

// Mock Centrifuge
vi.mock('centrifuge', () => {
  const mockCentrifuge = {
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    state: 'disconnected',
  };

  return {
    Centrifuge: vi.fn(() => mockCentrifuge),
  };
});

describe('ConnectionManager', () => {
  let tokenManager: TokenManager;
  let mockCentrifuge: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock token manager
    tokenManager = {
      getValidToken: vi.fn().mockResolvedValue('test-token-123'),
      setTokens: vi.fn(),
      hasTokens: vi.fn().mockReturnValue(true),
      getAccessToken: vi.fn().mockReturnValue('test-token-123'),
      clearTokens: vi.fn(),
      getTokenExpiration: vi.fn(),
      refreshToken: vi.fn(),
      destroy: vi.fn(),
    } as any;

    // Get the mock Centrifuge instance
    mockCentrifuge = new Centrifuge('ws://localhost:8001/connection/websocket', {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('creates ConnectionManager with required config', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      expect(manager).toBeDefined();
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(Centrifuge).toHaveBeenCalledWith(
        'ws://localhost:8001/connection/websocket',
        expect.objectContaining({
          minReconnectDelay: 100,
          maxReconnectDelay: 2000,
        })
      );

      manager.destroy();
    });

    it('accepts custom reconnection config', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
        minReconnectDelay: 200,
        maxReconnectDelay: 5000,
        maxReconnectAttempts: 20,
        debug: true,
      });

      expect(manager).toBeDefined();
      expect(Centrifuge).toHaveBeenCalledWith(
        'ws://localhost:8001/connection/websocket',
        expect.objectContaining({
          minReconnectDelay: 200,
          maxReconnectDelay: 5000,
        })
      );

      manager.destroy();
    });

    it('sets up event handlers on initialization', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      expect(mockCentrifuge.on).toHaveBeenCalledWith('connecting', expect.any(Function));
      expect(mockCentrifuge.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockCentrifuge.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockCentrifuge.on).toHaveBeenCalledWith('error', expect.any(Function));

      manager.destroy();
    });
  });

  describe('Connection Management', () => {
    it('connects to WebSocket server', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      manager.connect();

      expect(mockCentrifuge.connect).toHaveBeenCalled();

      manager.destroy();
    });

    it('disconnects from WebSocket server', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      manager.connect();
      manager.disconnect();

      expect(mockCentrifuge.disconnect).toHaveBeenCalled();
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);

      manager.destroy();
    });

    it('provides access to underlying Centrifuge instance', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const centrifuge = manager.getCentrifuge();

      expect(centrifuge).toBe(mockCentrifuge);

      manager.destroy();
    });
  });

  describe('State Management', () => {
    it('starts in DISCONNECTED state', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(manager.isConnected()).toBe(false);

      manager.destroy();
    });

    it('transitions to CONNECTING on first connection', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // Get the 'connecting' handler
      const connectingHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connecting'
      )[1];

      // Trigger connecting event
      connectingHandler({ code: 0, reason: '' });

      expect(manager.getState()).toBe(ConnectionState.CONNECTING);

      manager.destroy();
    });

    it('transitions to CONNECTED on successful connection', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // Get the 'connected' handler
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];

      // Trigger connected event
      connectedHandler({ client: 'test', version: '1.0' });

      expect(manager.getState()).toBe(ConnectionState.CONNECTED);
      expect(manager.isConnected()).toBe(true);

      manager.destroy();
    });

    it('transitions to DISCONNECTED on disconnect', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // First connect
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      // Then disconnect
      const disconnectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'disconnected'
      )[1];
      disconnectedHandler({ code: 1000, reason: 'normal closure' });

      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);

      manager.destroy();
    });
  });

  describe('Token Integration', () => {
    it('requests token from TokenManager on connection', async () => {
      new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // Get the Centrifuge config from constructor call
      const constructorArgs = (Centrifuge as any).mock.calls[
        (Centrifuge as any).mock.calls.length - 1
      ];
      const centrifugeConfig = constructorArgs[1];

      // Call getToken function
      const token = await centrifugeConfig.getToken();

      expect(tokenManager.getValidToken).toHaveBeenCalled();
      expect(token).toBe('test-token-123');
    });

    it('handles token refresh errors gracefully', async () => {
      const failingTokenManager = {
        getValidToken: vi.fn().mockRejectedValue(new Error('Token expired')),
      } as any;

      new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager: failingTokenManager,
      });

      // Get the Centrifuge config from constructor call
      const constructorArgs = (Centrifuge as any).mock.calls[
        (Centrifuge as any).mock.calls.length - 1
      ];
      const centrifugeConfig = constructorArgs[1];

      // Call getToken function should throw
      await expect(centrifugeConfig.getToken()).rejects.toThrow('Token expired');
    });
  });

  describe('Reconnection Logic', () => {
    it('transitions to RECONNECTING on subsequent connection attempts', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // Simulate reconnect attempt by triggering connecting event with reconnectAttempts > 0
      // First, manually set reconnectAttempts
      (manager as any).reconnectAttempts = 1;

      // Trigger connecting event
      const connectingHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connecting'
      )[1];
      connectingHandler({ code: 0, reason: '' });

      expect(manager.getState()).toBe(ConnectionState.RECONNECTING);

      manager.destroy();
    });

    it('configures fast reconnection delays', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
        minReconnectDelay: 100,
        maxReconnectDelay: 2000,
      });

      // Get the Centrifuge config from constructor call
      const constructorArgs = (Centrifuge as any).mock.calls[
        (Centrifuge as any).mock.calls.length - 1
      ];
      const centrifugeConfig = constructorArgs[1];

      // Verify reconnection delays are configured correctly
      expect(centrifugeConfig.minReconnectDelay).toBe(100);
      expect(centrifugeConfig.maxReconnectDelay).toBe(2000);

      manager.destroy();
    });

    it('resets reconnection attempts on successful connection', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // Simulate failed connection attempts
      (manager as any).reconnectAttempts = 3;

      // Trigger successful connection
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      // Verify reconnect attempts reset to 0
      expect((manager as any).reconnectAttempts).toBe(0);

      manager.destroy();
    });

    it('allows manual reset of reconnection attempts', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      // Simulate failed connection attempts
      (manager as any).reconnectAttempts = 5;

      // Manually reset
      manager.resetReconnectAttempts();

      // Verify reconnect attempts reset to 0
      expect((manager as any).reconnectAttempts).toBe(0);

      manager.destroy();
    });
  });

  describe('Subscription Pattern', () => {
    it('allows subscribing to state changes', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const listener = vi.fn();
      manager.subscribe(listener);

      // Should call immediately with current state
      expect(listener).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);

      manager.destroy();
    });

    it('notifies subscribers on state change', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const listener = vi.fn();
      manager.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      // Trigger state change
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      expect(listener).toHaveBeenCalledWith(ConnectionState.CONNECTED);

      manager.destroy();
    });

    it('supports multiple subscribers', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      manager.subscribe(listener1);
      manager.subscribe(listener2);
      manager.subscribe(listener3);

      // Clear initial calls
      listener1.mockClear();
      listener2.mockClear();
      listener3.mockClear();

      // Trigger state change
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      expect(listener1).toHaveBeenCalledWith(ConnectionState.CONNECTED);
      expect(listener2).toHaveBeenCalledWith(ConnectionState.CONNECTED);
      expect(listener3).toHaveBeenCalledWith(ConnectionState.CONNECTED);

      manager.destroy();
    });

    it('allows unsubscribing from state changes', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      // Unsubscribe
      unsubscribe();

      // Trigger state change
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      // Should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('handles listener errors gracefully', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      manager.subscribe(errorListener);
      manager.subscribe(normalListener);

      // Clear initial calls
      errorListener.mockClear();
      normalListener.mockClear();

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger state change
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      // Error listener should have been called and thrown
      expect(errorListener).toHaveBeenCalled();

      // Normal listener should still be called despite error
      expect(normalListener).toHaveBeenCalledWith(ConnectionState.CONNECTED);

      consoleErrorSpy.mockRestore();

      manager.destroy();
    });
  });

  describe('Cleanup', () => {
    it('cleans up resources on destroy', () => {
      const manager = new ConnectionManager({
        url: 'ws://localhost:8001/connection/websocket',
        tokenManager,
      });

      const listener = vi.fn();
      manager.subscribe(listener);

      manager.destroy();

      // Should disconnect
      expect(mockCentrifuge.disconnect).toHaveBeenCalled();
      expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);

      // Clear listener call
      listener.mockClear();

      // Trigger state change after destroy (simulate late event)
      const connectedHandler = mockCentrifuge.on.mock.calls.find(
        (call: any) => call[0] === 'connected'
      )[1];
      connectedHandler({ client: 'test', version: '1.0' });

      // Listeners should be cleared, so no notification
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
