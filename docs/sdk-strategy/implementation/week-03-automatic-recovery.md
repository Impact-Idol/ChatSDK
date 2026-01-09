# Week 3: Automatic Recovery

**Goal:** Implement bulletproof resilience patterns so messages deliver successfully 99.9% of the time, even on terrible networks.

**Timeline:** 5 days
**Team:** 2 engineers
**Dependencies:** Week 1 (Core simplifications), Week 2 (CLI tool)

## Overview

Week 3 transforms ChatSDK from "manual retry required" to "just works automatically" through:
1. **Smart Retry Logic** - Exponential backoff with jitter for transient failures
2. **Circuit Breaker Pattern** - Stop wasting battery on failing endpoints
3. **Request Deduplication** - Prevent duplicate messages from multi-tap
4. **Offline Queue Improvements** - Reliable message delivery when network returns

**Success Metrics:**
- Message delivery success rate: 95% → **99.9%** ✅
- Manual retry required: 20% → **<1%** ✅
- User-visible errors: High → **<1%** ✅
- Network resilience grade: C → **A+** ✅

## Daily Breakdown

### Day 1-2: Smart Retry Logic
**Deliverable:** Automatic retry for all network failures

### Day 3: Circuit Breaker Pattern
**Deliverable:** Stop retrying when endpoint is definitely down

### Day 4: Request Deduplication
**Deliverable:** Prevent duplicate messages/reactions

### Day 5: Offline Queue Improvements
**Deliverable:** Reliable delivery when network returns

---

## Day 1-2: Smart Retry Logic

### Goal
Automatically retry failed requests with exponential backoff and jitter, eliminating manual retries.

### Current State Problems

```typescript
// Current: React Query retries disabled to avoid console spam
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // ❌ Disabled!
      retryDelay: 0,
    },
  },
});

// Result: Users must manually retry failed messages
if (error) {
  return <Button onClick={() => retry()}>Retry</Button>;
}
```

**Problems:**
- 5% of messages fail on first attempt (network blips, rate limits, server hiccups)
- Users must manually click "Retry" button
- No backoff strategy (hammers server)
- Poor UX for mobile users (spotty connections)

### Target State

```typescript
// New: Smart retry enabled with exponential backoff
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: (failureCount, error) => shouldRetry(error, failureCount),
      retryDelay: (attemptIndex) => calculateBackoff(attemptIndex),
    },
  },
});

// Result: 99%+ of messages succeed automatically
// User never sees error UI for transient failures
```

### Implementation

#### 1. Retry Configuration

**packages/core/src/lib/retry.ts:**

```typescript
/**
 * Retry Configuration for ChatSDK
 *
 * Implements exponential backoff with jitter to avoid thundering herd.
 * Based on AWS Architecture Blog best practices.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  jitter: boolean;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5, // Try up to 5 times total
  baseDelay: 100, // Start with 100ms
  maxDelay: 10000, // Cap at 10 seconds
  jitter: true, // Add randomness to prevent thundering herd
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Transient errors
  retryableErrors: [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'NetworkError',
  ],
};

/**
 * Determine if an error should be retried
 */
export function shouldRetry(
  error: any,
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // Don't retry if we've exceeded max attempts
  if (attemptNumber >= config.maxAttempts) {
    return false;
  }

  // Check HTTP status codes
  if (error.status && config.retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Check error codes/types
  const errorCode = error.code || error.name || '';
  if (config.retryableErrors.some((e) => errorCode.includes(e))) {
    return true;
  }

  // Don't retry client errors (4xx except 408, 429)
  if (error.status >= 400 && error.status < 500) {
    return false; // User error, won't succeed on retry
  }

  // Don't retry authentication errors
  if (error.status === 401 || error.status === 403) {
    return false; // Need new token, retry won't help
  }

  // Retry server errors (5xx)
  if (error.status >= 500) {
    return true;
  }

  // Don't retry unknown errors
  return false;
}

/**
 * Calculate retry delay with exponential backoff and optional jitter
 *
 * Formula: min(maxDelay, baseDelay * 2^attemptIndex) + jitter
 *
 * Example delays:
 * - Attempt 1: 100ms + jitter
 * - Attempt 2: 200ms + jitter
 * - Attempt 3: 400ms + jitter
 * - Attempt 4: 800ms + jitter
 * - Attempt 5: 1600ms + jitter
 */
export function calculateBackoff(
  attemptIndex: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * 2^attemptIndex
  const exponentialDelay = config.baseDelay * Math.pow(2, attemptIndex);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter (random 0-50% of delay) to avoid thundering herd
  if (config.jitter) {
    const jitterAmount = cappedDelay * 0.5 * Math.random();
    return cappedDelay + jitterAmount;
  }

  return cappedDelay;
}

/**
 * Retry wrapper function for async operations
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error, attempt + 1, config)) {
        throw error; // Don't retry, throw immediately
      }

      // If this was the last attempt, throw
      if (attempt + 1 >= config.maxAttempts) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateBackoff(attempt, config);
      console.log(
        `[Retry] Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}
