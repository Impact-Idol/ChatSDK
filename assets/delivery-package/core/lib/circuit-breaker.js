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
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
const DEFAULT_CONFIG = {
    failureThreshold: 5, // Open after 5 failures
    successThreshold: 2, // Close after 2 successes
    timeout: 60000, // Wait 60s before retry
    monitoringPeriod: 120000, // Count failures in last 2 minutes
};
export class CircuitBreaker {
    constructor(name, config = {}) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = 0;
        this.failures = []; // Timestamps of failures
        this.name = name;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Execute function with circuit breaker protection
     */
    async execute(fn) {
        // Check if circuit is open
        if (this.state === CircuitState.OPEN) {
            // Check if timeout has passed
            if (Date.now() < this.nextAttemptTime) {
                throw new CircuitBreakerOpenError(`Circuit breaker [${this.name}] is OPEN. Try again in ${Math.round((this.nextAttemptTime - Date.now()) / 1000)}s`);
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
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
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
    onFailure() {
        const now = Date.now();
        this.failures.push(now);
        // Remove old failures outside monitoring period
        this.failures = this.failures.filter((timestamp) => now - timestamp < this.config.monitoringPeriod);
        this.failureCount = this.failures.length;
        // Open circuit if too many failures
        if (this.failureCount >= this.config.failureThreshold &&
            this.state !== CircuitState.OPEN) {
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = now + this.config.timeout;
            console.warn(`[CircuitBreaker:${this.name}] Opened due to ${this.failureCount} failures. Will retry at ${new Date(this.nextAttemptTime).toISOString()}`);
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
    getState() {
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
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.failures = [];
        this.nextAttemptTime = 0;
        console.log(`[CircuitBreaker:${this.name}] Manually reset`);
    }
}
export class CircuitBreakerOpenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}
