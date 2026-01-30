/**
 * Tests for Part 9: ErrorCodes enum and type-safe error classification
 */

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
  ErrorCodes,
} from './errors';
import type { ErrorCode } from './errors';

describe('ErrorCodes (Part 9)', () => {

  describe('ErrorCodes const object', () => {
    it('should export all 12 error codes', () => {
      expect(ErrorCodes.AUTH_ERROR).toBe('AUTH_ERROR');
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.PERMISSION_ERROR).toBe('PERMISSION_ERROR');
      expect(ErrorCodes.RATE_LIMIT).toBe('RATE_LIMIT');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.CONNECTION_ERROR).toBe('CONNECTION_ERROR');
      expect(ErrorCodes.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(ErrorCodes.CONFIG_ERROR).toBe('CONFIG_ERROR');
      expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ErrorCodes.ASSERTION_ERROR).toBe('ASSERTION_ERROR');
    });

    it('should have exactly 12 keys', () => {
      expect(Object.keys(ErrorCodes)).toHaveLength(12);
    });

    it('should be usable in switch statements', () => {
      const error = new AuthenticationError('Test');
      let matched = false;

      switch (error.code) {
        case ErrorCodes.AUTH_ERROR:
          matched = true;
          break;
        default:
          matched = false;
      }

      expect(matched).toBe(true);
    });
  });

  describe('ErrorCode type', () => {
    it('should accept valid error codes', () => {
      // TypeScript compile-time check - if this compiles, the type works
      const code: ErrorCode = ErrorCodes.AUTH_ERROR;
      expect(code).toBe('AUTH_ERROR');
    });
  });

  describe('Error classes use ErrorCodes', () => {
    it('AuthenticationError should use ErrorCodes.AUTH_ERROR', () => {
      const error = new AuthenticationError('Test');
      expect(error.code).toBe(ErrorCodes.AUTH_ERROR);
    });

    it('NetworkError should use ErrorCodes.NETWORK_ERROR', () => {
      const error = new NetworkError('Test');
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it('PermissionError should use ErrorCodes.PERMISSION_ERROR', () => {
      const error = new PermissionError('Test');
      expect(error.code).toBe(ErrorCodes.PERMISSION_ERROR);
    });

    it('RateLimitError should use ErrorCodes.RATE_LIMIT', () => {
      const error = new RateLimitError();
      expect(error.code).toBe(ErrorCodes.RATE_LIMIT);
    });

    it('ValidationError should use ErrorCodes.VALIDATION_ERROR', () => {
      const error = new ValidationError('Test');
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('ConnectionError should use ErrorCodes.CONNECTION_ERROR', () => {
      const error = new ConnectionError('Test');
      expect(error.code).toBe(ErrorCodes.CONNECTION_ERROR);
    });

    it('TimeoutError should use ErrorCodes.TIMEOUT_ERROR', () => {
      const error = new TimeoutError('op', 1000);
      expect(error.code).toBe(ErrorCodes.TIMEOUT_ERROR);
    });

    it('ConfigurationError should use ErrorCodes.CONFIG_ERROR', () => {
      const error = new ConfigurationError('Test');
      expect(error.code).toBe(ErrorCodes.CONFIG_ERROR);
    });
  });

  describe('createError uses ErrorCodes', () => {
    it('should use ErrorCodes.UNKNOWN_ERROR for generic errors', () => {
      const error = createError({ message: 'Unknown' });
      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });

    it('should use ErrorCodes.NOT_FOUND for 404 errors', () => {
      const error = createError({ status: 404, message: 'Not found' });
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('should use ErrorCodes.SERVER_ERROR for 5xx errors', () => {
      const error = createError({ status: 500, message: 'Server error' });
      expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('should use ErrorCodes.UNKNOWN_ERROR for string errors', () => {
      const error = createError('simple string error');
      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });
  });

  describe('assert uses ErrorCodes', () => {
    it('should use ErrorCodes.ASSERTION_ERROR', () => {
      try {
        assert(false, 'test assertion');
      } catch (err) {
        expect(err).toBeInstanceOf(ChatSDKError);
        if (err instanceof ChatSDKError) {
          expect(err.code).toBe(ErrorCodes.ASSERTION_ERROR);
        }
      }
    });
  });
});
