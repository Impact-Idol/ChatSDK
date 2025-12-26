/**
 * MessageSyncer - Sequence-based message synchronization
 * Implements OpenIMSDK's sync pattern with gap detection
 */

import { EventBus } from '../callbacks/EventBus';
import type { ChatClient } from '../client/ChatClient';
import type { MessageWithSeq, SyncState, SyncGap } from '../types';

export interface MessageSyncerOptions {
  client: ChatClient;
  eventBus: EventBus;
  storage: SyncStorage;
  batchSize?: number;
  debug?: boolean;
}

export interface SyncStorage {
  // Get max synced sequence for a channel
  getMaxSeq(channelId: string): Promise<number>;
  // Set max synced sequence for a channel
  setMaxSeq(channelId: string, seq: number): Promise<void>;
  // Get sync state for a channel
  getSyncState(channelId: string): Promise<SyncState | null>;
  // Set sync state for a channel
  setSyncState(channelId: string, state: SyncState): Promise<void>;
  // Store messages
  storeMessages(channelId: string, messages: MessageWithSeq[]): Promise<void>;
  // Get local messages
  getMessages(channelId: string, options?: { sinceSeq?: number; limit?: number }): Promise<MessageWithSeq[]>;
}

export class MessageSyncer {
  private client: ChatClient;
  private eventBus: EventBus;
  private storage: SyncStorage;
  private batchSize: number;
  private debug: boolean;
  private syncing = new Set<string>(); // Track channels currently syncing

  constructor(options: MessageSyncerOptions) {
    this.client = options.client;
    this.eventBus = options.eventBus;
    this.storage = options.storage;
    this.batchSize = options.batchSize ?? 100;
    this.debug = options.debug ?? false;
  }

