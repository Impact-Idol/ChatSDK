import type { PoolClient } from 'pg';
import { db } from './database';
import { getCentrifugo } from './centrifugo';
import logger from './logger';
import {
  realtimeOutboxDepth,
  realtimeOutboxOldestPendingSeconds,
  realtimeOutboxPublishAttempts,
  realtimeOutboxPublishDuration,
} from './metrics';

export interface RealtimeOutboxEventInput {
  appId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  channels: string[];
  payload: unknown;
  idempotencyKey?: string;
}

interface RealtimeOutboxRow {
  id: string;
  app_id: string;
  event_type: string;
  channels: string[];
  payload: unknown;
  attempts: number;
}

export interface RealtimeOutboxDrainResult {
  claimed: number;
  published: number;
  failed: number;
}

export interface RealtimeOutboxHealth {
  status: 'ok' | 'error';
  pending: number;
  failed: number;
  oldestPendingSeconds: number;
  message?: string;
}

const DEFAULT_DRAIN_LIMIT = 50;
const DEFAULT_WORKER_INTERVAL_MS = 5000;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_LOCK_TIMEOUT_MS = 60000;
const DEFAULT_MAX_PENDING_SECONDS = 60;
const DEFAULT_MAX_FAILED = 0;
const RETRY_BASE_SECONDS = 2;
const RETRY_MAX_SECONDS = 300;
const PUBLISHED_PRUNE_INTERVAL_MS = 60_000;

let workerTimer: NodeJS.Timeout | null = null;
let drainInFlight = false;
let drainRerunRequested = false;
let lastPublishedPruneAt = 0;

function readNonNegativeNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function enqueueRealtimeEvent(
  client: PoolClient,
  input: RealtimeOutboxEventInput
): Promise<string | null> {
  if (input.channels.length === 0) {
    return null;
  }

  const result = await client.query<{ id: string }>(
    `INSERT INTO event_outbox (
       app_id, aggregate_type, aggregate_id, event_type, channels, payload, idempotency_key
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
     RETURNING id`,
    [
      input.appId,
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      input.channels,
      JSON.stringify(input.payload),
      input.idempotencyKey ?? null,
    ]
  );

  return result.rows[0]?.id ?? null;
}

export function triggerRealtimeOutboxDrain(): void {
  void drainRealtimeOutbox().catch((error) => {
    logger.warn({ error }, 'Realtime outbox drain failed');
  });
}

export function startRealtimeOutboxWorker(): void {
  if (workerTimer) {
    return;
  }

  const intervalMs = Number(process.env.REALTIME_OUTBOX_INTERVAL_MS ?? DEFAULT_WORKER_INTERVAL_MS);
  workerTimer = setInterval(() => {
    triggerRealtimeOutboxDrain();
    void refreshRealtimeOutboxMetrics().catch((error) => {
      logger.warn({ error }, 'Realtime outbox metrics refresh failed');
    });
  }, intervalMs);
  workerTimer.unref?.();

  triggerRealtimeOutboxDrain();
}

export function stopRealtimeOutboxWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

export async function drainRealtimeOutbox(
  limit = DEFAULT_DRAIN_LIMIT
): Promise<RealtimeOutboxDrainResult> {
  if (drainInFlight) {
    drainRerunRequested = true;
    return { claimed: 0, published: 0, failed: 0 };
  }

  drainInFlight = true;
  try {
    const total: RealtimeOutboxDrainResult = { claimed: 0, published: 0, failed: 0 };

    do {
      drainRerunRequested = false;
      const result = await drainRealtimeOutboxBatch(limit);
      total.claimed += result.claimed;
      total.published += result.published;
      total.failed += result.failed;
    } while (drainRerunRequested);

    await prunePublishedOutboxEvents();
    return total;
  } finally {
    drainInFlight = false;
    if (drainRerunRequested) {
      drainRerunRequested = false;
      triggerRealtimeOutboxDrain();
    }
  }
}

