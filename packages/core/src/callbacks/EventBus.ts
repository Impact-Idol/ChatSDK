/**
 * EventBus - Type-safe event emitter for ChatSDK
 * Inspired by OpenIMSDK's callback architecture
 */

import type { EventMap, EventCallback } from '../types';

type Listener<K extends keyof EventMap> = {
  callback: EventCallback<K>;
  once: boolean;
};

export class EventBus {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();
  private queue: Array<{ event: keyof EventMap; data: any }> = [];
  private processing = false;
  private debug = false;

  constructor(options?: { debug?: boolean }) {
    this.debug = options?.debug ?? false;
  }

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<K>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const listener: Listener<K> = { callback, once: false };
    this.listeners.get(event)!.add(listener);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to ${String(event)}`);
    }

    // Return unsubscribe function
    return () => this.removeListener(event, listener);
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first emit)
   * @returns Unsubscribe function
   */
  once<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<K>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const listener: Listener<K> = { callback, once: true };
    this.listeners.get(event)!.add(listener);

    return () => this.removeListener(event, listener);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<K>
  ): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      if (listener.callback === callback) {
        listeners.delete(listener);
        break;
      }
    }

    if (this.debug) {
      console.log(`[EventBus] Unsubscribed from ${String(event)}`);
    }
  }

  private removeListener<K extends keyof EventMap>(
    event: K,
    listener: Listener<K>
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Emit an event - queued to prevent re-entrancy issues
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.queue.push({ event, data });
    this.processQueue();
  }

  /**
   * Emit an event synchronously (bypasses queue)
   * Use with caution - can cause re-entrancy issues
   */
  emitSync<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.notifyListeners(event, data);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { event, data } = this.queue.shift()!;
      await this.notifyListeners(event, data);
    }

    this.processing = false;
  }

  private async notifyListeners<K extends keyof EventMap>(
    event: K,
    data: EventMap[K]
  ): Promise<void> {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return;

    if (this.debug) {
      console.log(`[EventBus] Emitting ${String(event)}`, data);
    }

    const toRemove: Listener<K>[] = [];

    for (const listener of listeners) {
      try {
        // Handle both sync and async callbacks
        const result = listener.callback(data);
        if (result instanceof Promise) {
          await result;
        }

        // Mark once listeners for removal
        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        console.error(`[EventBus] Error in ${String(event)} listener:`, error);
      }
    }

    // Clean up once listeners
    for (const listener of toRemove) {
      listeners.delete(listener);
    }
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  removeAllListeners(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Wait for an event to be emitted (Promise-based)
   */
  waitFor<K extends keyof EventMap>(
    event: K,
    options?: { timeout?: number }
  ): Promise<EventMap[K]> {
    return new Promise((resolve, reject) => {
      const timeout = options?.timeout;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = this.once(event, (data) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${String(event)}`));
        }, timeout);
      }
    });
  }
}

// Singleton instance for global use
let globalEventBus: EventBus | null = null;

export function getEventBus(options?: { debug?: boolean }): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus(options);
  }
  return globalEventBus;
}

export function resetEventBus(): void {
  globalEventBus?.removeAllListeners();
  globalEventBus = null;
}
