import { beforeEach, describe, expect, it, vi } from 'vitest';

const centrifugeMock = vi.hoisted(() => {
  const newSubscription = vi.fn();
  const getSubscription = vi.fn();
  const connect = vi.fn();
  const disconnect = vi.fn();
  const on = vi.fn();

  return {
    connect,
    disconnect,
    on,
    newSubscription,
    getSubscription,
    Centrifuge: vi.fn().mockImplementation(function Centrifuge() {
      return {
      connect,
      disconnect,
      on,
      state: 'connected',
      newSubscription,
      getSubscription,
      };
    }),
  };
});

vi.mock('centrifuge', () => ({
  Centrifuge: centrifugeMock.Centrifuge,
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

import { ChatClient } from '../client/ChatClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jwtWithAppId(appId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'user-1', app_id: appId })).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('ChatClient realtime subscription auth', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    centrifugeMock.Centrifuge.mockClear();
    centrifugeMock.connect.mockClear();
    centrifugeMock.disconnect.mockClear();
    centrifugeMock.on.mockClear();
    centrifugeMock.getSubscription.mockReset();
    centrifugeMock.getSubscription.mockReturnValue(null);
    centrifugeMock.newSubscription.mockReset();
    centrifugeMock.newSubscription.mockReturnValue({
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      state: 'unsubscribed',
    });
  });

  it('requests a backend subscription token for each namespaced channel subscription', async () => {
    const client = new ChatClient({
      apiUrl: 'http://api.local',
      wsUrl: 'ws://ws.local/connection/websocket',
      enableOfflineSupport: false,
      tokenProvider: vi.fn(),
    });

    await client.connectUser(
      { id: 'user-1', name: 'User One' },
      {
        token: 'api-token',
        wsToken: jwtWithAppId('app-1'),
        expiresIn: 900,
      }
    );

    await client.subscribeToChannel('channel-1');

    expect(centrifugeMock.newSubscription).toHaveBeenCalledWith(
      'chat:app-1:channel-1',
      expect.objectContaining({
        getToken: expect.any(Function),
      })
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: 'subscription-token', expiresIn: 900 }),
      headers: new Headers(),
    });

    const [, subscriptionOptions] = centrifugeMock.newSubscription.mock.calls.find(
      ([channel]) => channel === 'chat:app-1:channel-1'
    )!;
    const token = await subscriptionOptions.getToken();

    expect(token).toBe('subscription-token');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.local/api/realtime/subscription-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ channel: 'chat:app-1:channel-1' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer api-token',
        }),
      })
    );
  });

  it('does not dedupe rapidly repeated subscription token callbacks', async () => {
    const client = new ChatClient({
      apiUrl: 'http://api.local',
      wsUrl: 'ws://ws.local/connection/websocket',
      enableOfflineSupport: false,
      tokenProvider: vi.fn(),
    });

    await client.connectUser(
      { id: 'user-1', name: 'User One' },
      {
        token: 'api-token',
        wsToken: jwtWithAppId('app-1'),
        expiresIn: 900,
      }
    );

    await client.subscribeToChannel('channel-1');
    const [, subscriptionOptions] = centrifugeMock.newSubscription.mock.calls.find(
      ([channel]) => channel === 'chat:app-1:channel-1'
    )!;

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: 'subscription-token-1' }),
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: 'subscription-token-2' }),
        headers: new Headers(),
      });

    await expect(subscriptionOptions.getToken()).resolves.toBe('subscription-token-1');
    await expect(subscriptionOptions.getToken()).resolves.toBe('subscription-token-2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('dispatches server-published channel lifecycle and unread events', async () => {
    const client = new ChatClient({
      apiUrl: 'http://api.local',
      wsUrl: 'ws://ws.local/connection/websocket',
      enableOfflineSupport: false,
      tokenProvider: vi.fn(),
    });

    const created = vi.fn();
    const deleted = vi.fn();
    const unread = vi.fn();
    const totalUnread = vi.fn();

    client.on('channel.created', created);
    client.on('channel.deleted', deleted);
    client.on('channel.unread_changed', unread);
    client.on('channel.total_unread_changed', totalUnread);

    (client as any).handlePublication('user:app-1:user-1', {
      data: {
        type: 'channel.created',
        payload: { channel: { id: 'channel-1', type: 'messaging', memberCount: 2 } },
      },
    });
    (client as any).handlePublication('chat:app-1:channel-1', {
      data: {
        type: 'channel.deleted',
        payload: { channelId: 'channel-1' },
      },
    });
    (client as any).handlePublication('user:app-1:user-1', {
      data: {
        type: 'channel.unread_changed',
        payload: { channelId: 'channel-1', count: 3 },
      },
    });
    (client as any).handlePublication('user:app-1:user-1', {
      data: {
        type: 'channel.total_unread_changed',
        payload: { count: 7 },
      },
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(created).toHaveBeenCalledWith({
      channel: { id: 'channel-1', type: 'messaging', memberCount: 2 },
    });
    expect(deleted).toHaveBeenCalledWith({ channelId: 'channel-1' });
    expect(unread).toHaveBeenCalledWith({ channelId: 'channel-1', count: 3 });
    expect(totalUnread).toHaveBeenCalledWith({ count: 7 });
  });

  it('dispatches durable membership, workspace, read receipt, and poll events', async () => {
    const client = new ChatClient({
      apiUrl: 'http://api.local',
      wsUrl: 'ws://ws.local/connection/websocket',
      enableOfflineSupport: false,
      tokenProvider: vi.fn(),
    });

    const joined = vi.fn();
    const left = vi.fn();
    const workspaceCreated = vi.fn();
    const workspaceUpdated = vi.fn();
    const workspaceDeleted = vi.fn();
    const workspaceMemberJoined = vi.fn();
    const readReceipt = vi.fn();
    const pollCreated = vi.fn();
    const pollVoted = vi.fn();
    const pollVoteRemoved = vi.fn();

    client.on('channel.member_joined', joined);
    client.on('channel.member_left', left);
    client.on('workspace.created', workspaceCreated);
    client.on('workspace.updated', workspaceUpdated);
    client.on('workspace.deleted', workspaceDeleted);
    client.on('workspace.member_joined', workspaceMemberJoined);
    client.on('read_receipt', readReceipt);
    client.on('poll.created', pollCreated);
    client.on('poll.voted', pollVoted);
    client.on('poll.vote_removed', pollVoteRemoved);

    const events = [
      {
        type: 'channel.member_joined',
        payload: { channelId: 'channel-1', userId: 'user-2' },
      },
      {
        type: 'channel.member_left',
        payload: { channelId: 'channel-1', userId: 'user-2' },
      },
      {
        type: 'workspace.created',
        payload: { workspace: { id: 'workspace-1', name: 'Workspace' } },
      },
      {
        type: 'workspace.updated',
        payload: { workspace: { id: 'workspace-1', name: 'Updated' } },
      },
      {
        type: 'workspace.deleted',
        payload: { workspaceId: 'workspace-1' },
      },
      {
        type: 'workspace.member_joined',
        payload: { workspaceId: 'workspace-1', userId: 'user-2' },
      },
      {
        type: 'read_receipt',
        payload: {
          channelId: 'channel-1',
          userId: 'user-2',
          userName: 'User Two',
          messageId: 'message-1',
          readAt: '2026-06-08T00:00:00.000Z',
        },
      },
      {
        type: 'poll.created',
        payload: {
          channelId: 'channel-1',
          messageId: 'message-1',
          poll: { id: 'poll-1', question: 'Yes?' },
        },
      },
      {
        type: 'poll.voted',
        payload: {
          channelId: 'channel-1',
          pollId: 'poll-1',
          userId: null,
          totalVotes: 3,
        },
      },
      {
        type: 'poll.vote_removed',
        payload: {
          channelId: 'channel-1',
          pollId: 'poll-1',
          userId: null,
          totalVotes: 2,
        },
      },
    ];

    for (const event of events) {
      (client as any).handlePublication('user:app-1:user-1', { data: event });
    }

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(joined).toHaveBeenCalledWith({ channelId: 'channel-1', userId: 'user-2' });
    expect(left).toHaveBeenCalledWith({ channelId: 'channel-1', userId: 'user-2' });
    expect(workspaceCreated).toHaveBeenCalledWith({
      workspace: { id: 'workspace-1', name: 'Workspace' },
    });
    expect(workspaceUpdated).toHaveBeenCalledWith({
      workspace: { id: 'workspace-1', name: 'Updated' },
    });
    expect(workspaceDeleted).toHaveBeenCalledWith({ workspaceId: 'workspace-1' });
    expect(workspaceMemberJoined).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      userId: 'user-2',
    });
    expect(readReceipt).toHaveBeenCalledWith({
      channelId: 'channel-1',
      userId: 'user-2',
      userName: 'User Two',
      messageId: 'message-1',
      readAt: '2026-06-08T00:00:00.000Z',
    });
    expect(pollCreated).toHaveBeenCalledWith({
      channelId: 'channel-1',
      messageId: 'message-1',
      poll: { id: 'poll-1', question: 'Yes?' },
    });
    expect(pollVoted).toHaveBeenCalledWith({
      channelId: 'channel-1',
      pollId: 'poll-1',
      userId: null,
      optionIds: undefined,
      totalVotes: 3,
    });
    expect(pollVoteRemoved).toHaveBeenCalledWith({
      channelId: 'channel-1',
      pollId: 'poll-1',
      userId: null,
      totalVotes: 2,
    });
  });
});
