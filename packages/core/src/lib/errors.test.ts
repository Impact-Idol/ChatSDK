import { describe, it, expect } from 'vitest';
import {
  ChatSDKError,
  AuthenticationError,
  NetworkError,
  PermissionError,
  RateLimitError,
  ValidationError,
  ConnectionError,
  TimeoutError,
  ConfigurationError,
  createError,
  assert,
  withErrorHandling
} from './errors';

describe('Enhanced Error System', () => {

  describe('ChatSDKError Base Class', () => {
    it('should create error with all properties', () => {
      const error = new ChatSDKError(
        'Test error',
        'TEST_ERROR',
        'Try this fix',
        'https://docs.example.com',
        { userId: '123' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.suggestion).toBe('Try this fix');
      expect(error.docsUrl).toBe('https://docs.example.com');
      expect(error.context).toEqual({ userId: '123' });
      expect(error instanceof Error).toBe(true);
    });

    it('should format toString with suggestion and docs', () => {
      const error = new ChatSDKError(
        'Connection failed',
        'CONN_ERROR',
        'Check your network connection',
        'https://docs.example.com/network'
      );

      const str = error.toString();
      expect(str).toContain('ChatSDKError [CONN_ERROR]: Connection failed');
      expect(str).toContain('💡 Check your network connection');
      expect(str).toContain('📖 Learn more: https://docs.example.com/network');
    });

    it('should format toString without docsUrl if not provided', () => {
      const error = new ChatSDKError(
        'Test error',
        'TEST_ERROR',
        'Fix suggestion'
      );

      const str = error.toString();
      expect(str).toContain('💡 Fix suggestion');
      expect(str).not.toContain('📖');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with default suggestion', () => {
      const error = new AuthenticationError('Token expired');

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.message).toBe('Token expired');
      expect(error.suggestion).toContain('API key');
      expect(error.docsUrl).toContain('authentication');
    });

    it('should accept custom suggestion', () => {
      const error = new AuthenticationError(
        'Invalid token',
        'Please log in again'
      );

      expect(error.suggestion).toBe('Please log in again');
    });

    it('should include context', () => {
      const error = new AuthenticationError(
        'Auth failed',
        undefined,
        { userId: 'user-123' }
      );

      expect(error.context).toEqual({ userId: 'user-123' });
    });
  });

  describe('NetworkError', () => {
    it('should create with default suggestion', () => {
      const error = new NetworkError('Connection refused');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toContain('Connection refused');
      expect(error.suggestion).toContain('network');
    });

    it('should accept custom suggestion', () => {
      const error = new NetworkError(
        'Timeout',
        'Check your internet connection'
      );

      expect(error.suggestion).toBe('Check your internet connection');
    });
  });

  describe('PermissionError', () => {
    it('should create with default suggestion', () => {
      const error = new PermissionError('Access denied');

      expect(error.code).toBe('PERMISSION_ERROR');
      expect(error.suggestion).toContain('permission');
    });
  });

  describe('RateLimitError', () => {
    it('should create without retryAfter', () => {
      const error = new RateLimitError();

      expect(error.code).toBe('RATE_LIMIT');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.suggestion).toContain('automatically retry');
    });

    it('should include retryAfter in suggestion', () => {
      const error = new RateLimitError(30);

      expect(error.retryAfter).toBe(30);
      expect(error.suggestion).toContain('30 seconds');
    });

    it('should store retryAfter as property', () => {
      const error = new RateLimitError(60);

      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ValidationError', () => {
    it('should create with default suggestion', () => {
      const error = new ValidationError('Invalid input');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.suggestion).toContain('input');
    });

    it('should include field errors', () => {
      const error = new ValidationError(
        'Validation failed',
        undefined,
        undefined,
        { email: 'Invalid email format', password: 'Too short' }
      );

      expect(error.fields).toEqual({
        email: 'Invalid email format',
        password: 'Too short'
      });
    });

    it('should include field errors in suggestion', () => {
      const error = new ValidationError(
        'Validation failed',
        undefined,
        undefined,
        { email: 'Invalid email' }
      );

      const str = error.toString();
      expect(str).toContain('email: Invalid email');
    });
  });

  describe('ConnectionError', () => {
    it('should create with default suggestion', () => {
      const error = new ConnectionError('WebSocket connection failed');

      expect(error.code).toBe('CONNECTION_ERROR');
      expect(error.suggestion).toContain('reconnect');
    });
  });

  describe('TimeoutError', () => {
    it('should include operation in message', () => {
      const error = new TimeoutError('sendMessage', 5000);

      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.message).toContain('sendMessage');
      expect(error.message).toContain('5000ms');
    });

    it('should store timeout details', () => {
      const error = new TimeoutError('fetchData', 3000);

      expect(error.operation).toBe('fetchData');
      expect(error.timeout).toBe(3000);
    });

    it('should include context in suggestion', () => {
      const error = new TimeoutError('fetchData', 3000);

      expect(error.suggestion).toContain('increase timeout');
    });
  });

  describe('ConfigurationError', () => {
    it('should create with default suggestion', () => {
      const error = new ConfigurationError('Missing API key');

      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.suggestion).toContain('configuration');
    });

    it('should include docs link', () => {
      const error = new ConfigurationError('Invalid config');

      expect(error.docsUrl).toContain('configuration');
    });
  });

  describe('createError Factory', () => {
    it('should preserve ChatSDKError instances', () => {
      const original = new AuthenticationError('Test');
      const wrapped = createError(original);

      expect(wrapped).toBe(original);
    });

    it('should detect 401 as AuthenticationError', () => {
      const error = createError({ status: 401, message: 'Unauthorized' });

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('should detect 403 as PermissionError', () => {
      const error = createError({ status: 403, message: 'Forbidden' });

      expect(error).toBeInstanceOf(PermissionError);
      expect(error.code).toBe('PERMISSION_ERROR');
    });

    it('should detect 429 as RateLimitError', () => {
      const error = createError({ status: 429, message: 'Too many requests' });

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.code).toBe('RATE_LIMIT');
    });

    it('should extract retryAfter from headers', () => {
      const error = createError({
        status: 429,
        headers: { 'retry-after': '30' }
      });

      expect(error.code).toBe('RATE_LIMIT');
      if (error instanceof RateLimitError) {
        expect(error.retryAfter).toBe(30);
      }
    });

    it('should detect 400 as ValidationError', () => {
      const error = createError({ status: 400, message: 'Bad request' });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should detect ECONNREFUSED as NetworkError', () => {
      const error = createError({ code: 'ECONNREFUSED' });

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should detect ETIMEDOUT as NetworkError', () => {
      const error = createError({ code: 'ETIMEDOUT' });

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should create generic ChatSDKError for unknown errors', () => {
      const error = createError({ message: 'Unknown error' });

      expect(error).toBeInstanceOf(ChatSDKError);
      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should include context when provided', () => {
      const error = createError(
        { message: 'Test error' },
        { userId: '123', messageId: 'msg-456' }
      );

      expect(error.context).toEqual({ userId: '123', messageId: 'msg-456' });
    });

    it('should handle errors without message', () => {
      const error = createError({});

      expect(error.message).toBe('Unknown error');
    });

    it('should handle string errors', () => {
      const error = createError('Simple error string');

      expect(error).toBeInstanceOf(ChatSDKError);
      expect(error.message).toContain('Simple error string');
    });
  });

  describe('assert Utility', () => {
    it('should not throw when condition is true', () => {
      expect(() => {
        assert(true, 'Should not throw');
      }).not.toThrow();
    });

    it('should throw ChatSDKError when condition is false', () => {
      expect(() => {
        assert(false, 'Assertion failed');
      }).toThrow(ChatSDKError);
    });

    it('should include message in thrown error', () => {
      try {
        assert(false, 'Custom assertion message');
        expect(true).toBe(false); // Should not reach
      } catch (err) {
        expect(err).toBeInstanceOf(ChatSDKError);
        if (err instanceof ChatSDKError) {
          expect(err.message).toBe('Custom assertion message');
          expect(err.code).toBe('ASSERTION_ERROR');
        }
      }
    });

    it('should include context in thrown error', () => {
      try {
        assert(false, 'Assertion failed', { value: 42 });
      } catch (err) {
        if (err instanceof ChatSDKError) {
          expect(err.context).toEqual({ value: 42 });
        }
      }
    });
  });

  describe('withErrorHandling Wrapper', () => {
    it('should execute function successfully', async () => {
      const fn = withErrorHandling(async () => {
        return 'success';
      });

      const result = await fn();
      expect(result).toBe('success');
    });

    it('should wrap thrown errors in ChatSDKError', async () => {
      const fn = withErrorHandling(async () => {
        throw new Error('Original error');
      });

      try {
        await fn();
        expect(true).toBe(false); // Should not reach
      } catch (err) {
        expect(err).toBeInstanceOf(ChatSDKError);
        if (err instanceof ChatSDKError) {
          expect(err.message).toContain('Original error');
        }
      }
    });

    it('should add context to wrapped errors', async () => {
      const fn = withErrorHandling(
        async () => {
          throw new Error('Test');
        },
        { module: 'test', action: 'testAction' }
      );

      try {
        await fn();
      } catch (err) {
        if (err instanceof ChatSDKError) {
          expect(err.context).toEqual({ module: 'test', action: 'testAction' });
        }
      }
    });

    it('should preserve ChatSDKError instances', async () => {
      const original = new AuthenticationError('Auth failed');

      const fn = withErrorHandling(async () => {
        throw original;
      });

      try {
        await fn();
      } catch (err) {
        expect(err).toBe(original);
      }
    });

    it('should work with sync functions', async () => {
      const fn = withErrorHandling(() => {
        return 42;
      });

      const result = await fn();
      expect(result).toBe(42);
    });
  });

  describe('Error Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new AuthenticationError(
        'Token expired',
        'Please log in again',
        { userId: '123' }
      );

      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      // Check that key properties are preserved
      expect(parsed.message).toBe('Token expired');
      expect(parsed.code).toBe('AUTH_ERROR');
      expect(parsed.suggestion).toBe('Please log in again');
      expect(parsed.context).toEqual({ userId: '123' });
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain instanceof relationships', () => {
      const authError = new AuthenticationError('Test');

      expect(authError instanceof AuthenticationError).toBe(true);
      expect(authError instanceof ChatSDKError).toBe(true);
      expect(authError instanceof Error).toBe(true);
    });

    it('should have correct constructor name', () => {
      const authError = new AuthenticationError('Test');
      const networkError = new NetworkError('Test');

      expect(authError.name).toBe('AuthenticationError');
      expect(networkError.name).toBe('NetworkError');
    });
  });
});