  /**
   * Sync messages for a specific channel
   * Called on app open, reconnection, or manual refresh
   */
  async syncChannel(channelId: string): Promise<{ synced: number; gaps: number }> {
    // Prevent concurrent syncs for same channel
    if (this.syncing.has(channelId)) {
      if (this.debug) {
        console.log(`[MessageSyncer] Already syncing ${channelId}, skipping`);
      }
      return { synced: 0, gaps: 0 };
    }

    this.syncing.add(channelId);
    let totalSynced = 0;
    let gapsFound = 0;

    try {
      this.eventBus.emit('sync.start', { channelId, isInitial: false });

      // 1. Get local max seq
      const localMaxSeq = await this.storage.getMaxSeq(channelId);

      // 2. Fetch from server starting from local max
      let currentSeq = localMaxSeq;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.queryMessages(channelId, {
          sinceSeq: currentSeq,
          limit: this.batchSize,
        });

        if (response.messages.length === 0) {
          hasMore = false;
          break;
        }

        // 3. Check for gaps
        const gaps = this.detectGaps(currentSeq, response.messages);
        if (gaps.length > 0) {
          gapsFound += gaps.length;
          if (this.debug) {
            console.log(`[MessageSyncer] Detected ${gaps.length} gaps in ${channelId}`);
          }
          // Fill gaps
          for (const gap of gaps) {
            await this.fillGap(channelId, gap);
          }
        }

        // 4. Store messages
        await this.storage.storeMessages(channelId, response.messages);
        totalSynced += response.messages.length;

        // 5. Update local max seq
        const maxSeq = Math.max(...response.messages.map(m => m.seq));
        await this.storage.setMaxSeq(channelId, maxSeq);
        currentSeq = maxSeq;

        // 6. Emit progress
        const progress = hasMore ? (currentSeq / response.maxSeq) * 100 : 100;
        this.eventBus.emit('sync.progress', { channelId, progress });

        // 7. Emit new messages for UI update
        for (const message of response.messages) {
          this.eventBus.emit('message.new', { channelId, message });
        }

        hasMore = response.hasMore;
      }

      // 8. Update sync state
      await this.storage.setSyncState(channelId, {
        channelId,
        localMaxSeq: currentSeq,
        serverMaxSeq: currentSeq,
        lastSyncedAt: Date.now(),
      });

      this.eventBus.emit('sync.complete', { channelId, messageCount: totalSynced });

      if (this.debug) {
        console.log(`[MessageSyncer] Synced ${totalSynced} messages for ${channelId}`);
      }

      return { synced: totalSynced, gaps: gapsFound };
    } catch (error) {
      this.eventBus.emit('sync.error', { channelId, error: error as Error });
      throw error;
    } finally {
      this.syncing.delete(channelId);
    }
  }

  /**
   * Detect gaps in message sequence
   * OpenIMSDK pattern: if we have seq 100 and receive 102, we're missing 101
   */
  private detectGaps(startSeq: number, messages: MessageWithSeq[]): SyncGap[] {
    const gaps: SyncGap[] = [];
    let expectedSeq = startSeq + 1;

    for (const message of messages) {
      if (message.seq > expectedSeq) {
        gaps.push({
          channelId: messages[0]?.cid ?? '',
          fromSeq: expectedSeq,
          toSeq: message.seq - 1,
        });
      }
      expectedSeq = message.seq + 1;
    }

    return gaps;
  }

  /**
   * Fill a gap in the message sequence
   */
  private async fillGap(channelId: string, gap: SyncGap): Promise<void> {
    if (this.debug) {
      console.log(`[MessageSyncer] Filling gap ${gap.fromSeq}-${gap.toSeq} in ${channelId}`);
    }

    let currentSeq = gap.fromSeq - 1;

    while (currentSeq < gap.toSeq) {
      const response = await this.client.queryMessages(channelId, {
        sinceSeq: currentSeq,
        limit: Math.min(this.batchSize, gap.toSeq - currentSeq),
      });

      if (response.messages.length === 0) break;

      await this.storage.storeMessages(channelId, response.messages);
      currentSeq = Math.max(...response.messages.map(m => m.seq));

      // Emit messages for UI
      for (const message of response.messages) {
        this.eventBus.emit('message.new', { channelId, message });
      }
    }
  }

  /**
   * Handle incoming real-time message
   * Validates sequence and triggers gap fill if needed
   */
  async handleNewMessage(channelId: string, message: MessageWithSeq): Promise<void> {
    const localMaxSeq = await this.storage.getMaxSeq(channelId);

    if (message.seq === localMaxSeq + 1) {
      // Expected sequence - store directly
      await this.storage.storeMessages(channelId, [message]);
      await this.storage.setMaxSeq(channelId, message.seq);

      if (this.debug) {
        console.log(`[MessageSyncer] Stored message seq ${message.seq} for ${channelId}`);
      }
    } else if (message.seq > localMaxSeq + 1) {
      // Gap detected - need to sync missing messages first
      if (this.debug) {
        console.log(`[MessageSyncer] Gap detected: expected ${localMaxSeq + 1}, got ${message.seq}`);
      }

      // Fill the gap
      await this.fillGap(channelId, {
        channelId,
        fromSeq: localMaxSeq + 1,
        toSeq: message.seq - 1,
      });

      // Now store the received message
      await this.storage.storeMessages(channelId, [message]);
      await this.storage.setMaxSeq(channelId, message.seq);
    }
    // If seq <= localMaxSeq, it's a duplicate - ignore
    else if (this.debug) {
      console.log(`[MessageSyncer] Duplicate message seq ${message.seq}, ignoring`);
    }
  }

  /**
   * Sync all channels the user is a member of
   * Called on app startup or reconnection
   */
  async syncAllChannels(): Promise<void> {
    this.eventBus.emit('sync.start', { isInitial: true });

    try {
      // Get all channels
      const channels = await this.client.queryChannels();

      let totalSynced = 0;
      for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        const result = await this.syncChannel(channel.id);
        totalSynced += result.synced;

        // Emit overall progress
        const progress = ((i + 1) / channels.length) * 100;
        this.eventBus.emit('sync.progress', { channelId: channel.id, progress });
      }

      this.eventBus.emit('sync.complete', { messageCount: totalSynced });
    } catch (error) {
      this.eventBus.emit('sync.error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Get sync state for a channel
   */
  async getSyncState(channelId: string): Promise<SyncState | null> {
    return this.storage.getSyncState(channelId);
  }

  /**
   * Check if a channel needs sync
   */
  async needsSync(channelId: string, serverMaxSeq: number): Promise<boolean> {
    const localMaxSeq = await this.storage.getMaxSeq(channelId);
    return serverMaxSeq > localMaxSeq;
  }

  /**
   * Reset sync state for a channel (force full resync)
   */
  async resetSync(channelId: string): Promise<void> {
    await this.storage.setMaxSeq(channelId, 0);
    await this.storage.setSyncState(channelId, {
      channelId,
      localMaxSeq: 0,
      serverMaxSeq: 0,
      lastSyncedAt: 0,
    });
  }
}