```

#### 2. React Query Integration

**packages/react/src/lib/query-client.ts:**

```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { shouldRetry, calculateBackoff } from '@chatsdk/core';

/**
 * Create configured QueryClient with smart retry logic
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Log query errors (for debugging)
        console.error('[QueryCache] Error:', error, query);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        // Log mutation errors
        console.error('[MutationCache] Error:', error, mutation);
      },
    }),
    defaultOptions: {
      queries: {
        // Retry queries (GET requests)
        retry: (failureCount, error) => shouldRetry(error, failureCount),
        retryDelay: (attemptIndex) => calculateBackoff(attemptIndex),

        // Stale time: 30 seconds (reduce refetches)
        staleTime: 30 * 1000,

        // Cache time: 5 minutes (keep in memory)
        gcTime: 5 * 60 * 1000,

        // Refetch on window focus (for real-time data)
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations (POST/PUT/DELETE)
        retry: (failureCount, error) => {
          // More conservative retry for mutations (avoid duplicates)
          if (failureCount >= 3) return false;
          return shouldRetry(error, failureCount);
        },
        retryDelay: (attemptIndex) => calculateBackoff(attemptIndex),

        // Optimistic updates enabled globally
        onMutate: async (variables) => {
          // Can be overridden per-mutation
        },
        onError: (error, variables, context) => {
          // Rollback optimistic updates on error
        },
      },
    },
  });
}
```

#### 3. API Client Integration

**packages/core/src/api/client.ts:**

```typescript
import { retryAsync, shouldRetry, calculateBackoff } from '../lib/retry';

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  /**
   * Make HTTP request with automatic retry
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    return retryAsync(async () => {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          ...options.headers,
        },
      });

      // Handle non-OK responses
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;

        // Try to parse error body
        try {
          error.body = await response.json();
        } catch {
          // Body not JSON, ignore
        }

        throw error;
      }

      return response.json();
    });
  }

  /**
   * Send a message (with retry)
   */
  async sendMessage(data: {
    channelId: string;
    text: string;
    attachments?: any[];
  }): Promise<Message> {
    return this.request<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Add reaction (with retry)
   */
  async addReaction(data: {
    messageId: string;
    reaction: string;
  }): Promise<Reaction> {
    return this.request<Reaction>('/api/reactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ... other methods with automatic retry
}
```

#### 4. WebSocket Reconnection

**packages/core/src/realtime/centrifugo-client.ts:**

```typescript
import Centrifuge from 'centrifuge';
import { calculateBackoff } from '../lib/retry';

export class CentrifugoClient {
  private client: Centrifuge;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: { url: string; token: string }) {
    this.client = new Centrifuge(config.url, {
      token: config.token,

      // Smart reconnection with exponential backoff
      minReconnectDelay: 100, // Start with 100ms
      maxReconnectDelay: 10000, // Cap at 10s

      // Custom reconnect delay calculation
      getReconnectDelay: (context) => {
        this.reconnectAttempts = context.numReconnect;

        // Give up after 10 attempts (100s total)
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[Centrifugo] Max reconnect attempts reached');
          return null; // Stop trying
        }

        const delay = calculateBackoff(this.reconnectAttempts);
        console.log(
          `[Centrifugo] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1})`
        );
        return delay;
      },
    });

    // Reset counter on successful connection
    this.client.on('connected', () => {
      console.log('[Centrifugo] Connected');
      this.reconnectAttempts = 0;
    });

    // Log disconnections
    this.client.on('disconnected', (ctx) => {
      console.log('[Centrifugo] Disconnected:', ctx.reason);
    });

    // Handle errors
    this.client.on('error', (ctx) => {
      console.error('[Centrifugo] Error:', ctx.error);
    });
  }

  connect(): void {
    this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  subscribe(channel: string, callbacks: any) {
    return this.client.newSubscription(channel, callbacks);
  }
}
```

### Testing

#### Unit Tests

**packages/core/src/lib/retry.test.ts:**

```typescript
import { describe, it, expect } from 'vitest';
import { shouldRetry, calculateBackoff, retryAsync } from './retry';

describe('Retry Logic', () => {
  describe('shouldRetry', () => {
    it('retries 5xx errors', () => {
      const error = { status: 500 };
      expect(shouldRetry(error, 1)).toBe(true);
      expect(shouldRetry(error, 2)).toBe(true);
      expect(shouldRetry(error, 5)).toBe(true);
      expect(shouldRetry(error, 6)).toBe(false); // Max attempts
    });

    it('retries 429 (rate limit)', () => {
      const error = { status: 429 };
      expect(shouldRetry(error, 1)).toBe(true);
    });

    it('does not retry 4xx client errors', () => {
      expect(shouldRetry({ status: 400 }, 1)).toBe(false);
      expect(shouldRetry({ status: 404 }, 1)).toBe(false);
    });

    it('does not retry 401 (auth error)', () => {
      const error = { status: 401 };
      expect(shouldRetry(error, 1)).toBe(false);
    });

    it('retries network errors', () => {
      expect(shouldRetry({ code: 'ECONNREFUSED' }, 1)).toBe(true);
      expect(shouldRetry({ code: 'ETIMEDOUT' }, 1)).toBe(true);
      expect(shouldRetry({ name: 'NetworkError' }, 1)).toBe(true);
    });

    it('stops after max attempts', () => {
      const error = { status: 500 };
      expect(shouldRetry(error, 5)).toBe(true);
      expect(shouldRetry(error, 6)).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('calculates exponential backoff', () => {
      // Without jitter for predictable testing
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: false };

      expect(calculateBackoff(0, config)).toBe(100); // 100ms
      expect(calculateBackoff(1, config)).toBe(200); // 200ms
      expect(calculateBackoff(2, config)).toBe(400); // 400ms
      expect(calculateBackoff(3, config)).toBe(800); // 800ms
      expect(calculateBackoff(4, config)).toBe(1600); // 1.6s
    });

    it('caps at maxDelay', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, maxDelay: 1000 };

      expect(calculateBackoff(0, config)).toBe(100);
      expect(calculateBackoff(1, config)).toBe(200);
      expect(calculateBackoff(2, config)).toBe(400);
      expect(calculateBackoff(3, config)).toBe(800);
      expect(calculateBackoff(4, config)).toBe(1000); // Capped
      expect(calculateBackoff(10, config)).toBe(1000); // Still capped
    });

    it('adds jitter', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: true };
      const delay1 = calculateBackoff(2, config);
      const delay2 = calculateBackoff(2, config);

      // Base delay is 400ms, jitter adds 0-200ms
      expect(delay1).toBeGreaterThanOrEqual(400);
      expect(delay1).toBeLessThanOrEqual(600);

      // Different calls should have different jitter
      expect(delay1).not.toBe(delay2);
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
  });
});
```

#### Integration Tests

**packages/react/src/hooks/useSendMessage.test.tsx:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query-client';
import { useSendMessage } from './useSendMessage';

describe('useSendMessage with retry', () => {
  it('retries failed message send', async () => {
    let attempts = 0;

    // Mock API that fails twice, then succeeds
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject({ status: 500, message: 'Server error' });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '123', text: 'Hello' }),
      });
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Send message
    result.current.mutate({ channelId: '1', text: 'Hello' });

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have retried 3 times
    expect(attempts).toBe(3);
    expect(result.current.data).toEqual({ id: '123', text: 'Hello' });
  });

  it('does not retry 400 errors', async () => {
    let attempts = 0;

    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      const error: any = new Error('Bad request');
      error.status = 400;
      return Promise.reject(error);
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    result.current.mutate({ channelId: '1', text: 'Hello' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Should only try once (no retry for 400)
    expect(attempts).toBe(1);
  });
});
```

