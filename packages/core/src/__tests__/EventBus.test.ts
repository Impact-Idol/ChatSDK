import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus, getEventBus, resetEventBus } from '../callbacks/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('on/off', () => {
    it('should subscribe to events', () => {
      const callback = vi.fn();
      eventBus.on('message.new', callback);

      expect(eventBus.listenerCount('message.new')).toBe(1);
    });

    it('should call callback when event is emitted', async () => {
      const callback = vi.fn();
      eventBus.on('message.new', callback);

      const payload = {
        channelId: 'channel-1',
        message: {
          id: 'msg-1',
          cid: 'messaging:channel-1',
          type: 'regular' as const,
          seq: 1,
          created_at: new Date().toISOString(),
        },
      };

      eventBus.emit('message.new', payload);

      // Wait for async queue processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it('should unsubscribe via returned function', async () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('message.new', callback);

      unsubscribe();

      eventBus.emit('message.new', {
        channelId: 'channel-1',
        message: {
          id: 'msg-1',
          cid: 'messaging:channel-1',
          type: 'regular' as const,
          seq: 1,
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should unsubscribe via off method', async () => {
      const callback = vi.fn();
      eventBus.on('message.new', callback);
      eventBus.off('message.new', callback);

      eventBus.emit('message.new', {
        channelId: 'channel-1',
        message: {
          id: 'msg-1',
          cid: 'messaging:channel-1',
          type: 'regular' as const,
          seq: 1,
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire once', async () => {
      const callback = vi.fn();
      eventBus.once('connection.connected', callback);

      eventBus.emit('connection.connected', undefined);
      eventBus.emit('connection.connected', undefined);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('emit', () => {
    it('should emit to multiple listeners', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('typing.start', callback1);
      eventBus.on('typing.start', callback2);

      const payload = {
        channelId: 'channel-1',
        user: { id: 'user-1', name: 'Alice' },
      };

      eventBus.emit('typing.start', payload);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledWith(payload);
      expect(callback2).toHaveBeenCalledWith(payload);
    });

    it('should handle async callbacks', async () => {
      const order: number[] = [];

      eventBus.on('message.new', async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push(1);
      });

      eventBus.on('message.new', async () => {
        order.push(2);
      });

      eventBus.emit('message.new', {
        channelId: 'channel-1',
        message: {
          id: 'msg-1',
          cid: 'messaging:channel-1',
          type: 'regular' as const,
          seq: 1,
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Both callbacks should have been called
      expect(order).toContain(1);
      expect(order).toContain(2);
    });

    it('should catch errors in callbacks', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const goodCallback = vi.fn();

      eventBus.on('message.new', () => {
        throw new Error('Test error');
      });
      eventBus.on('message.new', goodCallback);

      eventBus.emit('message.new', {
        channelId: 'channel-1',
        message: {
          id: 'msg-1',
          cid: 'messaging:channel-1',
          type: 'regular' as const,
          seq: 1,
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Error should be caught and logged
      expect(consoleSpy).toHaveBeenCalled();
      // Other callbacks should still be called
      expect(goodCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('emitSync', () => {
    it('should emit synchronously', () => {
      const callback = vi.fn();
      eventBus.on('connection.connected', callback);

      eventBus.emitSync('connection.connected', undefined);

      // Should be called immediately
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      eventBus.on('message.new', vi.fn());
      eventBus.on('message.new', vi.fn());
      eventBus.on('typing.start', vi.fn());

      eventBus.removeAllListeners('message.new');

      expect(eventBus.listenerCount('message.new')).toBe(0);
      expect(eventBus.listenerCount('typing.start')).toBe(1);
    });

    it('should remove all listeners when no event specified', () => {
      eventBus.on('message.new', vi.fn());
      eventBus.on('typing.start', vi.fn());
      eventBus.on('connection.connected', vi.fn());

      eventBus.removeAllListeners();

      expect(eventBus.listenerCount('message.new')).toBe(0);
      expect(eventBus.listenerCount('typing.start')).toBe(0);
      expect(eventBus.listenerCount('connection.connected')).toBe(0);
    });
  });

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(eventBus.listenerCount('message.new')).toBe(0);

      eventBus.on('message.new', vi.fn());
      expect(eventBus.listenerCount('message.new')).toBe(1);

      eventBus.on('message.new', vi.fn());
      expect(eventBus.listenerCount('message.new')).toBe(2);
    });
  });

  describe('waitFor', () => {
    it('should resolve when event is emitted', async () => {
      const promise = eventBus.waitFor('connection.connected');

      setTimeout(() => {
        eventBus.emit('connection.connected', undefined);
      }, 10);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject on timeout', async () => {
      const promise = eventBus.waitFor('connection.connected', { timeout: 50 });

      await expect(promise).rejects.toThrow('Timeout waiting for event');
    });
  });

  describe('debug mode', () => {
    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const debugEventBus = new EventBus({ debug: true });

      debugEventBus.on('message.new', vi.fn());
      debugEventBus.emit('message.new', {
        channelId: 'channel-1',
        message: {
          id: 'msg-1',
          cid: 'messaging:channel-1',
          type: 'regular' as const,
          seq: 1,
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('Global EventBus', () => {
  afterEach(() => {
    resetEventBus();
  });

  it('should return singleton instance', () => {
    const bus1 = getEventBus();
    const bus2 = getEventBus();

    expect(bus1).toBe(bus2);
  });

  it('should reset global instance', () => {
    const bus1 = getEventBus();
    bus1.on('message.new', vi.fn());

    resetEventBus();

    const bus2 = getEventBus();
    expect(bus2).not.toBe(bus1);
    expect(bus2.listenerCount('message.new')).toBe(0);
  });
});
