import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestDeduplicator, DuplicateRequestError, Debouncer } from './deduplication';

describe('RequestDeduplicator', () => {
  let dedup: RequestDeduplicator;

  beforeEach(() => {
    dedup = new RequestDeduplicator(1000); // 1s completion window for testing
  });

  describe('Basic Deduplication', () => {
    it('executes function on first call', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const result = await dedup.deduplicate('operation', { id: '1' }, fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent calls', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return `result-${callCount}`;
      });

      // Start two concurrent calls
      const promise1 = dedup.deduplicate('operation', { id: '1' }, fn);
      const promise2 = dedup.deduplicate('operation', { id: '1' }, fn);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should return same result
      expect(result1).toBe('result-1');
      expect(result2).toBe('result-1');
      expect(fn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('allows different operations to proceed', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        dedup.deduplicate('operation1', { id: '1' }, fn1),
        dedup.deduplicate('operation2', { id: '1' }, fn2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('allows different params to proceed', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        dedup.deduplicate('operation', { id: '1' }, fn1),
        dedup.deduplicate('operation', { id: '2' }, fn2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Completion Window', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('prevents duplicate within completion window', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      // First call
      await dedup.deduplicate('operation', { id: '1' }, fn);

      // Second call within window should throw
      await expect(
        dedup.deduplicate('operation', { id: '1' }, fn)
      ).rejects.toThrow(DuplicateRequestError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('allows duplicate after completion window expires', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      // First call
      await dedup.deduplicate('operation', { id: '1' }, fn);

      // Fast forward past completion window
      vi.advanceTimersByTime(1100);

      // Second call should proceed
      await dedup.deduplicate('operation', { id: '1' }, fn);

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('propagates errors', async () => {
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        dedup.deduplicate('operation', { id: '1' }, fn)
      ).rejects.toThrow('Test error');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('allows retry after transient error', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Server error'), { status: 500 }))
        .mockResolvedValueOnce('success');

      // First call fails
      await expect(
        dedup.deduplicate('operation', { id: '1' }, fn)
      ).rejects.toThrow('Server error');

      // Second call should be allowed (transient error)
      const result = await dedup.deduplicate('operation', { id: '1' }, fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('caches client errors (4xx)', async () => {
      const fn = vi.fn()
        .mockRejectedValue(Object.assign(new Error('Bad request'), { status: 400 }));

      // First call fails
      await expect(
        dedup.deduplicate('operation', { id: '1' }, fn)
      ).rejects.toThrow('Bad request');

      // Second call should be cached (client error)
      await expect(
        dedup.deduplicate('operation', { id: '1' }, fn)
      ).rejects.toThrow(DuplicateRequestError);

      expect(fn).toHaveBeenCalledTimes(1); // Not retried
    });

    it('deduplicates concurrent calls that fail', async () => {
      const error = new Error('Test error');
      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw error;
      });

      // Start two concurrent calls
      const promise1 = dedup.deduplicate('operation', { id: '1' }, fn);
      const promise2 = dedup.deduplicate('operation', { id: '1' }, fn);

      await expect(Promise.all([promise1, promise2])).rejects.toThrow('Test error');

      expect(fn).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Key Generation', () => {
    it('generates same key for same params in different order', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      await dedup.deduplicate('operation', { a: 1, b: 2 }, fn);

      // Different order, same params
      await expect(
        dedup.deduplicate('operation', { b: 2, a: 1 }, fn)
      ).rejects.toThrow(DuplicateRequestError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('handles nested objects in params', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      await dedup.deduplicate('operation', { nested: { a: 1, b: 2 } }, fn);

      // Same nested params
      await expect(
        dedup.deduplicate('operation', { nested: { a: 1, b: 2 } }, fn)
      ).rejects.toThrow(DuplicateRequestError);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Utility Methods', () => {
    it('getInFlightCount returns correct count', async () => {
      expect(dedup.getInFlightCount()).toBe(0);

      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'result';
      });

      dedup.deduplicate('op1', { id: '1' }, fn);
      dedup.deduplicate('op2', { id: '1' }, fn);

      expect(dedup.getInFlightCount()).toBe(2);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(dedup.getInFlightCount()).toBe(0);
    });

    it('isInFlight checks in-flight status', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'result';
      });

      expect(dedup.isInFlight('operation', { id: '1' })).toBe(false);

      dedup.deduplicate('operation', { id: '1' }, fn);

      expect(dedup.isInFlight('operation', { id: '1' })).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(dedup.isInFlight('operation', { id: '1' })).toBe(false);
    });

    it('clear removes all state', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      await dedup.deduplicate('operation', { id: '1' }, fn);

      expect(dedup.getInFlightCount()).toBe(0);

      dedup.clear();

      // Should allow duplicate after clear
      await dedup.deduplicate('operation', { id: '1' }, fn);

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Debouncer', () => {
  let debouncer: Debouncer;

  beforeEach(() => {
    debouncer = new Debouncer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid calls', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    // Rapid calls - only keep the last promise
    debouncer.debounce('key', fn, 100);
    debouncer.debounce('key', fn, 100);
    const promise = debouncer.debounce('key', fn, 100);

    // Fast forward past delay
    await vi.advanceTimersByTimeAsync(100);

    // Wait for promise to resolve
    await promise;

    // Should only call once
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls function after delay', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    const promise = debouncer.debounce('key', fn, 100);

    // Before delay
    expect(fn).not.toHaveBeenCalled();

    // Fast forward
    vi.advanceTimersByTime(100);

    const result = await promise;
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets delay on subsequent calls', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    debouncer.debounce('key', fn, 100);

    // 50ms later
    await vi.advanceTimersByTimeAsync(50);

    // Another call resets the timer
    const promise = debouncer.debounce('key', fn, 100);

    // 75ms later (125ms total)
    await vi.advanceTimersByTimeAsync(75);

    // Function not yet called (only 75ms since last call)
    expect(fn).not.toHaveBeenCalled();

    // 25ms more (100ms since last call)
    await vi.advanceTimersByTimeAsync(25);

    // Wait for promise
    await promise;

    // Now it should be called
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows different keys to debounce independently', async () => {
    const fn1 = vi.fn().mockResolvedValue('result1');
    const fn2 = vi.fn().mockResolvedValue('result2');

    const promise1 = debouncer.debounce('key1', fn1, 100);
    const promise2 = debouncer.debounce('key2', fn2, 100);

    vi.advanceTimersByTime(100);

    await Promise.all([promise1, promise2]);

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('handles errors correctly', async () => {
    const error = new Error('Test error');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = debouncer.debounce('key', fn, 100);

    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('Test error');
  });

  it('clear cancels pending calls', () => {
    const fn = vi.fn().mockResolvedValue('result');

    debouncer.debounce('key', fn, 100);

    debouncer.clear();

    vi.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();
  });
});
