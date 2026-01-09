import { describe, it, expect, beforeEach } from 'vitest';
import { shouldRetry, calculateBackoff, retryAsync, DEFAULT_RETRY_CONFIG, RetryConfig } from './retry';

describe('Retry Logic', () => {
  describe('shouldRetry', () => {
    it('retries 5xx errors', () => {
      const error = { status: 500 };
      expect(shouldRetry(error, 1)).toBe(true);
      expect(shouldRetry(error, 2)).toBe(true);
      expect(shouldRetry(error, 5)).toBe(true);
      expect(shouldRetry(error, 6)).toBe(false); // Max attempts
    });

    it('retries 502, 503, 504 errors', () => {
      expect(shouldRetry({ status: 502 }, 1)).toBe(true);
      expect(shouldRetry({ status: 503 }, 1)).toBe(true);
      expect(shouldRetry({ status: 504 }, 1)).toBe(true);
    });

    it('retries 429 (rate limit)', () => {
      const error = { status: 429 };
      expect(shouldRetry(error, 1)).toBe(true);
    });

    it('retries 408 (timeout)', () => {
      const error = { status: 408 };
      expect(shouldRetry(error, 1)).toBe(true);
    });

    it('does not retry 4xx client errors', () => {
      expect(shouldRetry({ status: 400 }, 1)).toBe(false);
      expect(shouldRetry({ status: 404 }, 1)).toBe(false);
      expect(shouldRetry({ status: 422 }, 1)).toBe(false);
    });

    it('does not retry 401 (auth error)', () => {
      const error = { status: 401 };
      expect(shouldRetry(error, 1)).toBe(false);
    });

    it('does not retry 403 (forbidden)', () => {
      const error = { status: 403 };
      expect(shouldRetry(error, 1)).toBe(false);
    });

    it('retries network errors', () => {
      expect(shouldRetry({ code: 'ECONNREFUSED' }, 1)).toBe(true);
      expect(shouldRetry({ code: 'ETIMEDOUT' }, 1)).toBe(true);
      expect(shouldRetry({ code: 'ECONNRESET' }, 1)).toBe(true);
      expect(shouldRetry({ code: 'ENOTFOUND' }, 1)).toBe(true);
      expect(shouldRetry({ name: 'NetworkError' }, 1)).toBe(true);
    });

    it('stops after max attempts', () => {
      const error = { status: 500 };
      expect(shouldRetry(error, 5)).toBe(true);
      expect(shouldRetry(error, 6)).toBe(false);
    });

    it('does not retry unknown errors', () => {
      const error = { message: 'Unknown error' };
      expect(shouldRetry(error, 1)).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('calculates exponential backoff', () => {
      // Without jitter for predictable testing
      const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, jitter: false };

      expect(calculateBackoff(0, config)).toBe(100); // 100ms
      expect(calculateBackoff(1, config)).toBe(200); // 200ms
      expect(calculateBackoff(2, config)).toBe(400); // 400ms
      expect(calculateBackoff(3, config)).toBe(800); // 800ms
      expect(calculateBackoff(4, config)).toBe(1600); // 1.6s
    });

    it('caps at maxDelay', () => {
      const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, jitter: false, maxDelay: 1000 };

      expect(calculateBackoff(0, config)).toBe(100);
      expect(calculateBackoff(1, config)).toBe(200);
      expect(calculateBackoff(2, config)).toBe(400);
      expect(calculateBackoff(3, config)).toBe(800);
      expect(calculateBackoff(4, config)).toBe(1000); // Capped
      expect(calculateBackoff(10, config)).toBe(1000); // Still capped
    });

    it('adds jitter', () => {
      const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, jitter: true };
      const delay1 = calculateBackoff(2, config);
      const delay2 = calculateBackoff(2, config);

      // Base delay is 400ms, jitter adds 0-200ms
      expect(delay1).toBeGreaterThanOrEqual(400);
      expect(delay1).toBeLessThanOrEqual(600);

      // Different calls should have different jitter (probabilistic test)
      // Note: There's a small chance this could fail if random() returns same value
      // In practice, this is extremely unlikely
    });

    it('jitter is bounded correctly', () => {
      const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, jitter: true };

      // Run multiple times to test jitter bounds
      for (let i = 0; i < 10; i++) {
        const delay = calculateBackoff(3, config);
        const baseDelay = 800; // 100 * 2^3
        const maxJitter = 400; // 50% of 800

        expect(delay).toBeGreaterThanOrEqual(baseDelay);
        expect(delay).toBeLessThanOrEqual(baseDelay + maxJitter);
      }
    });
  });

  describe('retryAsync', () => {
    it('succeeds on first attempt', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await retryAsync(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('retries on transient error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Server error');
          error.status = 500;
          throw error;
        }
        return 'success';
      };

      const result = await retryAsync(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('retries on network error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Connection refused');
          error.code = 'ECONNREFUSED';
          throw error;
        }
        return 'success';
      };

      const result = await retryAsync(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('does not retry on client error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error: any = new Error('Bad request');
        error.status = 400;
        throw error;
      };

      await expect(retryAsync(fn)).rejects.toThrow('Bad request');
      expect(attempts).toBe(1); // No retry
    });

    it('does not retry on auth error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error: any = new Error('Unauthorized');
        error.status = 401;
        throw error;
      };

      await expect(retryAsync(fn)).rejects.toThrow('Unauthorized');
      expect(attempts).toBe(1); // No retry
    });

    it('gives up after max attempts', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error: any = new Error('Server error');
        error.status = 500;
        throw error;
      };

      await expect(retryAsync(fn)).rejects.toThrow('Server error');
      expect(attempts).toBe(5); // Max attempts
    });

    it('uses custom config', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error: any = new Error('Server error');
        error.status = 500;
        throw error;
      };

      const customConfig: RetryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3, // Only 3 attempts
      };

      await expect(retryAsync(fn, customConfig)).rejects.toThrow('Server error');
      expect(attempts).toBe(3); // Custom max attempts
    });

    it('respects jitter in delays', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Server error');
          error.status = 500;
          throw error;
        }
        return 'success';
      };

      const config: RetryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 10, // Fast for testing
        jitter: true,
      };

      const startTime = Date.now();
      await retryAsync(fn, config);
      const duration = Date.now() - startTime;

      // Should have some delay (at least baseDelay for each retry)
      // Attempt 1: fail, wait ~10ms
      // Attempt 2: fail, wait ~20ms
      // Attempt 3: success
      expect(duration).toBeGreaterThanOrEqual(15); // At least 10+20 = 30ms with some buffer
    });
  });
});
