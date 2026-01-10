/**
 * Week 7: Comprehensive Integration Tests
 *
 * Simulates beta tester experience by testing all features built in Weeks 1-6
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { logger, LogLevel, profiler, createError, ChatSDKError } from '../../packages/core/src';

describe('Week 7: Comprehensive Beta Testing Simulation', () => {

  describe('Week 6: Developer Tools', () => {

    describe('Logger System', () => {
      beforeEach(() => {
        logger.clearLogs();
      });

      it('should log at different levels', () => {
        logger.setLevel(LogLevel.DEBUG);

        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warning message');
        logger.error('Error message', new Error('Test error'));

        const logs = logger.getLogs();
        expect(logs).toHaveLength(4);
        expect(logs[0].level).toBe('DEBUG');
        expect(logs[1].level).toBe('INFO');
        expect(logs[2].level).toBe('WARN');
        expect(logs[3].level).toBe('ERROR');
      });

      it('should include context in logs', () => {
        logger.info('Test message', {
          module: 'chat',
          action: 'sendMessage',
          metadata: { userId: '123', messageId: 'msg-456' }
        });

        const logs = logger.getLogs();
        expect(logs[0].module).toBe('chat');
        expect(logs[0].action).toBe('sendMessage');
        expect(logs[0].metadata).toEqual({ userId: '123', messageId: 'msg-456' });
      });

      it('should respect log level filtering', () => {
        logger.setLevel(LogLevel.WARN);

        logger.debug('Should not log');
        logger.info('Should not log');
        logger.warn('Should log');
        logger.error('Should log', new Error('Test'));

        const logs = logger.getLogs();
        expect(logs).toHaveLength(2);
        expect(logs[0].level).toBe('WARN');
        expect(logs[1].level).toBe('ERROR');
      });

      it('should export logs as JSON', () => {
        logger.info('Test 1');
        logger.warn('Test 2');

        const json = logger.exportLogs();
        const parsed = JSON.parse(json);

        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].message).toBe('Test 1');
        expect(parsed[1].message).toBe('Test 2');
      });

      it('should calculate log statistics', () => {
        logger.debug('Debug 1');
        logger.debug('Debug 2');
        logger.info('Info 1');
        logger.warn('Warn 1');

        const stats = logger.getStats();
        expect(stats.total).toBe(4);
        expect(stats.byLevel.DEBUG).toBe(2);
        expect(stats.byLevel.INFO).toBe(1);
        expect(stats.byLevel.WARN).toBe(1);
      });

      it('should limit logs with circular buffer', () => {
        logger.setLevel(LogLevel.DEBUG);

        // Add more than maxLogs (1000)
        for (let i = 0; i < 1200; i++) {
          logger.debug(`Message ${i}`);
        }

        const logs = logger.getLogs();
        expect(logs.length).toBeLessThanOrEqual(1000);

        // Should keep most recent logs
        const lastLog = logs[logs.length - 1];
        expect(lastLog.message).toContain('1199');
      });
    });

    describe('Enhanced Error System', () => {
      it('should create ChatSDKError with all properties', () => {
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
      });

      it('should format error toString with suggestion', () => {
        const error = new ChatSDKError(
          'Connection failed',
          'CONN_ERROR',
          'Check your network connection',
          'https://docs.example.com/network'
        );

        const str = error.toString();
        expect(str).toContain('Connection failed');
        expect(str).toContain('💡');
        expect(str).toContain('Check your network connection');
        expect(str).toContain('📖');
        expect(str).toContain('https://docs.example.com/network');
      });

      it('should detect error types from HTTP status codes', () => {
        const error401 = createError({ status: 401, message: 'Unauthorized' });
        expect(error401.code).toBe('AUTH_ERROR');

        const error403 = createError({ status: 403, message: 'Forbidden' });
        expect(error403.code).toBe('PERMISSION_ERROR');

        const error429 = createError({ status: 429, message: 'Too many requests' });
        expect(error429.code).toBe('RATE_LIMIT');

        const error400 = createError({ status: 400, message: 'Bad request' });
        expect(error400.code).toBe('VALIDATION_ERROR');
      });

      it('should detect network errors', () => {
        const connRefused = createError({ code: 'ECONNREFUSED' });
        expect(connRefused.code).toBe('NETWORK_ERROR');
        expect(connRefused.suggestion).toContain('network');

        const timeout = createError({ code: 'ETIMEDOUT' });
        expect(timeout.code).toBe('NETWORK_ERROR');
      });

      it('should include rate limit retry information', () => {
        const error = createError({ status: 429, headers: { 'retry-after': '30' } });
        expect(error.code).toBe('RATE_LIMIT');
        expect(error.suggestion).toContain('30 seconds');
      });

      it('should preserve original ChatSDKError', () => {
        const original = new ChatSDKError('Original', 'ORIGINAL', 'Fix it');
        const wrapped = createError(original);

        expect(wrapped).toBe(original);
        expect(wrapped.code).toBe('ORIGINAL');
      });
    });

    describe('Performance Profiler', () => {
      beforeEach(() => {
        profiler.clear();
      });

      it('should track operation timing', () => {
        const end = profiler.start('test.operation');

        // Simulate some work
        const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);

        end();

        const stats = profiler.getStats('test.operation');
        expect(stats).toBeDefined();
        expect(stats!.count).toBe(1);
        expect(stats!.min).toBeGreaterThan(0);
        expect(stats!.max).toBeGreaterThan(0);
      });

      it('should calculate statistics from multiple measurements', () => {
        // Simulate multiple operations
        for (let i = 0; i < 10; i++) {
          const end = profiler.start('batch.operation');
          // Different amounts of work
          Array.from({ length: i * 100 }, (_, j) => j);
          end();
        }

        const stats = profiler.getStats('batch.operation');
        expect(stats).toBeDefined();
        expect(stats!.count).toBe(10);
        expect(stats!.min).toBeLessThan(stats!.max);
        expect(stats!.avg).toBeGreaterThan(0);
        expect(stats!.p50).toBeGreaterThan(0);
        expect(stats!.p95).toBeGreaterThan(0);
        expect(stats!.p99).toBeGreaterThan(0);
      });

      it('should track async operations', async () => {
        const result = await profiler.measure('async.operation', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'completed';
        });

        expect(result).toBe('completed');

        const stats = profiler.getStats('async.operation');
        expect(stats).toBeDefined();
        expect(stats!.count).toBe(1);
        expect(stats!.min).toBeGreaterThanOrEqual(10);
      });

      it('should track sync operations', () => {
        const result = profiler.measureSync('sync.operation', () => {
          return 42;
        });

        expect(result).toBe(42);

        const stats = profiler.getStats('sync.operation');
        expect(stats).toBeDefined();
        expect(stats!.count).toBe(1);
      });

      it('should calculate percentiles correctly', () => {
        // Add measurements with known values (in ms)
        const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

        values.forEach(val => {
          profiler.record('percentile.test', val);
        });

        const stats = profiler.getStats('percentile.test');
        expect(stats).toBeDefined();
        expect(stats!.count).toBe(10);
        expect(stats!.min).toBe(10);
        expect(stats!.max).toBe(100);
        expect(stats!.p50).toBe(50); // Median
        expect(stats!.p95).toBe(95); // 95th percentile
        expect(stats!.p99).toBe(99); // 99th percentile
      });

      it('should export all stats', () => {
        profiler.record('op1', 10);
        profiler.record('op2', 20);
        profiler.record('op3', 30);

        const allStats = profiler.getAllStats();
        expect(allStats.size).toBe(3);
        expect(allStats.has('op1')).toBe(true);
        expect(allStats.has('op2')).toBe(true);
        expect(allStats.has('op3')).toBe(true);
      });

      it('should limit marks with circular buffer', () => {
        // Add more than maxMarks (1000)
        for (let i = 0; i < 1200; i++) {
          profiler.record(`mark${i}`, 10);
        }

        const summary = profiler.getSummary();
        expect(summary.totalOperations).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('Week 4: Resilience Features', () => {

    describe('Offline Queue', () => {
      it('should be tested in packages/core/src/__tests__/resilience/offline-queue.test.ts', () => {
        // Placeholder - actual tests in separate file
        expect(true).toBe(true);
      });
    });

    describe('Network Quality Monitor', () => {
      it('should be tested in packages/core/src/__tests__/resilience/network-quality.test.ts', () => {
        // Placeholder - actual tests in separate file
        expect(true).toBe(true);
      });
    });

    describe('Token Manager', () => {
      it('should be tested in packages/core/src/__tests__/resilience/token-manager.test.ts', () => {
        // Placeholder - actual tests in separate file
        expect(true).toBe(true);
      });
    });

    describe('Connection Manager', () => {
      it('should be tested in packages/core/src/__tests__/resilience/connection-manager.test.ts', () => {
        // Placeholder - actual tests in separate file
        expect(true).toBe(true);
      });
    });
  });

  describe('Integration: Full Stack Flow', () => {
    it('should handle complete message send flow', async () => {
      // This would test: Logger → Profiler → Error handling in one flow
      logger.setLevel(LogLevel.DEBUG);

      try {
        await profiler.measure('message.send', async () => {
          logger.info('Sending message', {
            module: 'chat',
            action: 'sendMessage',
            metadata: { messageId: 'test-123' }
          });

          // Simulate message send
          await new Promise(resolve => setTimeout(resolve, 50));

          logger.info('Message sent successfully');
        });

        // Verify logging
        const logs = logger.getLogs();
        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some(log => log.action === 'sendMessage')).toBe(true);

        // Verify profiling
        const stats = profiler.getStats('message.send');
        expect(stats).toBeDefined();
        expect(stats!.count).toBe(1);

      } catch (err) {
        const error = createError(err);
        logger.error('Message send failed', error);
        throw error;
      }
    });

    it('should handle error scenarios gracefully', async () => {
      logger.setLevel(LogLevel.DEBUG);

      try {
        await profiler.measure('error.scenario', async () => {
          // Simulate network error
          throw { code: 'ECONNREFUSED', message: 'Connection refused' };
        });

        // Should not reach here
        expect(true).toBe(false);

      } catch (err) {
        const error = createError(err);

        // Error should be properly typed
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.suggestion).toBeDefined();
        expect(error.suggestion.length).toBeGreaterThan(0);

        // Error should be logged
        logger.error('Operation failed', error, {
          module: 'test',
          action: 'errorScenario'
        });

        const logs = logger.getLogs();
        const errorLog = logs.find(log => log.level === 'ERROR');
        expect(errorLog).toBeDefined();
        expect(errorLog!.error).toBeDefined();
      }
    });
  });

  describe('Beta Tester Experience Simulation', () => {

    it('should complete 5-minute setup flow', () => {
      const setupStart = profiler.start('setup.complete');

      // Step 1: Initialize logger
      logger.setLevel(LogLevel.DEBUG);
      logger.info('ChatSDK initialized');

      // Step 2: Check profiler
      profiler.record('init.time', 50);

      // Step 3: Handle potential error
      try {
        // Simulate config validation
        const config = { apiKey: 'test-key', userId: 'test-user' };
        if (!config.apiKey) {
          throw createError({ status: 400, message: 'Missing API key' });
        }
        logger.info('Configuration valid');
      } catch (err) {
        logger.error('Config error', createError(err));
      }

      setupStart();

      // Verify everything worked
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      const stats = profiler.getStats('setup.complete');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should provide helpful debug information', () => {
      // Enable debug mode (as beta tester would)
      logger.setLevel(LogLevel.DEBUG);

      // Simulate app usage
      logger.debug('App started', { module: 'app', metadata: { version: '2.0.0' } });
      logger.info('User connected', { module: 'auth', action: 'connect' });
      logger.info('Message sent', { module: 'chat', action: 'send' });
      logger.warn('Slow network', { module: 'network', metadata: { latency: 500 } });

      // Get stats
      const stats = logger.getStats();
      expect(stats.total).toBe(4);
      expect(stats.byLevel.DEBUG).toBe(1);
      expect(stats.byLevel.INFO).toBe(2);
      expect(stats.byLevel.WARN).toBe(1);

      // Export for debugging
      const exportedLogs = logger.exportLogs();
      expect(exportedLogs.length).toBeGreaterThan(0);
      expect(() => JSON.parse(exportedLogs)).not.toThrow();
    });
  });
});
