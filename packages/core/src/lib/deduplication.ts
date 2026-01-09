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

export interface RequestKey {
  operation: string; // e.g., 'sendMessage', 'addReaction'
  params: string; // JSON-serialized params for comparison
}

export class RequestDeduplicator {
  private inFlight = new Map<string, Promise<any>>();
  private completedKeys = new Set<string>(); // Recently completed keys (time-based expiry)
  private completedTimestamps = new Map<string, number>();
  private readonly completionWindowMs: number;

  constructor(completionWindowMs: number = 5000) {
    this.completionWindowMs = completionWindowMs; // 5s window to prevent duplicates
  }

  /**
   * Execute function with deduplication
   * Returns existing promise if request is already in-flight or recently completed
   */
  async deduplicate<T>(
    operation: string,
    params: Record<string, any>,
    fn: () => Promise<T>
  ): Promise<T> {
    const key = this.createKey(operation, params);

    // Check if request is in-flight
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // Check if recently completed (within completion window)
    if (this.isRecentlyCompleted(key)) {
      // Return cached result or throw cached error
      // For now, we'll just skip the duplicate request
      throw new DuplicateRequestError(
        `Request already completed: ${operation}`,
        key
      );
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
  private createKey(operation: string, params: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    return `${operation}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Check if request was recently completed
   */
  private isRecentlyCompleted(key: string): boolean {
    const timestamp = this.completedTimestamps.get(key);
    if (!timestamp) return false;

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
  private onComplete(key: string): void {
    this.inFlight.delete(key);
    this.completedKeys.add(key);
    this.completedTimestamps.set(key, Date.now());
  }

  /**
   * Handle request error
   */
  private onError(key: string, error: any): void {
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
  clear(): void {
    this.inFlight.clear();
    this.completedKeys.clear();
    this.completedTimestamps.clear();
  }

  /**
   * Get count of in-flight requests
   */
  getInFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * Check if specific request is in-flight
   */
  isInFlight(operation: string, params: Record<string, any>): boolean {
    const key = this.createKey(operation, params);
    return this.inFlight.has(key);
  }
}

export class DuplicateRequestError extends Error {
  public readonly requestKey: string;

  constructor(message: string, requestKey: string) {
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
  private timeouts = new Map<string, NodeJS.Timeout>();
  private promises = new Map<string, Promise<any>>();

  /**
   * Debounce a function call
   * @param key Unique key for this operation
   * @param fn Function to execute
   * @param delayMs Delay in milliseconds
   */
  debounce<T>(key: string, fn: () => Promise<T>, delayMs: number = 300): Promise<T> {
    // Clear existing timeout
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Return existing promise if still pending
    const existingPromise = this.promises.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    // Create new promise that executes after delay
    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          const result = await fn();
          this.promises.delete(key);
          resolve(result);
        } catch (error) {
          this.promises.delete(key);
          reject(error);
        }
      }, delayMs);

      this.timeouts.set(key, timeout);
    });

    this.promises.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending debounced calls
   */
  clear(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.promises.clear();
  }
}
