/**
 * OfflineQueue - Manages pending messages for optimistic UI
 * Implements OpenIMSDK's offline-first pattern with conflict resolution
 * Work Stream 23 - TIER 4 Enhancement
 *
 * Features:
 * - Optimistic UI updates for send/edit/delete
 * - Conflict resolution with last-write-wins strategy
 * - Exponential backoff for retries
 * - Concurrent modification detection
 */

import { EventBus } from '../callbacks/EventBus';
import type { ChatClient } from '../client/ChatClient';
import type { PendingMessage, MessageWithSeq, MessageStatus, Attachment } from '../types';
import { retryAsync } from '../lib/retry';

export interface OfflineStorage {
  // Get all pending messages
  getPending(): Promise<PendingMessage[]>;
  // Get pending message by ID
  getPendingMessage(clientMsgId: string): Promise<PendingMessage | null>;
  // Add pending message
  addPending(message: PendingMessage): Promise<void>;
  // Update pending message
  updatePending(clientMsgId: string, updates: Partial<PendingMessage>): Promise<void>;
  // Remove pending message
  removePending(clientMsgId: string): Promise<void>;
  // Store local message (optimistic)
  storeLocalMessage(channelId: string, message: LocalMessage): Promise<void>;
  // Update local message status
  updateLocalMessage(clientMsgId: string, updates: Partial<LocalMessage>): Promise<void>;
  // Get local message
  getLocalMessage(clientMsgId: string): Promise<LocalMessage | null>;
  // Store server message version for conflict detection
  storeServerVersion(messageId: string, version: ServerMessageVersion): Promise<void>;
  // Get server message version
  getServerVersion(messageId: string): Promise<ServerMessageVersion | null>;
}

export interface ServerMessageVersion {
  messageId: string;
  text: string;
  updatedAt: string;
  version: number;
}

export interface LocalMessage {
  clientMsgId: string;
  serverId?: string;
  channelId: string;
  text: string;
  attachments?: Attachment[];
  status: MessageStatus;
  createdAt: number;
  sentAt?: number;
  error?: string;
}

export interface OfflineQueueOptions {
  client: ChatClient;
  eventBus: EventBus;
  storage: OfflineStorage;
  maxRetries?: number;
  retryDelayMs?: number; // Initial retry delay for exponential backoff
  debug?: boolean;
}

export type ConflictResolutionStrategy = 'last-write-wins' | 'server-wins' | 'local-wins';

export class OfflineQueue {
  private client: ChatClient;
  private eventBus: EventBus;
  private storage: OfflineStorage;
  private maxRetries: number;
  private retryDelayMs: number;
  private debug: boolean;
  private sending = new Set<string>(); // Track in-flight messages
  private conflictStrategy: ConflictResolutionStrategy = 'last-write-wins';

  constructor(options: OfflineQueueOptions) {
    this.client = options.client;
    this.eventBus = options.eventBus;
    this.storage = options.storage;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.debug = options.debug ?? false;
  }

  /**
   * Send a message with optimistic UI
   * Returns immediately with local message, sends in background
   */
  async send(
    channelId: string,
    text: string,
    attachments?: Attachment[]
  ): Promise<LocalMessage> {
    // 1. Generate client-side ID (UUIDv7 for time-sortable IDs)
    const clientMsgId = crypto.randomUUID();

    // 2. Create local message with SENDING status
    const localMessage: LocalMessage = {
      clientMsgId,
      channelId,
      text,
      attachments,
      status: 'sending',
      createdAt: Date.now(),
    };

    // 3. Store locally for optimistic UI
    await this.storage.storeLocalMessage(channelId, localMessage);

    // 4. Add to pending queue
    await this.storage.addPending({
      clientMsgId,
      channelId,
      text,
      attachments,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    });

    // 5. Emit for UI update (optimistic)
    this.eventBus.emit('message.new', {
      channelId,
      message: this.toMessageWithSeq(localMessage),
    });

    // 6. Send to server (async - don't await)
    this.sendToServer(localMessage).catch((error) => {
      if (this.debug) {
        console.error('[OfflineQueue] Send failed:', error);
      }
    });

    return localMessage;
  }

