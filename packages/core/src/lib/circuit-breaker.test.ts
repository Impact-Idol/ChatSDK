import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  describe('State Management', () => {
    it('starts in CLOSED state', () => {
      const cb = new CircuitBreaker('test');
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
    });

    it('executes function normally in CLOSED state', async () => {
      const cb = new CircuitBreaker('test');
      const fn = vi.fn().mockResolvedValue('success');

      const result = await cb.execute(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
    });
  });

  describe('Opening Circuit', () => {
    it('opens after threshold failures', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 3 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');

      // Circuit should be open
      expect(cb.getState().state).toBe(CircuitState.OPEN);
      expect(cb.getState().failureCount).toBe(3);
    });

    it('fails immediately when circuit is open', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 2, timeout: 60000 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Next call should fail immediately without calling fn
      const callCount = failingFn.mock.calls.length;
      await expect(cb.execute(failingFn)).rejects.toThrow(CircuitBreakerOpenError);
      expect(failingFn).toHaveBeenCalledTimes(callCount); // Not called again
    });

    it('includes retry time in error message', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 2, timeout: 60000 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();

      // Check error message includes time
      try {
        await cb.execute(failingFn);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect(error.message).toContain('Try again in');
        expect(error.message).toContain('test'); // Circuit name
      }
    });
  });

  describe('Half-Open State', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('enters HALF_OPEN after timeout', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 2,
        timeout: 1000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Fast forward 1 second
      vi.advanceTimersByTime(1000);

      // Next call should enter HALF_OPEN and try again
      await cb.execute(successFn);
      expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);
    });

    it('reopens if HALF_OPEN attempt fails', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 2,
        timeout: 1000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Fast forward to timeout
      vi.advanceTimersByTime(1000);

      // Attempt should enter HALF_OPEN then fail and reopen
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Should fail immediately again
      await expect(cb.execute(failingFn)).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('closes after success threshold in HALF_OPEN', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Fast forward to timeout
      vi.advanceTimersByTime(1000);

      // First success enters HALF_OPEN
      await cb.execute(successFn);
      expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);
      expect(cb.getState().successCount).toBe(1);

      // Second success closes circuit
      await cb.execute(successFn);
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
      expect(cb.getState().successCount).toBe(2);
    });
  });

  describe('Monitoring Period', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('only counts failures within monitoring period', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        monitoringPeriod: 2000, // 2 seconds
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // First failure
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().failureCount).toBe(1);

      // Fast forward past monitoring period
      vi.advanceTimersByTime(2100);

      // Old failure should be discarded
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().failureCount).toBe(1); // Only new failure counted

      // Two more failures to hit threshold
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);
    });

    it('counts multiple failures within monitoring period', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        monitoringPeriod: 2000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Three failures within monitoring period
      await expect(cb.execute(failingFn)).rejects.toThrow();
      vi.advanceTimersByTime(500);
      await expect(cb.execute(failingFn)).rejects.toThrow();
      vi.advanceTimersByTime(500);
      await expect(cb.execute(failingFn)).rejects.toThrow();

      expect(cb.getState().state).toBe(CircuitState.OPEN);
      expect(cb.getState().failureCount).toBe(3);
    });
  });

  describe('Success Handling', () => {
    it('resets failure count on success in CLOSED state', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 3 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Two failures
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().failureCount).toBe(2);

      // One success resets count
      await cb.execute(successFn);
      expect(cb.getState().failureCount).toBe(0);
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
    });
  });

  describe('Manual Reset', () => {
    it('resets circuit to CLOSED state', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 2 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Reset
      cb.reset();

      // Should be back to normal
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
      expect(cb.getState().failureCount).toBe(0);
      expect(cb.getState().successCount).toBe(0);
    });

    it('allows requests after reset', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 2 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Reset and execute
      cb.reset();
      const result = await cb.execute(successFn);
      expect(result).toBe('success');
    });
  });

  describe('Custom Configuration', () => {
    it('respects custom failure threshold', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 10 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Fail 9 times
      for (let i = 0; i < 9; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      }
      expect(cb.getState().state).toBe(CircuitState.CLOSED);

      // 10th failure opens circuit
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      expect(cb.getState().state).toBe(CircuitState.OPEN);
    });

    it('respects custom success threshold', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 2,
        successThreshold: 3,
        timeout: 0, // Immediate retry
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      // Enter HALF_OPEN
      await cb.execute(successFn);
      expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);

      // Two more successes (3 total)
      await cb.execute(successFn);
      expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);

      await cb.execute(successFn);
      expect(cb.getState().state).toBe(CircuitState.CLOSED); // Now closed
    });
  });

  describe('getState', () => {
    it('returns correct state information', () => {
      const cb = new CircuitBreaker('test');
      const state = cb.getState();

      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failureCount');
      expect(state).toHaveProperty('successCount');
      expect(state).toHaveProperty('nextAttemptTime');
    });

    it('returns null nextAttemptTime when CLOSED', () => {
      const cb = new CircuitBreaker('test');
      expect(cb.getState().nextAttemptTime).toBeNull();
    });

    it('returns valid nextAttemptTime when OPEN', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 2, timeout: 60000 });
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      await expect(cb.execute(failingFn)).rejects.toThrow();
      await expect(cb.execute(failingFn)).rejects.toThrow();

      const state = cb.getState();
      expect(state.nextAttemptTime).toBeGreaterThan(Date.now());
    });
  });
});