async function drainRealtimeOutboxBatch(limit: number): Promise<RealtimeOutboxDrainResult> {
  const maxAttempts = Number(process.env.REALTIME_OUTBOX_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
  const rows = await claimDueEvents(limit, maxAttempts);
  let published = 0;
  let failed = 0;

  for (const row of rows) {
    const endTimer = realtimeOutboxPublishDuration.startTimer({
      app_id: row.app_id,
      event_type: row.event_type,
    });

    try {
      await publishOutboxRow(row);
      await markPublished(row.id);
      realtimeOutboxPublishAttempts.inc({
        app_id: row.app_id,
        event_type: row.event_type,
        result: 'success',
      });
      published++;
    } catch (error: any) {
      await markFailed(row, error);
      realtimeOutboxPublishAttempts.inc({
        app_id: row.app_id,
        event_type: row.event_type,
        result: 'failure',
      });
      failed++;
    } finally {
      endTimer();
    }
  }

  return { claimed: rows.length, published, failed };
}

export async function checkRealtimeOutboxHealth(): Promise<RealtimeOutboxHealth> {
  try {
    const result = await withSystemContext(() =>
      db.query<{
        pending: string;
        failed: string;
        oldest_pending_seconds: string | null;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))::text AS pending,
           COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
           EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (
             WHERE status IN ('pending', 'processing', 'failed')
           )))::text AS oldest_pending_seconds
         FROM event_outbox`
      )
    );

    const row = result.rows[0] ?? { pending: '0', failed: '0', oldest_pending_seconds: null };
    const pending = parseInt(row.pending, 10);
    const failed = parseInt(row.failed, 10);
    const oldestPendingSeconds = Math.max(0, Math.floor(Number(row.oldest_pending_seconds ?? 0)));

    realtimeOutboxDepth.set({ status: 'pending' }, pending);
    realtimeOutboxDepth.set({ status: 'failed' }, failed);
    realtimeOutboxOldestPendingSeconds.set(oldestPendingSeconds);

    const maxPendingSeconds = readNonNegativeNumberEnv(
      'REALTIME_OUTBOX_MAX_PENDING_SECONDS',
      DEFAULT_MAX_PENDING_SECONDS
    );
    const maxFailed = readNonNegativeNumberEnv('REALTIME_OUTBOX_MAX_FAILED', DEFAULT_MAX_FAILED);
    if (failed > maxFailed || oldestPendingSeconds > maxPendingSeconds) {
      return {
        status: 'error',
        pending,
        failed,
        oldestPendingSeconds,
        message: `Realtime outbox unhealthy: failed=${failed} oldest_pending_seconds=${oldestPendingSeconds}`,
      };
    }

    return { status: 'ok', pending, failed, oldestPendingSeconds };
  } catch (error: any) {
    return {
      status: 'error',
      pending: 0,
      failed: 0,
      oldestPendingSeconds: 0,
      message: error.message || 'Realtime outbox health check failed',
    };
  }
}

async function claimDueEvents(limit: number, maxAttempts: number): Promise<RealtimeOutboxRow[]> {
  const lockTimeoutMs = Number(
    process.env.REALTIME_OUTBOX_LOCK_TIMEOUT_MS ?? DEFAULT_LOCK_TIMEOUT_MS
  );
  const result = await withSystemContext(() =>
    db.query<RealtimeOutboxRow>(
      `UPDATE event_outbox
       SET status = 'processing',
           locked_at = NOW(),
           attempts = attempts + 1,
           updated_at = NOW()
       WHERE id IN (
         SELECT id
         FROM event_outbox
         WHERE (
             (status IN ('pending', 'failed') AND next_attempt_at <= NOW())
             OR (status = 'processing' AND locked_at < NOW() - ($3 || ' milliseconds')::interval)
           )
           AND attempts < $2
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, app_id, event_type, channels, payload, attempts`,
      [limit, maxAttempts, lockTimeoutMs]
    )
  );

  return result.rows;
}

async function publishOutboxRow(row: RealtimeOutboxRow): Promise<void> {
  if (row.event_type === 'realtime.disconnect_user') {
    const payload = row.payload as { user?: unknown };
    if (typeof payload.user !== 'string' || !payload.user) {
      throw new Error('Invalid realtime.disconnect_user payload');
    }
    await getCentrifugo().disconnect(payload.user);
    return;
  }

  if (row.event_type === 'realtime.unsubscribe_user') {
    const payload = row.payload as { user?: unknown; channel?: unknown };
    if (typeof payload.user !== 'string' || typeof payload.channel !== 'string') {
      throw new Error('Invalid realtime.unsubscribe_user payload');
    }
    await getCentrifugo().unsubscribe(payload.channel, payload.user);
    return;
  }

  if (row.channels.length === 1) {
    await getCentrifugo().publish(row.channels[0], row.payload);
    return;
  }

  await getCentrifugo().broadcast(row.channels, row.payload);
}

async function markPublished(id: string): Promise<void> {
  await withSystemContext(() =>
    db.query(
      `UPDATE event_outbox
       SET status = 'published',
           published_at = NOW(),
           locked_at = NULL,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
  );
}

async function prunePublishedOutboxEvents(): Promise<void> {
  const now = Date.now();
  if (now - lastPublishedPruneAt < PUBLISHED_PRUNE_INTERVAL_MS) {
    return;
  }
  lastPublishedPruneAt = now;
  const retentionHours = readNonNegativeNumberEnv('REALTIME_OUTBOX_PUBLISHED_RETENTION_HOURS', 24);
  await withSystemContext(() =>
    db.query(
      `DELETE FROM event_outbox
       WHERE status = 'published'
         AND published_at < NOW() - ($1 || ' hours')::interval`,
      [retentionHours]
    )
  );
}

async function markFailed(row: RealtimeOutboxRow, error: any): Promise<void> {
  const nextDelaySeconds = Math.min(
    RETRY_MAX_SECONDS,
    RETRY_BASE_SECONDS * Math.pow(2, Math.max(0, row.attempts - 1))
  );

  await withSystemContext(() =>
    db.query(
      `UPDATE event_outbox
       SET status = 'failed',
           next_attempt_at = NOW() + ($2 || ' seconds')::interval,
           locked_at = NULL,
           last_error = LEFT($3, 1000),
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, nextDelaySeconds, error?.message || String(error)]
    )
  );
}

async function refreshRealtimeOutboxMetrics(): Promise<void> {
  await checkRealtimeOutboxHealth();
}

async function withSystemContext<T>(fn: () => Promise<T>): Promise<T> {
  const runner = db.withSystemContext?.bind(db);
  if (typeof runner === 'function') {
    return runner(fn);
  }
  return fn();
}
