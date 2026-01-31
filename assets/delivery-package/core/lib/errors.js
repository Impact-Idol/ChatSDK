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
/**
 * Error code constants for type-safe error classification.
 *
 * Use these in switch statements to handle errors by category:
 * ```typescript
 * import { ErrorCodes } from '@chatsdk/core';
 *
 * switch (error.code) {
 *   case ErrorCodes.AUTH_ERROR:
 *     // Handle authentication errors
 *     break;
 *   case ErrorCodes.RATE_LIMIT:
 *     // Handle rate limiting
 *     break;
 * }
 * ```
 */
export const ErrorCodes = {
    AUTH_ERROR: 'AUTH_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    CONFIG_ERROR: 'CONFIG_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    ASSERTION_ERROR: 'ASSERTION_ERROR',
};
export class ChatSDKError extends Error {
    constructor(message, code, suggestion, docsUrl, context) {
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
    toString() {
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
    constructor(message, suggestion, context) {
        super(message, ErrorCodes.AUTH_ERROR, suggestion || 'Check your API key and ensure the user exists.', 'https://docs.chatsdk.dev/guides/getting-started/authentication', context);
        this.name = 'AuthenticationError';
    }
}
/**
 * Network errors (connection refused, timeout)
 */
export class NetworkError extends ChatSDKError {
    constructor(message, suggestion, context) {
        // Handle overloaded signatures: (message, context) or (message, suggestion, context)
        const isContext = typeof suggestion === 'object';
        const actualSuggestion = isContext ? undefined : suggestion;
        const actualContext = isContext ? suggestion : context;
        super(message, ErrorCodes.NETWORK_ERROR, actualSuggestion || 'Check your network connection. The SDK will automatically retry.', 'https://docs.chatsdk.dev/guides/troubleshooting#connection-issues', actualContext);
        this.name = 'NetworkError';
    }
}
/**
 * Permission errors (403, unauthorized actions)
 */
export class PermissionError extends ChatSDKError {
    constructor(messageOrAction, resource, context) {
        // Support both single message or action/resource pattern
        const hasResource = resource !== undefined;
        const message = hasResource
            ? `Permission denied: cannot ${messageOrAction} ${resource}`
            : messageOrAction;
        const suggestion = hasResource
            ? `This user does not have permission to ${messageOrAction} this ${resource}. Check role assignments.`
            : 'This user does not have permission to perform this action. Check role assignments.';
        super(message, ErrorCodes.PERMISSION_ERROR, suggestion, 'https://docs.chatsdk.dev/guides/advanced/permissions', context);
        this.name = 'PermissionError';
    }
}
/**
 * Rate limit errors (429)
 */
export class RateLimitError extends ChatSDKError {
    constructor(retryAfter, context) {
        super('Rate limit exceeded', ErrorCodes.RATE_LIMIT, retryAfter
            ? `Too many requests. Retry after ${retryAfter} seconds. The SDK will automatically retry.`
            : 'Too many requests. The SDK will automatically retry with exponential backoff.', 'https://docs.chatsdk.dev/guides/troubleshooting#rate-limiting', context);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}
/**
 * Validation errors (400, invalid input)
 */
export class ValidationError extends ChatSDKError {
    constructor(message, suggestion, context, fields) {
        // Build suggestion with field errors
        let fullSuggestion = suggestion || 'Check the input data and ensure all required fields are provided correctly.';
        if (fields) {
            const fieldErrors = Object.entries(fields)
                .map(([key, value]) => `  ${key}: ${value}`)
                .join('\n');
            fullSuggestion += '\n\nField errors:\n' + fieldErrors;
        }
        super(message, ErrorCodes.VALIDATION_ERROR, fullSuggestion, 'https://docs.chatsdk.dev/api', context);
        this.name = 'ValidationError';
        this.fields = fields;
    }
}
/**
 * Connection errors (WebSocket connection failures)
 */
export class ConnectionError extends ChatSDKError {
    constructor(message, context) {
        super(message, ErrorCodes.CONNECTION_ERROR, 'WebSocket connection failed. The SDK will automatically reconnect. Check your WebSocket URL and network.', 'https://docs.chatsdk.dev/guides/troubleshooting#websocket-connection-failed', context);
        this.name = 'ConnectionError';
    }
}
/**
 * Timeout errors
 */
export class TimeoutError extends ChatSDKError {
    constructor(operation, timeout, context) {
        super(`Operation '${operation}' timed out after ${timeout}ms`, ErrorCodes.TIMEOUT_ERROR, `The operation took longer than ${timeout}ms. You may need to increase timeout or check network conditions.`, 'https://docs.chatsdk.dev/guides/troubleshooting', context);
        this.name = 'TimeoutError';
        this.operation = operation;
        this.timeout = timeout;
    }
}
/**
 * Configuration errors (missing or invalid config)
 */
export class ConfigurationError extends ChatSDKError {
    constructor(message, suggestion, context) {
        super(message, ErrorCodes.CONFIG_ERROR, suggestion || 'Check your ChatSDK configuration and ensure all required options are provided.', 'https://docs.chatsdk.dev/guides/configuration', context);
        this.name = 'ConfigurationError';
    }
}
/**
 * Create appropriate error from HTTP response or exception
 */
export function createError(error, context) {
    // Already a ChatSDK error
    if (error instanceof ChatSDKError) {
        return error;
    }
    // Handle string errors
    if (typeof error === 'string') {
        return new ChatSDKError(error, ErrorCodes.UNKNOWN_ERROR, 'This is an unexpected error. Please check the console for details and report if the issue persists.', 'https://github.com/chatsdk/chatsdk/issues/new', context);
    }
    // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return new NetworkError(`Cannot connect to server: ${error.code}`, undefined, {
            ...context,
            errorCode: error.code,
        });
    }
    // HTTP status codes
    const status = error.status || error.statusCode;
    if (status === 400) {
        return new ValidationError(error.message || 'Invalid request', undefined, context, error.fields);
    }
    if (status === 401) {
        return new AuthenticationError(error.message || 'Authentication failed', 'Your token may have expired. Try logging in again.', context);
    }
    if (status === 403) {
        return new PermissionError('perform this action', 'resource', context);
    }
    if (status === 404) {
        return new ChatSDKError(error.message || 'Resource not found', ErrorCodes.NOT_FOUND, 'The requested resource does not exist. Check the ID and try again.', 'https://docs.chatsdk.dev/api', context);
    }
    if (status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        return new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined, context);
    }
    if (status >= 500) {
        return new ChatSDKError(error.message || 'Server error', ErrorCodes.SERVER_ERROR, 'The server encountered an error. The SDK will automatically retry.', 'https://docs.chatsdk.dev/guides/troubleshooting', context);
    }
    // Timeout
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        return new TimeoutError(error.operation || 'unknown operation', error.timeout || 30000, context);
    }
    // WebSocket errors
    if (error.type === 'websocket' || error.code === 'WS_ERROR') {
        return new ConnectionError(error.message || 'WebSocket connection failed', context);
    }
    // Generic error - extract message from Error instances
    const message = error instanceof Error ? error.message : (error.message || 'Unknown error');
    return new ChatSDKError(message, ErrorCodes.UNKNOWN_ERROR, 'This is an unexpected error. Please check the console for details and report if the issue persists.', 'https://github.com/chatsdk/chatsdk/issues/new', context);
}
/**
 * Assert condition and throw error if false
 */
export function assert(condition, message, context) {
    if (!condition) {
        throw new ChatSDKError(message, ErrorCodes.ASSERTION_ERROR, 'An assertion failed. This is likely a programming error.', undefined, context);
    }
}
/**
 * Wrap async function with error handling
 */
export function withErrorHandling(fn, context) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            throw createError(error, context);
        }
    });
}
