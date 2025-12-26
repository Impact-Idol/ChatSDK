import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageSyncer, SyncStorage } from '../sync/MessageSyncer';
import { EventBus } from '../callbacks/EventBus';
import type { MessageWithSeq, SyncState } from '../types';

// Mock ChatClient
const createMockClient = () => ({
  queryMessages: vi.fn(),
  queryChannels: vi.fn(),
});

// Mock SyncStorage
const createMockStorage = (): SyncStorage => {
  const seqs = new Map<string, number>();
  const states = new Map<string, SyncState>();
  const messages = new Map<string, MessageWithSeq[]>();

  return {
    getMaxSeq: vi.fn(async (channelId: string) => seqs.get(channelId) ?? 0),
    setMaxSeq: vi.fn(async (channelId: string, seq: number) => {
      seqs.set(channelId, seq);
    }),
    getSyncState: vi.fn(async (channelId: string) => states.get(channelId) ?? null),
    setSyncState: vi.fn(async (channelId: string, state: SyncState) => {
      states.set(channelId, state);
    }),
    storeMessages: vi.fn(async (channelId: string, msgs: MessageWithSeq[]) => {
      const existing = messages.get(channelId) ?? [];
      messages.set(channelId, [...existing, ...msgs]);
    }),
    getMessages: vi.fn(async (channelId: string) => messages.get(channelId) ?? []),
  };
};

// Helper to create mock messages
const createMessage = (seq: number, channelId = 'channel-1'): MessageWithSeq => ({
  id: `msg-${seq}`,
  cid: `messaging:${channelId}`,
  type: 'regular',
  seq,
  created_at: new Date().toISOString(),
  text: `Message ${seq}`,
});

