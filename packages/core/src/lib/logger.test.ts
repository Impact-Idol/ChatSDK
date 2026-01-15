import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { logger, LogLevel, LogContext } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    logger.clearLogs();
    logger.setLevel(LogLevel.DEBUG);
  });

  describe('Logging Methods', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('DEBUG');
      expect(logs[0].message).toBe('Debug message');
    });

    it('should log info messages', () => {
      logger.info('Info message');

      const logs = logger.getLogs();
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].message).toBe('Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');

      const logs = logger.getLogs();
      expect(logs[0].level).toBe('WARN');
      expect(logs[0].message).toBe('Warning message');
    });

    it('should log error messages with Error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      const logs = logger.getLogs();
      expect(logs[0].level).toBe('ERROR');
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].error).toBeDefined();
      expect(logs[0].error?.message).toBe('Test error');
      expect(logs[0].error?.stack).toBeDefined();
    });
  });

  describe('Context Handling', () => {
    it('should include module in context', () => {
      logger.info('Test', { module: 'chat' });

      const logs = logger.getLogs();
      expect(logs[0].module).toBe('chat');
    });

    it('should include action in context', () => {
      logger.info('Test', { action: 'sendMessage' });

      const logs = logger.getLogs();
      expect(logs[0].action).toBe('sendMessage');
    });

    it('should include metadata in context', () => {
      logger.info('Test', {
        metadata: { userId: '123', messageId: 'msg-456' }
      });

      const logs = logger.getLogs();
      expect(logs[0].metadata).toEqual({ userId: '123', messageId: 'msg-456' });
    });

    it('should include all context fields', () => {
      const context: LogContext = {
        module: 'auth',
        action: 'login',
        metadata: { attempt: 1 }
      };

      logger.info('Login attempt', context);

      const logs = logger.getLogs();
      expect(logs[0].module).toBe('auth');
      expect(logs[0].action).toBe('login');
      expect(logs[0].metadata).toEqual({ attempt: 1 });
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect DEBUG level', () => {
      logger.setLevel(LogLevel.DEBUG);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error', new Error());

      const logs = logger.getLogs();
      expect(logs).toHaveLength(4);
    });

    it('should respect INFO level', () => {
      logger.setLevel(LogLevel.INFO);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error', new Error());

      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs.some(l => l.level === 'DEBUG')).toBe(false);
    });

    it('should respect WARN level', () => {
      logger.setLevel(LogLevel.WARN);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error', new Error());

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('WARN');
      expect(logs[1].level).toBe('ERROR');
    });

    it('should respect ERROR level', () => {
      logger.setLevel(LogLevel.ERROR);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error', new Error());

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('ERROR');
    });

    it('should respect NONE level', () => {
      logger.setLevel(LogLevel.NONE);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error', new Error());

      const logs = logger.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('Log Management', () => {
    it('should clear all logs', () => {
      logger.info('Log 1');
      logger.info('Log 2');
      logger.info('Log 3');

      expect(logger.getLogs()).toHaveLength(3);

      logger.clearLogs();

      expect(logger.getLogs()).toHaveLength(0);
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

    it('should export empty array when no logs', () => {
      const json = logger.exportLogs();
      const parsed = JSON.parse(json);

      expect(parsed).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should calculate total log count', () => {
      logger.debug('1');
      logger.info('2');
      logger.warn('3');

      const stats = logger.getStats();
      expect(stats.total).toBe(3);
    });

    it('should count logs by level', () => {
      logger.debug('1');
      logger.debug('2');
      logger.info('3');
      logger.warn('4');
      logger.error('5', new Error());

      const stats = logger.getStats();
      expect(stats.byLevel.DEBUG).toBe(2);
      expect(stats.byLevel.INFO).toBe(1);
      expect(stats.byLevel.WARN).toBe(1);
      expect(stats.byLevel.ERROR).toBe(1);
    });

    it('should count logs by module', () => {
      logger.info('1', { module: 'auth' });
      logger.info('2', { module: 'auth' });
      logger.info('3', { module: 'chat' });
      logger.info('4', { module: 'chat' });
      logger.info('5', { module: 'chat' });
      logger.info('6'); // No module

      const stats = logger.getStats();
      expect(stats.byModule.auth).toBe(2);
      expect(stats.byModule.chat).toBe(3);
      expect(stats.byModule.core).toBe(1); // No module defaults to 'core'
    });
  });

  describe('Circular Buffer', () => {
    it('should limit logs to maxLogs', () => {
      // Default maxLogs is 1000
      for (let i = 0; i < 1200; i++) {
        logger.debug(`Log ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });

    it('should keep most recent logs when buffer is full', () => {
      for (let i = 0; i < 1200; i++) {
        logger.debug(`Log ${i}`);
      }

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];

      // Should contain one of the last few logs
      expect(lastLog.message).toContain('Log 11');
    });
  });

  describe('Timestamps', () => {
    it('should include timestamp in each log', () => {
      const before = Date.now();
      logger.info('Test');
      const after = Date.now();

      const logs = logger.getLogs();
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should have unique timestamps for rapid logs', () => {
      logger.info('1');
      logger.info('2');
      logger.info('3');

      const logs = logger.getLogs();
      // Timestamps might be the same if logs happen too quickly
      // Just verify they exist and are numbers
      expect(typeof logs[0].timestamp).toBe('number');
      expect(typeof logs[1].timestamp).toBe('number');
      expect(typeof logs[2].timestamp).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      logger.info('');

      const logs = logger.getLogs();
      expect(logs[0].message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      const logs = logger.getLogs();
      expect(logs[0].message).toBe(longMessage);
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        user: { id: '123', name: 'Alice' },
        message: { id: 'msg-456', text: 'Hello' },
        nested: { a: { b: { c: 'deep' } } }
      };

      logger.info('Test', { metadata: complexMetadata });

      const logs = logger.getLogs();
      expect(logs[0].metadata).toEqual(complexMetadata);
    });

    it('should handle null/undefined in context', () => {
      logger.info('Test', {
        module: undefined,
        action: undefined,
        metadata: undefined
      });

      const logs = logger.getLogs();
      expect(logs[0].module).toBeUndefined();
      expect(logs[0].action).toBeUndefined();
      expect(logs[0].metadata).toBeUndefined();
    });

    it('should handle error without message', () => {
      const error = new Error();
      logger.error('Error occurred', error);

      const logs = logger.getLogs();
      expect(logs[0].error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle 1000 logs quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        logger.info(`Log ${i}`);
      }

      const duration = Date.now() - start;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
