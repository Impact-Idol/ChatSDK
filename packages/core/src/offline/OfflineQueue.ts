/**
 * OfflineQueue - Manages pending messages for optimistic UI
 * Implements OpenIMSDK's offline-first pattern with manual retry
 */

import { EventBus } from '../callbacks/EventBus';
import type { ChatClient } from '../client/ChatClient';
import type { PendingMessage, MessageWithSeq, MessageStatus, Attachment } from '../types';

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
  debug?: boolean;
}

export class OfflineQueue {
  private client: ChatClient;
  private eventBus: EventBus;
  private storage: OfflineStorage;
  private maxRetries: number;
  private debug: boolean;
  private sending = new Set<string>(); // Track in-flight messages

  constructor(options: OfflineQueueOptions) {
    this.client = options.client;
    this.eventBus = options.eventBus;
    this.storage = options.storage;
    this.maxRetries = options.maxRetries ?? 3;
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
   * Send message to server
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

      // Send to API
      const response = await this.client.sendMessage(message.channelId, {
        text: message.text,
        clientMsgId: message.clientMsgId,
        attachments: message.attachments,
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
      // Handle network timeout - check if server actually received it
      if (await this.checkServerReceived(message)) {
        return; // Server got it, we're done
      }

      // Mark as failed
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
        console.error('[OfflineQueue] Message failed:', message.clientMsgId, error);
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
   * OpenIMSDK pattern: mark in-flight messages as failed (user must manually retry)
   */
  async processPending(): Promise<void> {
    const pending = await this.storage.getPending();

    for (const entry of pending) {
      if (entry.status === 'sending' || entry.status === 'pending') {
        // Was in-flight when app closed - mark as failed
        // User must manually retry (OpenIMSDK pattern - prevents duplicate sends)
        await this.storage.updatePending(entry.clientMsgId, {
          status: 'failed',
          error: 'Connection lost during send',
        });

        await this.storage.updateLocalMessage(entry.clientMsgId, {
          status: 'failed',
          error: 'Connection lost during send',
        });

        this.eventBus.emit('message.status_changed', {
          channelId: entry.channelId,
          messageId: entry.clientMsgId,
          status: 'failed',
        });

        if (this.debug) {
          console.log('[OfflineQueue] Marked message as failed:', entry.clientMsgId);
        }
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
