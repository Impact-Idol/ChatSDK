/**
 * Request Deduplication
 *
 * Prevents duplicate requests from multi-tap, network retries, or race conditions.
 * Tracks in-flight requests and deduplicates by request signature.
 *
 * Use cases:
 * - User rapidly taps send button → only one message sent
 * - Network timeout retries → server doesn't receive duplicates
 * - Multiple components trigger same request → only one call made
 *
 * Example:
 * ```typescript
 * const dedup = new RequestDeduplicator();
 *
 * // First call proceeds
 * await dedup.deduplicate('send-message-hello', () => sendMessage('hello'));
 *
 * // Second call returns same promise (deduped)
 * await dedup.deduplicate('send-message-hello', () => sendMessage('hello'));
 * ```
 */
export class RequestDeduplicator {
    constructor(completionWindowMs = 5000) {
        this.inFlight = new Map();
        this.completedKeys = new Set(); // Recently completed keys (time-based expiry)
        this.completedTimestamps = new Map();
        this.completionWindowMs = completionWindowMs; // 5s window to prevent duplicates
    }
    /**
     * Execute function with deduplication
     * Returns existing promise if request is already in-flight or recently completed
     */
    async deduplicate(operation, params, fn) {
        const key = this.createKey(operation, params);
        // Check if request is in-flight
        const existing = this.inFlight.get(key);
        if (existing) {
            return existing;
        }
        // Check if recently completed (within completion window)
        if (this.isRecentlyCompleted(key)) {
            // Return cached result or throw cached error
            // For now, we'll just skip the duplicate request
            throw new DuplicateRequestError(`Request already completed: ${operation}`, key);
        }
        // Execute new request
        const promise = fn()
            .then((result) => {
            this.onComplete(key);
            return result;
        })
            .catch((error) => {
            this.onError(key, error);
            throw error;
        });
        this.inFlight.set(key, promise);
        return promise;
    }
    /**
     * Create unique key for request
     */
    createKey(operation, params) {
        // Sort keys for consistent hashing
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {});
        return `${operation}:${JSON.stringify(sortedParams)}`;
    }
    /**
     * Check if request was recently completed
     */
    isRecentlyCompleted(key) {
        const timestamp = this.completedTimestamps.get(key);
        if (!timestamp)
            return false;
        const age = Date.now() - timestamp;
        if (age > this.completionWindowMs) {
            // Expired - clean up
            this.completedKeys.delete(key);
            this.completedTimestamps.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Mark request as completed
     */
    onComplete(key) {
        this.inFlight.delete(key);
        this.completedKeys.add(key);
        this.completedTimestamps.set(key, Date.now());
    }
    /**
     * Handle request error
     */
    onError(key, error) {
        this.inFlight.delete(key);
        // Don't cache errors - allow retry for transient failures
        // Only cache if it's a non-retryable error (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
            // Client error - cache to prevent immediate retry
            this.completedKeys.add(key);
            this.completedTimestamps.set(key, Date.now());
        }
    }
    /**
     * Clear all in-flight and completed requests (for testing)
     */
    clear() {
        this.inFlight.clear();
        this.completedKeys.clear();
        this.completedTimestamps.clear();
    }
    /**
     * Get count of in-flight requests
     */
    getInFlightCount() {
        return this.inFlight.size;
    }
    /**
     * Check if specific request is in-flight
     */
    isInFlight(operation, params) {
        const key = this.createKey(operation, params);
        return this.inFlight.has(key);
    }
}
export class DuplicateRequestError extends Error {
    constructor(message, requestKey) {
        super(message);
        this.name = 'DuplicateRequestError';
        this.requestKey = requestKey;
    }
}
/**
 * Debounce helper for UI interactions
 * Prevents rapid repeated calls by returning the last call's promise
 */
export class Debouncer {
    constructor() {
        this.timeouts = new Map();
        this.resolvers = new Map();
        this.latestFn = new Map();
    }
    /**
     * Debounce a function call
     * @param key Unique key for this operation
     * @param fn Function to execute
     * @param delayMs Delay in milliseconds
     */
    debounce(key, fn, delayMs = 300) {
        // Clear existing timeout
        const existingTimeout = this.timeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        // Store the latest function
        this.latestFn.set(key, fn);
        // Create a new promise for this caller
        const promise = new Promise((resolve, reject) => {
            // Add resolver to list
            if (!this.resolvers.has(key)) {
                this.resolvers.set(key, []);
            }
            this.resolvers.get(key).push({ resolve, reject });
        });
        // Set new timeout
        const timeout = setTimeout(async () => {
            const resolvers = this.resolvers.get(key) || [];
            const latestFn = this.latestFn.get(key);
            // Clean up
            this.timeouts.delete(key);
            this.resolvers.delete(key);
            this.latestFn.delete(key);
            try {
                const result = await latestFn();
                // Resolve all waiting promises with the same result
                for (const { resolve } of resolvers) {
                    resolve(result);
                }
            }
            catch (error) {
                // Reject all waiting promises with the same error
                for (const { reject } of resolvers) {
                    reject(error);
                }
            }
        }, delayMs);
        this.timeouts.set(key, timeout);
        return promise;
    }
    /**
     * Clear all pending debounced calls
     */
    clear() {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
        this.resolvers.clear();
        this.latestFn.clear();
    }
}
