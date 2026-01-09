/**
 * Circuit Breaker Pattern
 *
 * Prevents wasted battery by stopping retry attempts when a service is down.
 * After detecting repeated failures, the circuit "opens" and fails fast
 * instead of retrying every request.
 *
 * States:
 * - CLOSED: Normal operation, all requests allowed
 * - OPEN: Too many failures, reject all requests immediately
 * - HALF_OPEN: Testing if service has recovered
 *
 * Example:
 * Without circuit breaker: 10 messages × 5 retries = 50 failed requests
 * With circuit breaker: 3 failures → circuit opens → remaining 7 fail immediately
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // How long to wait before trying again (ms)
  monitoringPeriod: number; // Time window to count failures (ms)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes
  timeout: 60000, // Wait 60s before retry
  monitoringPeriod: 120000, // Count failures in last 2 minutes
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;
  private failures: number[] = []; // Timestamps of failures
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker [${this.name}] is OPEN. Try again in ${Math.round((this.nextAttemptTime - Date.now()) / 1000)}s`
        );
      }

      // Timeout passed, enter half-open state
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      console.log(`[CircuitBreaker:${this.name}] Entering HALF_OPEN state`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.failures = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      // Close circuit after enough successes
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        console.log(`[CircuitBreaker:${this.name}] Closed (service recovered)`);
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);

    // Remove old failures outside monitoring period
    this.failures = this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod
    );

    this.failureCount = this.failures.length;

    // Open circuit if too many failures
    if (
      this.failureCount >= this.config.failureThreshold &&
      this.state !== CircuitState.OPEN
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.timeout;
      console.warn(
        `[CircuitBreaker:${this.name}] Opened due to ${this.failureCount} failures. Will retry at ${new Date(this.nextAttemptTime).toISOString()}`
      );
    }

    // If half-open attempt failed, reopen circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.timeout;
      console.warn(`[CircuitBreaker:${this.name}] Half-open attempt failed, reopening`);
    }
  }

  /**
   * Get current state (for monitoring)
   */
  getState(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttemptTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptTime: this.state === CircuitState.OPEN ? this.nextAttemptTime : null,
    };
  }

  /**
   * Manually reset circuit (for testing/debugging)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failures = [];
    this.nextAttemptTime = 0;
    console.log(`[CircuitBreaker:${this.name}] Manually reset`);
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
