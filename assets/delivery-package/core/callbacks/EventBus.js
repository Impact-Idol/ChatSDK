/**
 * EventBus - Type-safe event emitter for ChatSDK
 * Inspired by OpenIMSDK's callback architecture
 */
export class EventBus {
    constructor(options) {
        this.listeners = new Map();
        this.queue = [];
        this.processing = false;
        this.debug = false;
        this.debug = options?.debug ?? false;
    }
    /**
     * Subscribe to an event
     * @returns Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const listener = { callback, once: false };
        this.listeners.get(event).add(listener);
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
    once(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const listener = { callback, once: true };
        this.listeners.get(event).add(listener);
        return () => this.removeListener(event, listener);
    }
    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (!listeners)
            return;
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
    removeListener(event, listener) {
        this.listeners.get(event)?.delete(listener);
    }
    /**
     * Emit an event - queued to prevent re-entrancy issues.
     * For void events, the data argument can be omitted.
     */
    emit(...args) {
        const [event, data] = args;
        this.queue.push({ event, data });
        this.processQueue();
    }
    /**
     * Emit an event synchronously (bypasses queue)
     * Use with caution - can cause re-entrancy issues
     */
    emitSync(event, data) {
        this.notifyListeners(event, data);
    }
    async processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const { event, data } = this.queue.shift();
            await this.notifyListeners(event, data);
        }
        this.processing = false;
    }
    async notifyListeners(event, data) {
        const listeners = this.listeners.get(event);
        if (!listeners || listeners.size === 0)
            return;
        if (this.debug) {
            console.log(`[EventBus] Emitting ${String(event)}`, data);
        }
        const toRemove = [];
        for (const listener of listeners) {
            try {
                // Handle both sync and async callbacks
                await Promise.resolve(listener.callback(data));
                // Mark once listeners for removal
                if (listener.once) {
                    toRemove.push(listener);
                }
            }
            catch (error) {
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
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        }
        else {
            this.listeners.clear();
        }
    }
    /**
     * Get listener count for an event
     */
    listenerCount(event) {
        return this.listeners.get(event)?.size ?? 0;
    }
    /**
     * Wait for an event to be emitted (Promise-based)
     */
    waitFor(event, options) {
        return new Promise((resolve, reject) => {
            const timeout = options?.timeout;
            let timeoutId;
            const unsubscribe = this.once(event, (data) => {
                if (timeoutId)
                    clearTimeout(timeoutId);
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
let globalEventBus = null;
export function getEventBus(options) {
    if (!globalEventBus) {
        globalEventBus = new EventBus(options);
    }
    return globalEventBus;
}
export function resetEventBus() {
    globalEventBus?.removeAllListeners();
    globalEventBus = null;
}
