import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbQuery = vi.fn();
const mockPublish = vi.fn();
const mockBroadcast = vi.fn();
const mockDisconnect = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockDbQuery(...args),
  },
}));

vi.mock('../src/services/centrifugo', () => ({
  getCentrifugo: vi.fn(() => ({
    publish: (...args: any[]) => mockPublish(...args),
    broadcast: (...args: any[]) => mockBroadcast(...args),
    disconnect: (...args: any[]) => mockDisconnect(...args),
    unsubscribe: (...args: any[]) => mockUnsubscribe(...args),
  })),
}));

vi.mock('../src/services/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}));

import {
  checkRealtimeOutboxHealth,
  drainRealtimeOutbox,
  enqueueRealtimeEvent,
} from '../src/services/realtime-outbox';

const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';

describe('realtime outbox service', () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockPublish.mockReset();
    mockBroadcast.mockReset();
    mockDisconnect.mockReset();
    mockUnsubscribe.mockReset();
    delete process.env.REALTIME_OUTBOX_MAX_PENDING_SECONDS;
    delete process.env.REALTIME_OUTBOX_MAX_FAILED;
  });

  it('enqueues realtime events through the provided transaction client', async () => {
    const txClient = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] }),
    };

    const id = await enqueueRealtimeEvent(txClient as any, {
      appId: TEST_APP_ID,
      aggregateType: 'message',
      aggregateId: 'message-1',
      eventType: 'message.new',
      channels: ['chat:app:channel'],
      payload: { type: 'message.new', payload: { text: 'hello' } },
      idempotencyKey: 'message.new:message-1',
    });

    expect(id).toBe('event-1');
    expect(txClient.query).toHaveBeenCalledTimes(1);
    expect(String(txClient.query.mock.calls[0][0])).toContain('INSERT INTO event_outbox');
    expect(txClient.query.mock.calls[0][1]).toEqual([
      TEST_APP_ID,
      'message',
      'message-1',
      'message.new',
      ['chat:app:channel'],
      JSON.stringify({ type: 'message.new', payload: { text: 'hello' } }),
      'message.new:message-1',
    ]);
    expect(mockDbQuery).not.toHaveBeenCalled();
  });

  it('publishes claimed single-channel events and marks them published', async () => {
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'event-1',
          app_id: TEST_APP_ID,
          event_type: 'message.new',
          channels: ['chat:app:channel'],
          payload: { type: 'message.new' },
          attempts: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await drainRealtimeOutbox(10);

    expect(result).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(mockPublish).toHaveBeenCalledWith('chat:app:channel', { type: 'message.new' });
    expect(String(mockDbQuery.mock.calls[1][0])).toContain("SET status = 'published'");
  });

  it('broadcasts multi-channel events', async () => {
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'event-1',
          app_id: TEST_APP_ID,
          event_type: 'channel.created',
          channels: ['user:app:1', 'user:app:2'],
          payload: { type: 'channel.created' },
          attempts: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await drainRealtimeOutbox(10);

    expect(result).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(mockBroadcast).toHaveBeenCalledWith(
      ['user:app:1', 'user:app:2'],
      { type: 'channel.created' }
    );
  });

  it('publishes broker unsubscribe commands through Centrifugo unsubscribe', async () => {
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'event-1',
          app_id: TEST_APP_ID,
          event_type: 'realtime.unsubscribe_user',
          channels: [],
          payload: {
            user: `user:${TEST_APP_ID}:client-a:user-1`,
            channel: `chat:${TEST_APP_ID}:support-old`,
          },
          attempts: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await drainRealtimeOutbox(10);

    expect(result).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      `chat:${TEST_APP_ID}:support-old`,
      `user:${TEST_APP_ID}:client-a:user-1`
    );
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('marks failed publish attempts for retry without throwing', async () => {
    mockPublish.mockRejectedValueOnce(new Error('centrifugo down'));
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'event-1',
          app_id: TEST_APP_ID,
          event_type: 'message.new',
          channels: ['chat:app:channel'],
          payload: { type: 'message.new' },
          attempts: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await drainRealtimeOutbox(10);

    expect(result).toEqual({ claimed: 1, published: 0, failed: 1 });
    expect(String(mockDbQuery.mock.calls[1][0])).toContain("SET status = 'failed'");
    expect(mockDbQuery.mock.calls[1][1][2]).toBe('centrifugo down');
  });

  it('claims stale processing rows so worker crashes do not strand events forever', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    await drainRealtimeOutbox(10);

    const claimSql = String(mockDbQuery.mock.calls[0][0]);
    expect(claimSql).toContain("status = 'processing'");
    expect(claimSql).toContain('locked_at < NOW()');
    expect(mockDbQuery.mock.calls[0][1]).toEqual([10, 10, 60000]);
  });

  it('coalesces overlapping drain requests into an immediate follow-up pass', async () => {
    let resolvePublish: (() => void) | undefined;
    mockPublish.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolvePublish = resolve;
    }));
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'event-1',
          app_id: TEST_APP_ID,
          event_type: 'message.new',
          channels: ['chat:app:channel'],
          payload: { type: 'message.new' },
          attempts: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const firstDrain = drainRealtimeOutbox(10);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPublish).toHaveBeenCalledTimes(1);

    const overlappingDrain = await drainRealtimeOutbox(10);
    expect(overlappingDrain).toEqual({ claimed: 0, published: 0, failed: 0 });

    resolvePublish?.();
    const result = await firstDrain;

    expect(result).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(mockDbQuery.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(String(mockDbQuery.mock.calls[2][0])).toContain('FROM event_outbox');
  });

  it('reports healthy outbox metrics from aggregate query', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        pending: '2',
        failed: '0',
        oldest_pending_seconds: '42.5',
      }],
    });

    const health = await checkRealtimeOutboxHealth();

    expect(health).toEqual({
      status: 'ok',
      pending: 2,
      failed: 0,
      oldestPendingSeconds: 42,
    });
  });

  it('fails health when outbox backlog exceeds alert thresholds', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        pending: '2',
        failed: '1',
        oldest_pending_seconds: '90.5',
      }],
    });

    const health = await checkRealtimeOutboxHealth();

    expect(health.status).toBe('error');
    expect(health.pending).toBe(2);
    expect(health.failed).toBe(1);
    expect(health.oldestPendingSeconds).toBe(90);
    expect(health.message).toContain('Realtime outbox unhealthy');
  });

  it('includes processing rows when calculating oldest outbox backlog', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        pending: '1',
        failed: '0',
        oldest_pending_seconds: '61.2',
      }],
    });

    const health = await checkRealtimeOutboxHealth();

    expect(String(mockDbQuery.mock.calls[0][0])).toContain("status IN ('pending', 'processing', 'failed')");
    expect(health.status).toBe('error');
    expect(health.oldestPendingSeconds).toBe(61);
  });

  it('falls back to strict realtime readiness thresholds when env values are invalid', async () => {
    process.env.REALTIME_OUTBOX_MAX_PENDING_SECONDS = 'not-a-number';
    process.env.REALTIME_OUTBOX_MAX_FAILED = 'not-a-number';
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        pending: '1',
        failed: '1',
        oldest_pending_seconds: '61',
      }],
    });

    const health = await checkRealtimeOutboxHealth();

    expect(health.status).toBe('error');
    expect(health.message).toContain('Realtime outbox unhealthy');
  });
});