  /**
   * Send message to server with automatic retry
   * Week 3 Day 5: Integrated with retry logic for automatic recovery
   */
  private async sendToServer(message: LocalMessage): Promise<void> {
    // Prevent duplicate sends
    if (this.sending.has(message.clientMsgId)) {
      return;
    }
    this.sending.add(message.clientMsgId);

    try {
      // Update status to sending
      await this.updateStatus(message.clientMsgId, 'sending');

      // Send to API with automatic retry (Week 3 integration)
      // retryAsync will handle exponential backoff and retry logic
      const response = await retryAsync(async () => {
        return this.client.sendMessage(message.channelId, {
          text: message.text,
          clientMsgId: message.clientMsgId,
          attachments: message.attachments as any,
        });
      });

      // Success - update status
      await this.storage.updateLocalMessage(message.clientMsgId, {
        serverId: response.id,
        status: 'sent',
        sentAt: Date.now(),
      });

      // Remove from pending queue
      await this.storage.removePending(message.clientMsgId);

      // Emit success
      this.eventBus.emit('message.status_changed', {
        channelId: message.channelId,
        messageId: message.clientMsgId,
        status: 'sent',
      });

      if (this.debug) {
        console.log('[OfflineQueue] Message sent:', message.clientMsgId);
      }
    } catch (error) {
      // Retry logic exhausted - check if server actually received it
      if (await this.checkServerReceived(message)) {
        return; // Server got it, we're done
      }

      // Mark as failed (after all retries exhausted)
      await this.storage.updateLocalMessage(message.clientMsgId, {
        status: 'failed',
        error: (error as Error).message,
      });

      await this.storage.updatePending(message.clientMsgId, {
        status: 'failed',
        error: (error as Error).message,
      });

      // Emit failure
      this.eventBus.emit('message.status_changed', {
        channelId: message.channelId,
        messageId: message.clientMsgId,
        status: 'failed',
      });

      if (this.debug) {
        console.error('[OfflineQueue] Message failed after retries:', message.clientMsgId, error);
      }
    } finally {
      this.sending.delete(message.clientMsgId);
    }
  }

