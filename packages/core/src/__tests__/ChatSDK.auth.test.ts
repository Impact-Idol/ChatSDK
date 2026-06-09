import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('centrifuge', () => ({
  Centrifuge: vi.fn().mockImplementation(function Centrifuge() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      state: 'connected',
      newSubscription: vi.fn().mockReturnValue({
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      }),
      getSubscription: vi.fn().mockReturnValue(null),
    };
  }),
}));

vi.mock('../storage/IndexedDBStorage', () => ({
  IndexedDBStorage: vi.fn().mockImplementation(function IndexedDBStorage() {
    return {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    };
  }),
}));

import { ChatSDK } from '../ChatSDK';
import { ChatClient } from '../client/ChatClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ChatSDK auth modes', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connects with tokenProvider without calling the API-key token broker', async () => {
    const tokenProvider = vi.fn().mockResolvedValue({
      token: 'api-token',
      wsToken: 'ws-token',
      expiresIn: 900,
      user: {
        id: 'user-1',
        displayName: 'User One',
      },
    });

    const client = await ChatSDK.connect({
      tokenProvider,
      userId: 'user-1',
      displayName: 'User One',
      apiUrl: 'http://localhost:5500',
      wsUrl: 'ws://localhost:8001/connection/websocket',
    });

    expect(tokenProvider).toHaveBeenCalledWith({
      id: 'user-1',
      name: 'User One',
      image: undefined,
      custom: undefined,
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(client.user?.id).toBe('user-1');
    expect((client as any).token).toBe('api-token');
    expect((client as any).wsToken).toBe('ws-token');
  });

  it('requires tokenProvider when apiKey is not supplied', async () => {
    await expect(
      ChatSDK.connect({
        userId: 'user-1',
        displayName: 'User One',
      })
    ).rejects.toThrow('requires tokenProvider');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects legacy apiKey token brokering in browser runtimes', async () => {
    vi.stubGlobal('window', { document: {} });
    vi.stubGlobal('document', {});

    await expect(
      ChatSDK.connect({
        apiKey: 'server-key',
        userId: 'user-1',
        displayName: 'User One',
      })
    ).rejects.toThrow('apiKey is server-only');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects direct apiKey ChatClient configuration in browser runtimes', () => {
    vi.stubGlobal('window', { document: {} });
    vi.stubGlobal('document', {});

    expect(() => new ChatClient({ apiKey: 'server-key' })).toThrow('apiKey is server-only');
  });

  it('does not retain apiKey on the connected user client after legacy token brokering', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'api-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          displayName: 'User One',
        },
        _internal: {
          wsToken: 'ws-token',
        },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ channels: [] }),
    });

    const client = await ChatSDK.connect({
      apiKey: 'server-key',
      userId: 'user-1',
      displayName: 'User One',
      apiUrl: 'http://localhost:5500',
      wsUrl: 'ws://localhost:8001/connection/websocket',
    });

    await client.fetch('/api/channels');

    const brokerHeaders = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(brokerHeaders['X-API-Key']).toBe('server-key');

    const userHeaders = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
    expect(userHeaders.Authorization).toBe('Bearer api-token');
    expect(userHeaders['X-API-Key']).toBeUndefined();
  });

  it('forwards refreshed websocket tokens from legacy token refresh', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'api-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          displayName: 'User One',
        },
        _internal: {
          wsToken: 'ws-token',
        },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'refreshed-api-token',
        refreshToken: 'refreshed-refresh-token',
        expiresIn: 900,
        _internal: {
          wsToken: 'refreshed-ws-token',
        },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ channels: [] }),
    });

    const client = await ChatSDK.connect({
      apiKey: 'server-key',
      userId: 'user-1',
      displayName: 'User One',
      apiUrl: 'http://localhost:5500',
      wsUrl: 'ws://localhost:8001/connection/websocket',
    });

    (client as any).tokenExpiresAt = Date.now() - 1000;
    await client.fetch('/api/channels');

    expect((client as any).token).toBe('refreshed-api-token');
    expect((client as any).wsToken).toBe('refreshed-ws-token');
    const userHeaders = mockFetch.mock.calls[2][1]?.headers as Record<string, string>;
    expect(userHeaders.Authorization).toBe('Bearer refreshed-api-token');
    expect(userHeaders['X-API-Key']).toBeUndefined();
  });

  it('refreshes REST bearer tokens with the configured tokenProvider', async () => {
    const tokenProvider = vi
      .fn()
      .mockResolvedValueOnce({
        token: 'initial-token',
        wsToken: 'ws-token',
        expiresIn: 1,
      })
      .mockResolvedValueOnce({
        token: 'refreshed-token',
        wsToken: 'ws-token',
        expiresIn: 900,
      });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ channels: [] }),
    });

    const client = await ChatSDK.connect({
      tokenProvider,
      userId: 'user-1',
      displayName: 'User One',
      apiUrl: 'http://localhost:5500',
      wsUrl: 'ws://localhost:8001/connection/websocket',
    });

    (client as any).tokenExpiresAt = Date.now() - 1000;
    await client.fetch('/api/channels');

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer refreshed-token');
    expect(headers['X-API-Key']).toBeUndefined();
  });
});
