import { describe, it, expect, beforeEach, vi } from 'vitest';
import { profiler, Profile, PerformanceStats } from './profiler';

describe('Performance Profiler', () => {
  beforeEach(() => {
    profiler.setEnabled(true);
    profiler.clear();
  });

  describe('Basic Timing', () => {
    it('should track operation duration', async () => {
      const end = profiler.start('test.operation');

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 50));

      end();

      const stats = profiler.getStats('test.operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBeGreaterThanOrEqual(45); // Allow 5ms variance
      expect(stats!.max).toBeGreaterThanOrEqual(45);
    });

    it('should return end function immediately', () => {
      const end = profiler.start('test');

      expect(typeof end).toBe('function');
    });

    it('should track multiple operations with same label', () => {
      for (let i = 0; i < 5; i++) {
        const end = profiler.start('repeated.operation');
        end();
      }

      const stats = profiler.getStats('repeated.operation');
      expect(stats!.count).toBe(5);
    });
  });

  describe('Direct Recording', () => {
    it('should record duration directly', () => {
      profiler.record('manual.metric', 100);

      const stats = profiler.getStats('manual.metric');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(100);
    });

    it('should accumulate multiple recordings', () => {
      profiler.record('metric', 10);
      profiler.record('metric', 20);
      profiler.record('metric', 30);

      const stats = profiler.getStats('metric');
      expect(stats!.count).toBe(3);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(30);
    });
  });

  describe('Async Measure', () => {
    it('should measure async function execution', async () => {
      const result = await profiler.measure('async.test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'completed';
      });

      expect(result).toBe('completed');

      const stats = profiler.getStats('async.test');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBeGreaterThanOrEqual(8); // Allow variance
    });

    it('should propagate async function errors', async () => {
      const errorFn = profiler.measure('error.test', async () => {
        throw new Error('Test error');
      });

      await expect(errorFn).rejects.toThrow('Test error');

      // Should still record the timing
      const stats = profiler.getStats('error.test');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should handle rejected promises', async () => {
      try {
        await profiler.measure('rejected', async () => {
          return Promise.reject('Rejected');
        });
        expect(true).toBe(false); // Should not reach
      } catch (err) {
        expect(err).toBe('Rejected');
      }

      const stats = profiler.getStats('rejected');
      expect(stats!.count).toBe(1);
    });
  });

  describe('Sync Measure', () => {
    it('should measure sync function execution', () => {
      const result = profiler.measureSync('sync.test', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);

      const stats = profiler.getStats('sync.test');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBeGreaterThan(0);
    });

    it('should propagate sync function errors', () => {
      expect(() => {
        profiler.measureSync('error.sync', () => {
          throw new Error('Sync error');
        });
      }).toThrow('Sync error');

      // Should still record the timing
      const stats = profiler.getStats('error.sync');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate min correctly', () => {
      profiler.record('stats', 50);
      profiler.record('stats', 100);
      profiler.record('stats', 75);

      const stats = profiler.getStats('stats');
      expect(stats!.min).toBe(50);
    });

    it('should calculate max correctly', () => {
      profiler.record('stats', 50);
      profiler.record('stats', 100);
      profiler.record('stats', 75);

      const stats = profiler.getStats('stats');
      expect(stats!.max).toBe(100);
    });

    it('should calculate average correctly', () => {
      profiler.record('stats', 10);
      profiler.record('stats', 20);
      profiler.record('stats', 30);

      const stats = profiler.getStats('stats');
      expect(stats!.avg).toBe(20);
    });

    it('should calculate total correctly', () => {
      profiler.record('stats', 10);
      profiler.record('stats', 20);
      profiler.record('stats', 30);

      const stats = profiler.getStats('stats');
      expect(stats!.total).toBe(60);
    });

    it('should calculate p50 (median) correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      values.forEach(v => profiler.record('percentile', v));

      const stats = profiler.getStats('percentile');
      // Math.floor(10 * 0.5) = 5, sorted[5] = 60
      expect(stats!.p50).toBe(60);
    });

    it('should calculate p95 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      values.forEach(v => profiler.record('p95', v));

      const stats = profiler.getStats('p95');
      // Math.floor(100 * 0.95) = 95, sorted[95] = 96
      expect(stats!.p95).toBe(96);
    });

    it('should calculate p99 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      values.forEach(v => profiler.record('p99', v));

      const stats = profiler.getStats('p99');
      // Math.floor(100 * 0.99) = 99, sorted[99] = 100
      expect(stats!.p99).toBe(100);
    });

    it('should handle single value', () => {
      profiler.record('single', 42);

      const stats = profiler.getStats('single');
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBe(42);
      expect(stats!.max).toBe(42);
      expect(stats!.avg).toBe(42);
      expect(stats!.p50).toBe(42);
      expect(stats!.p95).toBe(42);
      expect(stats!.p99).toBe(42);
    });
  });

  describe('Stats Retrieval', () => {
    it('should return null for unknown label', () => {
      const stats = profiler.getStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should return stats for known label', () => {
      profiler.record('known', 10);

      const stats = profiler.getStats('known');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should get all stats', () => {
      profiler.record('metric1', 10);
      profiler.record('metric2', 20);
      profiler.record('metric3', 30);

      const allStats = profiler.getAllStats();
      expect(allStats.size).toBe(3);
      expect(allStats.has('metric1')).toBe(true);
      expect(allStats.has('metric2')).toBe(true);
      expect(allStats.has('metric3')).toBe(true);
    });

    it('should return empty map when no stats', () => {
      const allStats = profiler.getAllStats();
      expect(allStats.size).toBe(0);
    });
  });

  describe('Summary', () => {
    it('should calculate summary statistics', () => {
      profiler.record('op1', 100);
      profiler.record('op1', 200);
      profiler.record('op2', 50);

      const summary = profiler.getSummary();
      expect(summary.totalOperations).toBe(3);
      expect(summary.totalDuration).toBe(350);
      expect(summary.slowestOperation).toBeDefined();
      expect(summary.slowestOperation?.label).toBe('op1');
      expect(summary.slowestOperation?.duration).toBe(200);
    });

    it('should return zero values when no operations', () => {
      const summary = profiler.getSummary();
      expect(summary.totalOperations).toBe(0);
      expect(summary.totalDuration).toBe(0);
      expect(summary.slowestOperation).toBeNull();
    });

    it('should find slowest operation across multiple labels', () => {
      profiler.record('fast', 10);
      profiler.record('medium', 50);
      profiler.record('slow', 100);
      profiler.record('slow', 200); // Slowest
      profiler.record('medium', 75);

      const summary = profiler.getSummary();
      expect(summary.slowestOperation?.label).toBe('slow');
      expect(summary.slowestOperation?.duration).toBe(200);
    });
  });

  describe('Metadata', () => {
    it('should include metadata in marks', () => {
      const end = profiler.start('test', { userId: '123' });
      end();

      const marks = profiler.getMarks();
      expect(marks[0].metadata).toEqual({ userId: '123' });
    });

    it('should handle metadata in record', () => {
      profiler.record('test', 100, { request: 'GET /api' });

      const marks = profiler.getMarks();
      expect(marks[0].metadata).toEqual({ request: 'GET /api' });
    });
  });

  describe('Marks Management', () => {
    it('should retrieve all marks', () => {
      profiler.record('op1', 10);
      profiler.record('op2', 20);

      const marks = profiler.getMarks();
      expect(marks.length).toBe(2);
    });

    it('should clear all marks and stats', () => {
      profiler.record('op1', 10);
      profiler.record('op2', 20);

      profiler.clear();

      expect(profiler.getMarks()).toHaveLength(0);
      expect(profiler.getAllStats().size).toBe(0);
    });

    it('should limit marks with circular buffer', () => {
      // Default maxMarks is 1000
      for (let i = 0; i < 1200; i++) {
        profiler.record('mark', 10);
      }

      const marks = profiler.getMarks();
      expect(marks.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Report Output', () => {
    it('should generate console report without errors', () => {
      const consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

      profiler.record('op1', 100);
      profiler.record('op2', 200);

      profiler.report();

      expect(consoleTableSpy).toHaveBeenCalled();

      consoleTableSpy.mockRestore();
    });

    it('should handle empty report', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      profiler.report();

      // When no data, report logs a message instead of calling console.table
      expect(consoleLogSpy).toHaveBeenCalledWith('No performance data collected yet.');

      consoleLogSpy.mockRestore();
    });
  });

  describe('Export', () => {
    it('should export all marks as JSON', () => {
      profiler.record('op1', 100);
      profiler.record('op2', 200);

      const json = profiler.export();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('recentMarks');
      expect(Object.keys(parsed.stats)).toHaveLength(2);
      expect(parsed.stats).toHaveProperty('op1');
      expect(parsed.stats).toHaveProperty('op2');
    });

    it('should export empty stats when no marks', () => {
      const json = profiler.export();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('recentMarks');
      expect(Object.keys(parsed.stats)).toHaveLength(0);
      expect(parsed.recentMarks).toHaveLength(0);
    });
  });

  describe('@Profile Decorator', () => {
    class TestClass {
      @Profile('test.method')
      async testMethod(value: number): Promise<number> {
        await new Promise(resolve => setTimeout(resolve, 10));
        return value * 2;
      }

      @Profile()
      async defaultLabel(): Promise<string> {
        return 'result';
      }
    }

    it('should profile decorated method', async () => {
      profiler.clear();
      const instance = new TestClass();

      const result = await instance.testMethod(21);

      expect(result).toBe(42);

      const stats = profiler.getStats('test.method');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.min).toBeGreaterThanOrEqual(8);
    });

    it('should use default label when not specified', async () => {
      profiler.clear();
      const instance = new TestClass();

      await instance.defaultLabel();

      const stats = profiler.getStats('TestClass.defaultLabel');
      expect(stats).toBeDefined();
    });

    it('should track multiple calls to decorated method', async () => {
      profiler.clear();
      const instance = new TestClass();

      await instance.testMethod(1);
      await instance.testMethod(2);
      await instance.testMethod(3);

      const stats = profiler.getStats('test.method');
      expect(stats!.count).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small durations', () => {
      const end = profiler.start('instant');
      end(); // Immediate

      const stats = profiler.getStats('instant');
      expect(stats!.min).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero duration', () => {
      profiler.record('zero', 0);

      const stats = profiler.getStats('zero');
      expect(stats!.min).toBe(0);
      expect(stats!.max).toBe(0);
      expect(stats!.avg).toBe(0);
    });

    it('should handle negative duration (edge case)', () => {
      profiler.record('negative', -10);

      const stats = profiler.getStats('negative');
      expect(stats!.min).toBe(-10);
    });

    it('should handle very large durations', () => {
      profiler.record('large', 999999);

      const stats = profiler.getStats('large');
      expect(stats!.max).toBe(999999);
    });

    it('should handle labels with special characters', () => {
      profiler.record('label:with-special.chars/test', 100);

      const stats = profiler.getStats('label:with-special.chars/test');
      expect(stats).toBeDefined();
    });

    it('should handle empty label', () => {
      profiler.record('', 100);

      const stats = profiler.getStats('');
      expect(stats).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle 1000 measurements quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        profiler.record('perf', Math.random() * 100);
      }

      const duration = performance.now() - start;

      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should calculate stats quickly for large dataset', () => {
      for (let i = 0; i < 1000; i++) {
        profiler.record('dataset', i);
      }

      const start = performance.now();
      const stats = profiler.getStats('dataset');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
      expect(stats!.count).toBe(1000);
    });
  });
});