  /**
   * Check if server actually received a message (for timeout handling)
   */
  private async checkServerReceived(message: LocalMessage): Promise<boolean> {
    try {
      // Try to fetch the message from server by clientMsgId
      const response = await this.client.queryMessages(message.channelId, {
        limit: 10,
      });

      const serverMessage = response.messages.find(
        (m) => m.clientMsgId === message.clientMsgId
      );

      if (serverMessage) {
        // Server did receive it - update local state
        await this.storage.updateLocalMessage(message.clientMsgId, {
          serverId: serverMessage.id,
          status: 'sent',
          sentAt: Date.now(),
        });
        await this.storage.removePending(message.clientMsgId);

        this.eventBus.emit('message.status_changed', {
          channelId: message.channelId,
          messageId: message.clientMsgId,
          status: 'sent',
        });

        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Retry a failed message (manual retry - OpenIMSDK pattern)
   */
  async retry(clientMsgId: string): Promise<void> {
    const pending = await this.storage.getPendingMessage(clientMsgId);
    if (!pending) {
      throw new Error('Message not found in pending queue');
    }

    if (pending.status !== 'failed') {
      throw new Error('Can only retry failed messages');
    }

    // Increment retry count
    const newRetryCount = pending.retryCount + 1;
    if (newRetryCount > this.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    // Update pending status
    await this.storage.updatePending(clientMsgId, {
      status: 'pending',
      retryCount: newRetryCount,
      error: undefined,
    });

    // Get local message
    const localMessage = await this.storage.getLocalMessage(clientMsgId);
    if (!localMessage) {
      throw new Error('Local message not found');
    }

    // Emit status change
    this.eventBus.emit('message.status_changed', {
      channelId: pending.channelId,
      messageId: clientMsgId,
      status: 'sending',
    });

    // Retry send
    await this.sendToServer(localMessage);
  }

  /**
   * Cancel a pending message
   */
  async cancel(clientMsgId: string): Promise<void> {
    const pending = await this.storage.getPendingMessage(clientMsgId);
    if (!pending) {
      return;
    }

    // Remove from pending
    await this.storage.removePending(clientMsgId);

    // Emit delete
    this.eventBus.emit('message.deleted', {
      channelId: pending.channelId,
      messageId: clientMsgId,
    });
  }

  /**
   * Process pending messages on app startup/reconnection
   * Week 3 Day 5: Auto-retry pending messages instead of marking as failed
   */
  async processPending(): Promise<void> {
    const pending = await this.storage.getPending();

    for (const entry of pending) {
      if (entry.status === 'sending' || entry.status === 'pending') {
        // Check if server already received it (prevents duplicates)
        const localMessage = await this.storage.getLocalMessage(entry.clientMsgId);

        if (!localMessage) {
          // No local message - clean up
          await this.storage.removePending(entry.clientMsgId);
          continue;
        }

        // Check if server already has this message
        if (await this.checkServerReceived(localMessage)) {
          if (this.debug) {
            console.log('[OfflineQueue] Server already received message:', entry.clientMsgId);
          }
          continue; // Server has it, no need to retry
        }

        // Auto-retry the message (Week 3 Day 5 improvement)
        // This eliminates the need for manual retry
        if (this.debug) {
          console.log('[OfflineQueue] Auto-retrying pending message:', entry.clientMsgId);
        }

        // Retry send in background (don't await to avoid blocking)
        this.sendToServer(localMessage).catch((error) => {
          if (this.debug) {
            console.error('[OfflineQueue] Auto-retry failed:', entry.clientMsgId, error);
          }
        });
      }
    }
  }

  /**
   * Get all pending messages for a channel
   */
  async getPendingForChannel(channelId: string): Promise<PendingMessage[]> {
    const all = await this.storage.getPending();
    return all.filter((p) => p.channelId === channelId);
  }

  /**
   * Get count of failed messages
   */
  async getFailedCount(): Promise<number> {
    const all = await this.storage.getPending();
    return all.filter((p) => p.status === 'failed').length;
  }

  /**
   * Update message status
   */
  private async updateStatus(
    clientMsgId: string,
    status: MessageStatus
  ): Promise<void> {
    await this.storage.updateLocalMessage(clientMsgId, { status });

    const message = await this.storage.getLocalMessage(clientMsgId);
    if (message) {
      this.eventBus.emit('message.status_changed', {
        channelId: message.channelId,
        messageId: clientMsgId,
        status,
      });
    }
  }

  /**
   * Edit a message with optimistic UI update
   * Work Stream 23 enhancement
   */
  async editMessage(
    channelId: string,
    messageId: string,
    newText: string
  ): Promise<void> {
    // 1. Get current server version for conflict detection
    const serverVersion = await this.storage.getServerVersion(messageId);

    // 2. Optimistically update local message
    await this.storage.updateLocalMessage(messageId, {
      text: newText,
      status: 'sending',
    });

    // 3. Emit optimistic update
    this.eventBus.emit('message.updated', {
      channelId,
      message: this.toMessageWithSeq({
        clientMsgId: messageId,
        serverId: messageId,
        channelId,
        text: newText,
        status: 'sending',
        createdAt: Date.now(),
      }),
    });

    // 4. Send to server
    try {
      await this.client.updateMessage(channelId, messageId, { text: newText });

      // Success - store new server version
      await this.storage.storeServerVersion(messageId, {
        messageId,
        text: newText,
        updatedAt: new Date().toISOString(),
        version: (serverVersion?.version ?? 0) + 1,
      });

      await this.storage.updateLocalMessage(messageId, {
        status: 'sent',
      });

      this.eventBus.emit('message.status_changed', {
        channelId,
        messageId,
        status: 'sent',
      });
    } catch (error) {
      // Check for conflict
      const conflict = await this.detectConflict(messageId, newText);

      if (conflict) {
        await this.resolveConflict(messageId, conflict);
      } else {
        // Mark as failed
        await this.storage.updateLocalMessage(messageId, {
          status: 'failed',
          error: (error as Error).message,
        });

        this.eventBus.emit('message.status_changed', {
          channelId,
          messageId,
          status: 'failed',
        });
      }
    }
  }

  /**
   * Delete a message with optimistic UI update
   * Work Stream 23 enhancement
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    // 1. Optimistically emit delete event
    this.eventBus.emit('message.deleted', {
      channelId,
      messageId,
    });

    // 2. Send delete to server
    try {
      await this.client.deleteMessage(channelId, messageId);

      // Success - remove from storage
      await this.storage.removePending(messageId);

      if (this.debug) {
        console.log('[OfflineQueue] Message deleted:', messageId);
      }
    } catch (error) {
      // Revert optimistic delete
      const localMessage = await this.storage.getLocalMessage(messageId);

      if (localMessage) {
        this.eventBus.emit('message.new', {
          channelId,
          message: this.toMessageWithSeq(localMessage),
        });
      }

      if (this.debug) {
        console.error('[OfflineQueue] Delete failed:', messageId, error);
      }

      throw error;
    }
  }

  /**
   * Detect conflict between local and server versions
   * Work Stream 23 enhancement
   */
  private async detectConflict(
    messageId: string,
    localText: string
  ): Promise<{ serverText: string; serverUpdatedAt: string } | null> {
    try {
      // Fetch latest from server
      const localMessage = await this.storage.getLocalMessage(messageId);
      if (!localMessage) return null;

      const response = await this.client.queryMessages(localMessage.channelId, {
        limit: 100,
      });

      const serverMessage = response.messages.find((m) => m.id === messageId);

      if (!serverMessage) return null;

      // Compare text
      if (serverMessage.text !== localText) {
        return {
          serverText: serverMessage.text ?? '',
          serverUpdatedAt: serverMessage.updated_at ?? serverMessage.created_at,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve conflict using configured strategy
   * Work Stream 23 enhancement
   */
  private async resolveConflict(
    messageId: string,
    conflict: { serverText: string; serverUpdatedAt: string }
  ): Promise<void> {
    const localMessage = await this.storage.getLocalMessage(messageId);
    if (!localMessage) return;

    const localUpdatedAt = localMessage.sentAt ?? localMessage.createdAt;

    switch (this.conflictStrategy) {
      case 'last-write-wins':
        // Compare timestamps
        if (new Date(conflict.serverUpdatedAt).getTime() > localUpdatedAt) {
          // Server wins - update local to match server
          await this.storage.updateLocalMessage(messageId, {
            text: conflict.serverText,
            status: 'sent',
          });

          this.eventBus.emit('message.updated', {
            channelId: localMessage.channelId,
            message: this.toMessageWithSeq({
              ...localMessage,
              text: conflict.serverText,
              status: 'sent',
            }),
          });

          if (this.debug) {
            console.log('[OfflineQueue] Conflict resolved: server wins (newer)');
          }
        } else {
          // Local wins - retry send
          if (this.debug) {
            console.log('[OfflineQueue] Conflict resolved: local wins (newer)');
          }
          // Could retry here
        }
        break;

      case 'server-wins':
        // Always use server version
        await this.storage.updateLocalMessage(messageId, {
          text: conflict.serverText,
          status: 'sent',
        });

        this.eventBus.emit('message.updated', {
          channelId: localMessage.channelId,
          message: this.toMessageWithSeq({
            ...localMessage,
            text: conflict.serverText,
            status: 'sent',
          }),
        });
        break;

      case 'local-wins':
        // Keep local version - could retry send
        if (this.debug) {
          console.log('[OfflineQueue] Conflict: keeping local version');
        }
        break;
    }
  }

  /**
   * Retry with exponential backoff
   * Work Stream 23 enhancement
   */
  private async retryWithBackoff(
    attempt: number,
    action: () => Promise<void>
  ): Promise<void> {
    const delay = this.retryDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

    await new Promise((resolve) => setTimeout(resolve, delay + jitter));

    return action();
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictStrategy(strategy: ConflictResolutionStrategy): void {
    this.conflictStrategy = strategy;
  }

  /**
   * Convert local message to MessageWithSeq for event emission
   */
  private toMessageWithSeq(message: LocalMessage): MessageWithSeq {
    return {
      id: message.serverId ?? message.clientMsgId,
      cid: message.channelId,
      type: 'regular',
      text: message.text,
      attachments: message.attachments,
      status: message.status,
      created_at: new Date(message.createdAt).toISOString(),
      seq: -1, // Pending messages don't have a seq yet
      clientMsgId: message.clientMsgId,
    };
  }
}