describe('MessageSyncer', () => {
  let syncer: MessageSyncer;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockStorage: SyncStorage;
  let eventBus: EventBus;

  beforeEach(() => {
    mockClient = createMockClient();
    mockStorage = createMockStorage();
    eventBus = new EventBus();

    syncer = new MessageSyncer({
      client: mockClient as any,
      eventBus,
      storage: mockStorage,
      batchSize: 10,
      debug: false,
    });
  });

  describe('syncChannel', () => {
    it('should sync messages from server', async () => {
      const messages = [createMessage(1), createMessage(2), createMessage(3)];

      mockClient.queryMessages.mockResolvedValueOnce({
        messages,
        maxSeq: 3,
        hasMore: false,
      });

      const result = await syncer.syncChannel('channel-1');

      expect(result.synced).toBe(3);
      expect(result.gaps).toBe(0);
      expect(mockStorage.storeMessages).toHaveBeenCalledWith('channel-1', messages);
      expect(mockStorage.setMaxSeq).toHaveBeenCalledWith('channel-1', 3);
    });

    it('should handle pagination', async () => {
      const batch1 = [createMessage(1), createMessage(2)];
      const batch2 = [createMessage(3), createMessage(4)];

      mockClient.queryMessages
        .mockResolvedValueOnce({
          messages: batch1,
          maxSeq: 4,
          hasMore: true,
        })
        .mockResolvedValueOnce({
          messages: batch2,
          maxSeq: 4,
          hasMore: false,
        });

      const result = await syncer.syncChannel('channel-1');

      expect(result.synced).toBe(4);
      expect(mockClient.queryMessages).toHaveBeenCalledTimes(2);
    });

    it('should emit sync events', async () => {
      const startCallback = vi.fn();
      const progressCallback = vi.fn();
      const completeCallback = vi.fn();

      eventBus.on('sync.start', startCallback);
      eventBus.on('sync.progress', progressCallback);
      eventBus.on('sync.complete', completeCallback);

      mockClient.queryMessages.mockResolvedValueOnce({
        messages: [createMessage(1)],
        maxSeq: 1,
        hasMore: false,
      });

      await syncer.syncChannel('channel-1');

      // Wait for async event processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(startCallback).toHaveBeenCalled();
      expect(completeCallback).toHaveBeenCalled();
    });

    it('should prevent concurrent syncs for same channel', async () => {
      mockClient.queryMessages.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  messages: [createMessage(1)],
                  maxSeq: 1,
                  hasMore: false,
                }),
              50
            )
          )
      );

      // Start two syncs concurrently
      const [result1, result2] = await Promise.all([
        syncer.syncChannel('channel-1'),
        syncer.syncChannel('channel-1'),
      ]);

      // Second sync should return early
      expect(result1.synced).toBe(1);
      expect(result2.synced).toBe(0);
      expect(mockClient.queryMessages).toHaveBeenCalledTimes(1);
    });

    it('should emit error on failure', async () => {
      const errorCallback = vi.fn();
      eventBus.on('sync.error', errorCallback);

      const error = new Error('Network error');
      mockClient.queryMessages.mockRejectedValueOnce(error);

      await expect(syncer.syncChannel('channel-1')).rejects.toThrow('Network error');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorCallback).toHaveBeenCalledWith({
        channelId: 'channel-1',
        error,
      });
    });
  });

  describe('gap detection', () => {
    it('should detect gaps in sequence', async () => {
      // First call returns messages with a gap
      mockClient.queryMessages
        .mockResolvedValueOnce({
          messages: [createMessage(1), createMessage(3)], // Missing seq 2
          maxSeq: 3,
          hasMore: false,
        })
        .mockResolvedValueOnce({
          // Gap fill call
          messages: [createMessage(2)],
          maxSeq: 3,
          hasMore: false,
        });

      const result = await syncer.syncChannel('channel-1');

      expect(result.gaps).toBe(1);
      // Should have made an extra call to fill the gap
      expect(mockClient.queryMessages).toHaveBeenCalledTimes(2);
    });

    it('should fill multiple gaps', async () => {
      // Messages with multiple gaps
      mockClient.queryMessages
        .mockResolvedValueOnce({
          messages: [createMessage(1), createMessage(4), createMessage(7)], // Missing 2,3 and 5,6
          maxSeq: 7,
          hasMore: false,
        })
        .mockResolvedValueOnce({
          // Fill first gap
          messages: [createMessage(2), createMessage(3)],
          maxSeq: 7,
          hasMore: false,
        })
        .mockResolvedValueOnce({
          // Fill second gap
          messages: [createMessage(5), createMessage(6)],
          maxSeq: 7,
          hasMore: false,
        });

      const result = await syncer.syncChannel('channel-1');

      expect(result.gaps).toBe(2);
    });
  });

  describe('handleNewMessage', () => {
    it('should store message if sequence is expected', async () => {
      // Set initial max seq
      await mockStorage.setMaxSeq('channel-1', 5);

      const message = createMessage(6);
      await syncer.handleNewMessage('channel-1', message);

      expect(mockStorage.storeMessages).toHaveBeenCalledWith('channel-1', [message]);
      expect(mockStorage.setMaxSeq).toHaveBeenCalledWith('channel-1', 6);
    });

    it('should fill gap if sequence has gap', async () => {
      await mockStorage.setMaxSeq('channel-1', 5);

      // Incoming message has seq 8, but we're at 5 (missing 6, 7)
      mockClient.queryMessages.mockResolvedValueOnce({
        messages: [createMessage(6), createMessage(7)],
        maxSeq: 7,
        hasMore: false,
      });

      const message = createMessage(8);
      await syncer.handleNewMessage('channel-1', message);

      // Should have fetched missing messages
      expect(mockClient.queryMessages).toHaveBeenCalled();
      // And stored all messages including the new one
      expect(mockStorage.storeMessages).toHaveBeenCalledWith('channel-1', [message]);
    });

    it('should ignore duplicate messages', async () => {
      await mockStorage.setMaxSeq('channel-1', 5);

      // Incoming message has seq 3, which is less than our max
      const message = createMessage(3);
      await syncer.handleNewMessage('channel-1', message);

      // Should not store
      expect(mockStorage.storeMessages).not.toHaveBeenCalled();
    });
  });

  describe('syncAllChannels', () => {
    it('should sync all channels', async () => {
      mockClient.queryChannels.mockResolvedValueOnce([{ id: 'channel-1' }, { id: 'channel-2' }]);

      mockClient.queryMessages
        .mockResolvedValueOnce({
          messages: [createMessage(1, 'channel-1')],
          maxSeq: 1,
          hasMore: false,
        })
        .mockResolvedValueOnce({
          messages: [createMessage(1, 'channel-2')],
          maxSeq: 1,
          hasMore: false,
        });

      await syncer.syncAllChannels();

      expect(mockClient.queryChannels).toHaveBeenCalled();
      expect(mockClient.queryMessages).toHaveBeenCalledTimes(2);
    });

    it('should emit sync events for all channels', async () => {
      const completeCallback = vi.fn();
      eventBus.on('sync.complete', completeCallback);

      mockClient.queryChannels.mockResolvedValueOnce([{ id: 'channel-1' }]);
      mockClient.queryMessages.mockResolvedValueOnce({
        messages: [createMessage(1)],
        maxSeq: 1,
        hasMore: false,
      });

      await syncer.syncAllChannels();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have complete events
      expect(completeCallback).toHaveBeenCalled();
    });
  });

  describe('getSyncState', () => {
    it('should return sync state', async () => {
      const state: SyncState = {
        channelId: 'channel-1',
        localMaxSeq: 10,
        serverMaxSeq: 10,
        lastSyncedAt: Date.now(),
      };

      await mockStorage.setSyncState('channel-1', state);

      const result = await syncer.getSyncState('channel-1');
      expect(result).toEqual(state);
    });

    it('should return null for unseen channel', async () => {
      const result = await syncer.getSyncState('unknown-channel');
      expect(result).toBeNull();
    });
  });

  describe('needsSync', () => {
    it('should return true if server has more messages', async () => {
      await mockStorage.setMaxSeq('channel-1', 5);

      const needsSync = await syncer.needsSync('channel-1', 10);
      expect(needsSync).toBe(true);
    });

    it('should return false if already synced', async () => {
      await mockStorage.setMaxSeq('channel-1', 10);

      const needsSync = await syncer.needsSync('channel-1', 10);
      expect(needsSync).toBe(false);
    });
  });

  describe('resetSync', () => {
    it('should reset sync state', async () => {
      await mockStorage.setMaxSeq('channel-1', 100);

      await syncer.resetSync('channel-1');

      expect(mockStorage.setMaxSeq).toHaveBeenCalledWith('channel-1', 0);
      expect(mockStorage.setSyncState).toHaveBeenCalledWith('channel-1', {
        channelId: 'channel-1',
        localMaxSeq: 0,
        serverMaxSeq: 0,
        lastSyncedAt: 0,
      });
    });
  });
});
