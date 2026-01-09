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
  if (attemptNumber > config.maxAttempts) {
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
