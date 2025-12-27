/**
 * IndexedDBStorage - Browser storage implementation
 * Implements both SyncStorage and OfflineStorage interfaces
 */

import type { MessageWithSeq, SyncState, PendingMessage, Attachment } from '../types';
import type { SyncStorage } from '../sync/MessageSyncer';
import type { OfflineStorage, LocalMessage, ServerMessageVersion } from '../offline/OfflineQueue';

const DB_NAME = 'chatsdk';
const DB_VERSION = 1;

interface DBSchema {
  messages: MessageWithSeq;
  syncState: SyncState;
  pending: PendingMessage;
  localMessages: LocalMessage;
  channels: { id: string; maxSeq: number };
  serverVersions: ServerMessageVersion;
}

export class IndexedDBStorage implements SyncStorage, OfflineStorage {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private dbName: string = DB_NAME) {}

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;

    if (!this.dbPromise) {
      this.dbPromise = this.openDatabase();
    }

    this.db = await this.dbPromise;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store - keyed by channelId + id
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: ['cid', 'id'] });
          messagesStore.createIndex('byChannel', 'cid');
          messagesStore.createIndex('byChannelSeq', ['cid', 'seq']);
          messagesStore.createIndex('byClientMsgId', 'clientMsgId');
        }

        // Sync state store - keyed by channelId
        if (!db.objectStoreNames.contains('syncState')) {
          db.createObjectStore('syncState', { keyPath: 'channelId' });
        }

        // Pending messages store - keyed by clientMsgId
        if (!db.objectStoreNames.contains('pending')) {
          const pendingStore = db.createObjectStore('pending', { keyPath: 'clientMsgId' });
          pendingStore.createIndex('byChannel', 'channelId');
          pendingStore.createIndex('byStatus', 'status');
        }

        // Local messages store (optimistic) - keyed by clientMsgId
        if (!db.objectStoreNames.contains('localMessages')) {
          const localStore = db.createObjectStore('localMessages', { keyPath: 'clientMsgId' });
          localStore.createIndex('byChannel', 'channelId');
        }

        // Channel state store - tracks max seq per channel
        if (!db.objectStoreNames.contains('channels')) {
          db.createObjectStore('channels', { keyPath: 'id' });
        }

        // Server message versions store - tracks server state for conflict detection
        if (!db.objectStoreNames.contains('serverVersions')) {
          db.createObjectStore('serverVersions', { keyPath: 'messageId' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    await this.init();
    return this.db!;
  }

  // ============================================================================
  // SyncStorage Implementation
  // ============================================================================

  async getMaxSeq(channelId: string): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('channels', 'readonly');
      const store = tx.objectStore('channels');
      const request = store.get(channelId);

      request.onsuccess = () => {
        resolve(request.result?.maxSeq ?? 0);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async setMaxSeq(channelId: string, seq: number): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('channels', 'readwrite');
      const store = tx.objectStore('channels');
      const request = store.put({ id: channelId, maxSeq: seq });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncState(channelId: string): Promise<SyncState | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncState', 'readonly');
      const store = tx.objectStore('syncState');
      const request = store.get(channelId);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async setSyncState(channelId: string, state: SyncState): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncState', 'readwrite');
      const store = tx.objectStore('syncState');
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async storeMessages(channelId: string, messages: MessageWithSeq[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');

      for (const message of messages) {
        store.put({ ...message, cid: channelId });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMessages(
    channelId: string,
    options?: { sinceSeq?: number; limit?: number }
  ): Promise<MessageWithSeq[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('byChannelSeq');

      const sinceSeq = options?.sinceSeq ?? 0;
      const limit = options?.limit ?? 100;

      // Range: [channelId, sinceSeq + 1] to [channelId, Infinity]
      const range = IDBKeyRange.bound(
        [channelId, sinceSeq + 1],
        [channelId, Infinity],
        false,
        false
      );

      const request = index.openCursor(range);
      const messages: MessageWithSeq[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && messages.length < limit) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================================
  // OfflineStorage Implementation
  // ============================================================================

  async getPending(): Promise<PendingMessage[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingMessage(clientMsgId: string): Promise<PendingMessage | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');
      const request = store.get(clientMsgId);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async addPending(message: PendingMessage): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      const request = store.add(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updatePending(clientMsgId: string, updates: Partial<PendingMessage>): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');

      const getRequest = store.get(clientMsgId);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const updated = { ...getRequest.result, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async removePending(clientMsgId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      const request = store.delete(clientMsgId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async storeLocalMessage(channelId: string, message: LocalMessage): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('localMessages', 'readwrite');
      const store = tx.objectStore('localMessages');
      const request = store.put({ ...message, channelId });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateLocalMessage(clientMsgId: string, updates: Partial<LocalMessage>): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('localMessages', 'readwrite');
      const store = tx.objectStore('localMessages');

      const getRequest = store.get(clientMsgId);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const updated = { ...getRequest.result, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getLocalMessage(clientMsgId: string): Promise<LocalMessage | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('localMessages', 'readonly');
      const store = tx.objectStore('localMessages');
      const request = store.get(clientMsgId);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async storeServerVersion(messageId: string, version: ServerMessageVersion): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('serverVersions', 'readwrite');
      const store = tx.objectStore('serverVersions');
      const request = store.put(version);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getServerVersion(messageId: string): Promise<ServerMessageVersion | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('serverVersions', 'readonly');
      const store = tx.objectStore('serverVersions');
      const request = store.get(messageId);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear all data (for logout or reset)
   */
  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['messages', 'syncState', 'pending', 'localMessages', 'channels', 'serverVersions'],
        'readwrite'
      );

      tx.objectStore('messages').clear();
      tx.objectStore('syncState').clear();
      tx.objectStore('pending').clear();
      tx.objectStore('localMessages').clear();
      tx.objectStore('channels').clear();
      tx.objectStore('serverVersions').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