### Acceptance Criteria

**Must Have:**
- [ ] All API calls retry on 5xx errors
- [ ] Exponential backoff with jitter implemented
- [ ] WebSocket reconnects automatically with backoff
- [ ] React Query configured with smart retry
- [ ] No retry on 4xx client errors (except 408, 429)
- [ ] Unit tests for retry logic (100% coverage)
- [ ] Integration tests for message sending with retry

**Success Metrics:**
- [ ] Message delivery success rate increases from 95% to 99%+
- [ ] Manual retry UI shown <1% of the time
- [ ] Average retry delay: <2 seconds
- [ ] WebSocket reconnects in <5 seconds after disconnect

---

## Day 3: Circuit Breaker Pattern

### Goal
Stop retrying requests to failing endpoints to save battery and provide immediate feedback.

### Problem

```typescript
// Without circuit breaker:
// If backend is down, every message retries 5 times over 30 seconds
// For 10 messages, that's 50 failed requests wasting battery

await sendMessage(); // Retry 5 times (30s)
await sendMessage(); // Retry 5 times (30s)
await sendMessage(); // Retry 5 times (30s)
// ... 300 seconds wasted on a down server
```

### Solution

```typescript
// With circuit breaker:
// After 3 failures, stop trying for 60 seconds

await sendMessage(); // Retry 5 times (30s) ❌
await sendMessage(); // Retry 5 times (30s) ❌
await sendMessage(); // Retry 5 times (30s) ❌
// Circuit OPEN - stop trying for 60s
await sendMessage(); // Fail immediately ⚡
await sendMessage(); // Fail immediately ⚡
// ... wait 60s ...
await sendMessage(); // Try again (half-open state)
```

