/**
 * Enhanced Error Classes with Fix Suggestions
 *
 * Provides actionable error messages with:
 * - Error codes
 * - Fix suggestions
 * - Documentation links
 * - Structured context
 *
 * Usage:
 * ```typescript
 * throw new AuthenticationError(
 *   'Token expired',
 *   'Your session has expired. Please log in again.'
 * );
 * ```
 */

export class ChatSDKError extends Error {
  code: string;
  suggestion: string;
  docsUrl?: string;
  context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    suggestion: string,
    docsUrl?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ChatSDKError';
    this.code = code;
    this.suggestion = suggestion;
    this.docsUrl = docsUrl;
    this.context = context;

    // Maintain proper stack trace (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toString(): string {
    const parts = [`${this.name} [${this.code}]: ${this.message}`, '', `💡 ${this.suggestion}`];

    if (this.docsUrl) {
      parts.push(`📖 Learn more: ${this.docsUrl}`);
    }

    if (this.context) {
      parts.push('');
      parts.push('Context:');
      Object.entries(this.context).forEach(([key, value]) => {
        parts.push(`  ${key}: ${JSON.stringify(value)}`);
      });
    }

    return parts.join('\n');
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      docsUrl: this.docsUrl,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Authentication errors (401, token issues)
 */
export class AuthenticationError extends ChatSDKError {
  constructor(message: string, suggestion?: string, context?: Record<string, any>) {
    super(
      message,
      'AUTH_ERROR',
      suggestion || 'Check your API key and ensure the user exists.',
      'https://docs.chatsdk.dev/guides/getting-started/authentication',
      context
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Network errors (connection refused, timeout)
 */
export class NetworkError extends ChatSDKError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'NETWORK_ERROR',
      'Check your internet connection. The SDK will automatically retry.',
      'https://docs.chatsdk.dev/guides/troubleshooting#connection-issues',
      context
    );
    this.name = 'NetworkError';
  }
}

/**
 * Permission errors (403, unauthorized actions)
 */
export class PermissionError extends ChatSDKError {
  constructor(action: string, resource: string, context?: Record<string, any>) {
    super(
      `Permission denied: cannot ${action} ${resource}`,
      'PERMISSION_ERROR',
      `This user does not have permission to ${action} this ${resource}. Check role assignments.`,
      'https://docs.chatsdk.dev/guides/advanced/permissions',
      context
    );
    this.name = 'PermissionError';
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends ChatSDKError {
  retryAfter?: number;

  constructor(retryAfter?: number, context?: Record<string, any>) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT',
      retryAfter
        ? `Too many requests. Retry after ${retryAfter} seconds. The SDK will automatically retry.`
        : 'Too many requests. The SDK will automatically retry with exponential backoff.',
      'https://docs.chatsdk.dev/guides/troubleshooting#rate-limiting',
      context
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Validation errors (400, invalid input)
 */
export class ValidationError extends ChatSDKError {
  fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>, context?: Record<string, any>) {
    super(
      message,
      'VALIDATION_ERROR',
      'Check the input data and ensure all required fields are provided correctly.',
      'https://docs.chatsdk.dev/api',
      { ...context, fields }
    );
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Connection errors (WebSocket connection failures)
 */
export class ConnectionError extends ChatSDKError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'CONNECTION_ERROR',
      'WebSocket connection failed. The SDK will automatically reconnect. Check your WebSocket URL and network.',
      'https://docs.chatsdk.dev/guides/troubleshooting#websocket-connection-failed',
      context
    );
    this.name = 'ConnectionError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ChatSDKError {
  constructor(operation: string, timeout: number, context?: Record<string, any>) {
    super(
      `Operation timed out: ${operation}`,
      'TIMEOUT_ERROR',
      `The operation took longer than ${timeout}ms. This might indicate a slow network or server issue.`,
      'https://docs.chatsdk.dev/guides/troubleshooting',
      context
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Configuration errors (missing or invalid config)
 */
export class ConfigurationError extends ChatSDKError {
  constructor(message: string, suggestion?: string, context?: Record<string, any>) {
    super(
      message,
      'CONFIG_ERROR',
      suggestion || 'Check your ChatSDK configuration and ensure all required options are provided.',
      'https://docs.chatsdk.dev/guides/getting-started/installation',
      context
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Create appropriate error from HTTP response or exception
 */
export function createError(error: any, context?: Record<string, any>): ChatSDKError {
  // Already a ChatSDK error
  if (error instanceof ChatSDKError) {
    return error;
  }

  // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return new NetworkError(`Cannot connect to server: ${error.code}`, {
      ...context,
      errorCode: error.code,
    });
  }

  // HTTP status codes
  const status = error.status || error.statusCode;

  if (status === 400) {
    return new ValidationError(
      error.message || 'Invalid request',
      error.fields,
      context
    );
  }

  if (status === 401) {
    return new AuthenticationError(
      error.message || 'Authentication failed',
      'Your token may have expired. Try logging in again.',
      context
    );
  }

  if (status === 403) {
    return new PermissionError(
      'perform this action',
      'resource',
      context
    );
  }

  if (status === 404) {
    return new ChatSDKError(
      error.message || 'Resource not found',
      'NOT_FOUND',
      'The requested resource does not exist. Check the ID and try again.',
      'https://docs.chatsdk.dev/api',
      context
    );
  }

  if (status === 429) {
    const retryAfter = error.headers?.['retry-after'];
    return new RateLimitError(
      retryAfter ? parseInt(retryAfter) : undefined,
      context
    );
  }

  if (status >= 500) {
    return new ChatSDKError(
      error.message || 'Server error',
      'SERVER_ERROR',
      'The server encountered an error. The SDK will automatically retry.',
      'https://docs.chatsdk.dev/guides/troubleshooting',
      context
    );
  }

  // Timeout
  if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
    return new TimeoutError(
      error.operation || 'unknown operation',
      error.timeout || 30000,
      context
    );
  }

  // WebSocket errors
  if (error.type === 'websocket' || error.code === 'WS_ERROR') {
    return new ConnectionError(
      error.message || 'WebSocket connection failed',
      context
    );
  }

  // Generic error
  return new ChatSDKError(
    error.message || 'Unknown error occurred',
    'UNKNOWN_ERROR',
    'This is an unexpected error. Please check the console for details and report if the issue persists.',
    'https://github.com/chatsdk/chatsdk/issues/new',
    { ...context, originalError: error }
  );
}

/**
 * Assert condition and throw error if false
 */
export function assert(
  condition: boolean,
  message: string,
  code: string,
  suggestion: string
): asserts condition {
  if (!condition) {
    throw new ChatSDKError(message, code, suggestion);
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw createError(error, context);
    }
  }) as T;
}
