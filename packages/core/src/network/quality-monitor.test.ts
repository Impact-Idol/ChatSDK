import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkQualityMonitor, NetworkQuality, NetworkMetrics } from './quality-monitor';

// Mock fetch globally
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true,
});

// Mock window event listeners
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

describe('NetworkQualityMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default config', () => {
      const monitor = new NetworkQualityMonitor();
      const metrics = monitor.getMetrics();

      expect(metrics.quality).toBe(NetworkQuality.GOOD);
      expect(metrics.isOnline).toBe(true);
      expect(metrics.latency).toBe(0);
      expect(metrics.packetLoss).toBe(0);

      monitor.destroy();
    });

    it('initializes with custom config', () => {
      const monitor = new NetworkQualityMonitor({
        apiUrl: 'http://localhost:5500',
        pingInterval: 5000,
        debug: true,
      });

      expect(monitor).toBeDefined();
      monitor.destroy();
    });

    it('registers browser online/offline listeners', () => {
      const monitor = new NetworkQualityMonitor();

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

      monitor.destroy();
    });
  });

  describe('Latency Measurement', () => {
    it('measures latency successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });

      // Wait for initial ping
      await vi.runAllTimersAsync();

      const metrics = monitor.getMetrics();
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
      expect(metrics.quality).not.toBe(NetworkQuality.OFFLINE);

      monitor.destroy();
    });

    it('handles ping failures', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });

      // Wait for initial ping
      await vi.runAllTimersAsync();

      const metrics = monitor.getMetrics();
      expect(metrics.packetLoss).toBeGreaterThan(0);

      monitor.destroy();
    });
  });

  describe('Quality Classification', () => {
    it('classifies EXCELLENT quality (<50ms, no loss)', async () => {
      vi.setSystemTime(new Date('2024-01-01'));

      (global.fetch as any).mockImplementation(() => {
        return Promise.resolve({ ok: true, status: 200 });
      });

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });

      // Simulate fast response (10ms)
      vi.setSystemTime(new Date('2024-01-01T00:00:00.010Z'));
      await monitor.ping();

      const metrics = monitor.getMetrics();
      expect(metrics.quality).toBe(NetworkQuality.EXCELLENT);

      monitor.destroy();
    });

    it('classifies OFFLINE when browser is offline', () => {
      // Mock navigator.onLine = false
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const monitor = new NetworkQualityMonitor();
      const metrics = monitor.getMetrics();

      expect(metrics.isOnline).toBe(false);

      monitor.destroy();

      // Reset
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      });
    });

    it('classifies POOR quality (high latency)', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        // Simulate 400ms delay
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, status: 200 });
          }, 400);
        });
      });

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });

      // Trigger ping
      await monitor.ping();

      const metrics = monitor.getMetrics();
      expect(metrics.latency).toBeGreaterThan(300);
      expect(metrics.quality).toBe(NetworkQuality.POOR);

      monitor.destroy();
    });
  });

  describe('Packet Loss Tracking', () => {
    it('increases packet loss on failures', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });

      // Initial state
      expect(monitor.getMetrics().packetLoss).toBe(0);

      // Trigger multiple failures
      await monitor.ping();
      expect(monitor.getMetrics().packetLoss).toBeGreaterThan(0);

      await monitor.ping();
      expect(monitor.getMetrics().packetLoss).toBeGreaterThan(10);

      monitor.destroy();
    });

    it('decreases packet loss on success (recovery)', async () => {
      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });

      // Simulate initial failures
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      await monitor.ping();
      const highLoss = monitor.getMetrics().packetLoss;
      expect(highLoss).toBeGreaterThan(0);

      // Now simulate success
      (global.fetch as any).mockResolvedValue({ ok: true, status: 200 });
      await monitor.ping();

      const lowLoss = monitor.getMetrics().packetLoss;
      expect(lowLoss).toBeLessThan(highLoss);

      monitor.destroy();
    });
  });

  describe('Subscription', () => {
    it('notifies subscribers on metric changes', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });
      const updates: NetworkMetrics[] = [];

      const unsubscribe = monitor.subscribe((metrics) => {
        updates.push(metrics);
      });

      // Initial callback
      expect(updates.length).toBeGreaterThan(0);

      // Trigger ping to cause update
      await monitor.ping();

      // Should have received update
      expect(updates.length).toBeGreaterThan(1);

      unsubscribe();
      monitor.destroy();
    });

    it('unsubscribe stops notifications', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });
      const updates: NetworkMetrics[] = [];

      const unsubscribe = monitor.subscribe((metrics) => {
        updates.push(metrics);
      });

      const countBefore = updates.length;

      // Unsubscribe
      unsubscribe();

      // Trigger ping
      await monitor.ping();

      // Should not have received new updates
      expect(updates.length).toBe(countBefore);

      monitor.destroy();
    });

    it('handles multiple subscribers', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const monitor = new NetworkQualityMonitor({ pingInterval: 60000 });
      const updates1: NetworkMetrics[] = [];
      const updates2: NetworkMetrics[] = [];

      const unsubscribe1 = monitor.subscribe((metrics) => updates1.push(metrics));
      const unsubscribe2 = monitor.subscribe((metrics) => updates2.push(metrics));

      await monitor.ping();

      // Both should have received updates
      expect(updates1.length).toBeGreaterThan(0);
      expect(updates2.length).toBeGreaterThan(0);

      unsubscribe1();
      unsubscribe2();
      monitor.destroy();
    });
  });

  describe('Periodic Monitoring', () => {
    it('pings periodically at configured interval', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const monitor = new NetworkQualityMonitor({ pingInterval: 1000 }); // 1s

      // Initial ping
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance 1 second
      await vi.advanceTimersByTimeAsync(1000);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Advance another second
      await vi.advanceTimersByTimeAsync(1000);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      monitor.destroy();
    });
  });

  describe('Browser Events', () => {
    it('handles online event', () => {
      const monitor = new NetworkQualityMonitor();

      // Get the online handler
      const onlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'online'
      )?.[1];

      expect(onlineHandler).toBeDefined();

      // Simulate offline state
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      // Trigger online event
      if (onlineHandler) {
        onlineHandler();
      }

      const metrics = monitor.getMetrics();
      expect(metrics.isOnline).toBe(true);

      monitor.destroy();

      // Reset
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        writable: true,
      });
    });

    it('handles offline event', () => {
      const monitor = new NetworkQualityMonitor();

      // Get the offline handler
      const offlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'offline'
      )?.[1];

      expect(offlineHandler).toBeDefined();

      // Trigger offline event
      if (offlineHandler) {
        offlineHandler();
      }

      const metrics = monitor.getMetrics();
      expect(metrics.isOnline).toBe(false);
      expect(metrics.quality).toBe(NetworkQuality.OFFLINE);

      monitor.destroy();
    });
  });

  describe('Cleanup', () => {
    it('cleans up resources on destroy', () => {
      const monitor = new NetworkQualityMonitor({ pingInterval: 1000 });

      monitor.destroy();

      // Should have removed event listeners
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('stops pinging after destroy', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const monitor = new NetworkQualityMonitor({ pingInterval: 1000 });

      const callsBefore = (global.fetch as any).mock.calls.length;

      monitor.destroy();

      // Advance time
      await vi.advanceTimersByTimeAsync(2000);

      // Should not have made new calls
      expect((global.fetch as any).mock.calls.length).toBe(callsBefore);
    });
  });
});