### Implementation

**packages/core/src/lib/circuit-breaker.ts:**

```typescript
/**
 * Circuit Breaker Pattern
 *
 * States:
 * - CLOSED: Normal operation, all requests allowed
 * - OPEN: Too many failures, reject all requests
 * - HALF_OPEN: Testing if service recovered
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
```

**Integration with API Client:**

```typescript
// packages/core/src/api/client.ts
import { CircuitBreaker } from '../lib/circuit-breaker';

export class ApiClient {
  private apiCircuitBreaker: CircuitBreaker;
  private wsCircuitBreaker: CircuitBreaker;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;

    // Create circuit breakers for different endpoints
    this.apiCircuitBreaker = new CircuitBreaker('api', {
      failureThreshold: 5,
      timeout: 60000, // 1 minute
    });

    this.wsCircuitBreaker = new CircuitBreaker('websocket', {
      failureThreshold: 3,
      timeout: 30000, // 30 seconds
    });
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Wrap request in circuit breaker
    return this.apiCircuitBreaker.execute(async () => {
      return retryAsync(async () => {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            ...options.headers,
          },
        });

        if (!response.ok) {
          const error: any = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }

        return response.json();
      });
    });
  }
}
```

### Testing

**packages/core/src/lib/circuit-breaker.test.ts:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker('test');
    expect(cb.getState().state).toBe(CircuitState.CLOSED);
  });

  it('opens after threshold failures', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    const failingFn = () => Promise.reject(new Error('fail'));

    // Fail 3 times
    await expect(cb.execute(failingFn)).rejects.toThrow('fail');
    await expect(cb.execute(failingFn)).rejects.toThrow('fail');
    await expect(cb.execute(failingFn)).rejects.toThrow('fail');

    // Circuit should be open
    expect(cb.getState().state).toBe(CircuitState.OPEN);

    // Next call should fail immediately
    await expect(cb.execute(failingFn)).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('enters HALF_OPEN after timeout', async () => {
    vi.useFakeTimers();

    const cb = new CircuitBreaker('test', {
      failureThreshold: 2,
      timeout: 1000, // 1 second
    });

    const failingFn = () => Promise.reject(new Error('fail'));

    // Open circuit
    await expect(cb.execute(failingFn)).rejects.toThrow();
    await expect(cb.execute(failingFn)).rejects.toThrow();
    expect(cb.getState().state).toBe(CircuitState.OPEN);

    // Fast forward 1 second
    vi.advanceTimersByTime(1000);

    // Next call should enter HALF_OPEN and try again
    const successFn = () => Promise.resolve('success');
    await cb.execute(successFn);

    expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);

    vi.useRealTimers();
  });

  it('closes after success threshold in HALF_OPEN', async () => {
    const cb = new CircuitBreaker('test', {
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 0,
    });

    const failingFn = () => Promise.reject(new Error('fail'));
    const successFn = () => Promise.resolve('success');

    // Open circuit
    await expect(cb.execute(failingFn)).rejects.toThrow();
    await expect(cb.execute(failingFn)).rejects.toThrow();
    expect(cb.getState().state).toBe(CircuitState.OPEN);

    // Enter HALF_OPEN (timeout = 0)
    await cb.execute(successFn);
    expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);

    // Second success should close circuit
    await cb.execute(successFn);
    expect(cb.getState().state).toBe(CircuitState.CLOSED);
  });
});
```

### Acceptance Criteria

**Must Have:**
- [ ] Circuit breaker wraps all API calls
- [ ] Opens after 5 failures in 2 minutes
- [ ] Waits 60s before retry (HALF_OPEN)
- [ ] Closes after 2 consecutive successes
- [ ] Separate circuits for API and WebSocket
- [ ] Unit tests (100% coverage)

---

(Week 3 continues with Day 4-5 covering Request Deduplication and Offline Queue improvements...)

## Summary

Week 3 implements automatic recovery patterns that eliminate manual retries:

**Key Deliverables:**
- ✅ Smart retry with exponential backoff
- ✅ Circuit breaker pattern
- ✅ Request deduplication
- ✅ Improved offline queue

**Impact:**
- Message delivery: 95% → **99.9%**
- Manual retries: 20% → **<1%**
- Network resilience: C → **A+**
