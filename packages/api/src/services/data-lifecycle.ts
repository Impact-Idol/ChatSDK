import { createCipheriv, createHash, randomBytes } from 'crypto';
import type { PoolClient } from 'pg';
import { db } from './database';
import { deleteFile } from './storage';
import { enqueueSearchIndexOperationTx } from './search';
import { extractStorageKeyFromUrl } from './media-urls';
import { config } from '../config/defaults';
import logger from './logger';
import {
  lifecyclePurgeDepth,
  lifecyclePurgeOldestPendingSeconds,
  trackLifecyclePurgeAttempt,
} from './metrics';

const LIFECYCLE_URL_BASE = 'http://chatsdk.local';
const EXPORT_TTL_DAYS = 7;
const DEFAULT_PURGE_INTERVAL_MS = 60_000;
const DEFAULT_PURGE_LIMIT = 100;
const DEFAULT_PURGE_MAX_PENDING_SECONDS = 900;
const DEFAULT_PURGE_MAX_FAILED = 0;
const DEFAULT_PURGE_MAX_REJECTED = 0;

let purgeWorkerTimer: NodeJS.Timeout | null = null;
let purgeDrainInFlight = false;

function readNonNegativeNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export interface SoftDeleteInput {
  appId: string;
  channelId: string;
  messageId: string;
  deletedBy: string;
  reason?: string;
}

export interface HardPurgeInput {
  appId: string;
  messageId: string;
  purgedBy: string;
  reason?: string;
}

export interface UserAnonymizeInput {
  appId: string;
  userId: string;
  deletedBy?: string;
  reason?: string;
}

export interface DataLifecyclePurgeHealth {
  status: 'ok' | 'error';
  pending: number;
  failed: number;
  rejected: number;
  oldestPendingSeconds: number;
  message?: string;
}

export async function softDeleteMessage(
  client: PoolClient,
  input: SoftDeleteInput
): Promise<{ deletedAt: string | Date; storageKeys: string[] }> {
  const existing = await client.query(
    `SELECT attachments, voice_url, video_url, video_thumbnail_url, legal_hold_until,
            (legal_hold_until IS NOT NULL AND legal_hold_until > NOW()) AS legal_hold_active
     FROM message
     WHERE id = $1 AND channel_id = $2 AND app_id = $3
     FOR UPDATE`,
    [input.messageId, input.channelId, input.appId]
  );

  if (existing.rows.length === 0) {
    throw new Error('MESSAGE_NOT_FOUND');
  }

  if (existing.rows[0].legal_hold_active) {
    throw new Error('LEGAL_HOLD_ACTIVE');
  }

  const storageKeys = extractMessageStorageKeys(input.appId, existing.rows[0]);

  const result = await client.query(
    `UPDATE message
     SET deleted_at = COALESCE(deleted_at, NOW()),
         deleted_by = COALESCE(deleted_by, $4),
         delete_reason = COALESCE($5, delete_reason),
         text = NULL,
         attachments = '[]'::jsonb,
         voice_url = NULL,
         voice_waveform = NULL,
         video_url = NULL,
         video_thumbnail_url = NULL,
         purge_after = COALESCE(purge_after, NOW() + INTERVAL '30 days')
     WHERE id = $1 AND channel_id = $2 AND app_id = $3
       AND (legal_hold_until IS NULL OR legal_hold_until <= NOW())
     RETURNING deleted_at`,
    [input.messageId, input.channelId, input.appId, input.deletedBy, input.reason ?? 'user_delete']
  );

  if (result.rows.length === 0) {
    throw new Error('LEGAL_HOLD_ACTIVE');
  }

  await recordPurgeLedger(client, input.appId, 'message_attachment', input.messageId, storageKeys, 'pending');
  await markUploadsPurged(client, input.appId, storageKeys, 'message_soft_delete');

  return {
    deletedAt: result.rows[0].deleted_at,
    storageKeys,
  };
}

export async function hardPurgeMessage(input: HardPurgeInput): Promise<{
  purged: boolean;
  storageKeys: string[];
}> {
  return db.transaction(async (client) => {
    const result = await client.query(
      `SELECT channel_id, attachments, voice_url, video_url, video_thumbnail_url, legal_hold_until,
              (legal_hold_until IS NOT NULL AND legal_hold_until > NOW()) AS legal_hold_active
       FROM message
       WHERE id = $1 AND app_id = $2
       FOR UPDATE`,
      [input.messageId, input.appId]
    );

    if (result.rows.length === 0) {
      return { purged: false, storageKeys: [] };
    }

    const message = result.rows[0];
    if (message.legal_hold_active) {
      throw new Error('LEGAL_HOLD_ACTIVE');
    }

    const storageKeys = extractMessageStorageKeys(input.appId, message);

    const purged = await client.query(
      `UPDATE message
       SET deleted_at = COALESCE(deleted_at, NOW()),
           hard_deleted_at = NOW(),
           deleted_by = COALESCE(deleted_by, $3),
           delete_reason = COALESCE($4, delete_reason),
           text = NULL,
           attachments = '[]'::jsonb,
           voice_url = NULL,
           voice_waveform = NULL,
           video_url = NULL,
           video_thumbnail_url = NULL,
           embedding_id = NULL,
           purge_after = NOW()
       WHERE id = $1 AND app_id = $2
         AND (legal_hold_until IS NULL OR legal_hold_until <= NOW())
       RETURNING id`,
      [input.messageId, input.appId, input.purgedBy, input.reason ?? 'hard_purge']
    );

    if (purged.rows.length === 0) {
      throw new Error('LEGAL_HOLD_ACTIVE');
    }

    await recordPurgeLedger(client, input.appId, 'message', input.messageId, storageKeys, 'pending');
    await markUploadsPurged(client, input.appId, storageKeys, 'message_hard_purge');
    await enqueueSearchIndexOperationTx(client, input.appId, input.messageId, 'delete');

    return { purged: true, storageKeys };
  });
}

export async function purgeStorageKeys(appId: string, storageKeys: string[]): Promise<void> {
  for (const key of storageKeys) {
    const startedAt = Date.now();
    if (!storageKeyBelongsToApp(appId, key)) {
      await recordStoragePurgeStatus(appId, key, 'rejected', 'Storage key does not belong to app');
      trackLifecyclePurgeAttempt(appId, 'rejected', (Date.now() - startedAt) / 1000);
      continue;
    }

    try {
      await deleteFile(key);
      await recordStoragePurgeStatus(appId, key, 'completed');
      trackLifecyclePurgeAttempt(appId, 'success', (Date.now() - startedAt) / 1000);
    } catch (error: any) {
      await recordStoragePurgeStatus(
        appId,
        key,
        'pending',
        error?.message ? `Retryable object delete failure: ${error.message}` : 'Retryable object delete failure'
      );
      trackLifecyclePurgeAttempt(appId, 'failure', (Date.now() - startedAt) / 1000);
    }
  }
}

export function startDataLifecyclePurgeWorker(): void {
  if (purgeWorkerTimer) {
    return;
  }

  const intervalMs = Number(process.env.DATA_LIFECYCLE_PURGE_INTERVAL_MS ?? DEFAULT_PURGE_INTERVAL_MS);
  purgeWorkerTimer = setInterval(() => {
    triggerDataLifecyclePurgeDrain();
  }, intervalMs);
  purgeWorkerTimer.unref?.();
  triggerDataLifecyclePurgeDrain();
}

export function stopDataLifecyclePurgeWorker(): void {
  if (purgeWorkerTimer) {
    clearInterval(purgeWorkerTimer);
    purgeWorkerTimer = null;
  }
}

export function triggerDataLifecyclePurgeDrain(): void {
  void processPendingStoragePurges(undefined, DEFAULT_PURGE_LIMIT).catch((error) => {
    logger.warn({ error }, 'Data lifecycle storage purge drain failed');
  });
}

export async function processPendingStoragePurges(
  appId?: string,
  limit = DEFAULT_PURGE_LIMIT
): Promise<{ processed: number }> {
  if (purgeDrainInFlight) {
    return { processed: 0 };
  }

  purgeDrainInFlight = true;
  try {
    const pending = appId
      ? await queryPendingStoragePurgesForApp(appId, limit)
      : await queryPendingStoragePurges(limit);

    const keysByApp = new Map<string, string[]>();
    for (const row of pending.rows) {
      const rowAppId = row.app_id ?? appId;
      if (!rowAppId || !row.storage_key) {
        continue;
      }
      const keys = keysByApp.get(rowAppId) ?? [];
      keys.push(row.storage_key);
      keysByApp.set(rowAppId, keys);
    }

    let processed = 0;
    for (const [pendingAppId, keys] of keysByApp) {
      await purgeStorageKeys(pendingAppId, keys);
      processed += keys.length;
    }
    await checkDataLifecyclePurgeHealth();
    return { processed };
  } finally {
    purgeDrainInFlight = false;
  }
}

export async function checkDataLifecyclePurgeHealth(): Promise<DataLifecyclePurgeHealth> {
  try {
    const result = await withSystemContext(() =>
      db.query<{
        pending: string;
        failed: string;
        rejected: string;
        oldest_pending_seconds: string | null;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
           COUNT(*) FILTER (WHERE status = 'missing_or_failed')::text AS failed,
           COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected,
           EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (
             WHERE status = 'pending'
           )))::text AS oldest_pending_seconds
         FROM data_purge_ledger`
      )
    );

    const row = result.rows[0] ?? {
      pending: '0',
      failed: '0',
      rejected: '0',
      oldest_pending_seconds: null,
    };
    const pending = parseInt(row.pending, 10);
    const failed = parseInt(row.failed, 10);
    const rejected = parseInt(row.rejected, 10);
    const oldestPendingSeconds = Math.max(0, Math.floor(Number(row.oldest_pending_seconds ?? 0)));

    lifecyclePurgeDepth.set({ status: 'pending' }, pending);
    lifecyclePurgeDepth.set({ status: 'missing_or_failed' }, failed);
    lifecyclePurgeDepth.set({ status: 'rejected' }, rejected);
    lifecyclePurgeOldestPendingSeconds.set(oldestPendingSeconds);

    const maxPendingSeconds = readNonNegativeNumberEnv(
      'DATA_LIFECYCLE_PURGE_MAX_PENDING_SECONDS',
      DEFAULT_PURGE_MAX_PENDING_SECONDS
    );
    const maxFailed = readNonNegativeNumberEnv('DATA_LIFECYCLE_PURGE_MAX_FAILED', DEFAULT_PURGE_MAX_FAILED);
    const maxRejected = readNonNegativeNumberEnv(
      'DATA_LIFECYCLE_PURGE_MAX_REJECTED',
      DEFAULT_PURGE_MAX_REJECTED
    );
    if (failed > maxFailed || rejected > maxRejected || oldestPendingSeconds > maxPendingSeconds) {
      return {
        status: 'error',
        pending,
        failed,
        rejected,
        oldestPendingSeconds,
        message: `Lifecycle purge unhealthy: failed=${failed} rejected=${rejected} oldest_pending_seconds=${oldestPendingSeconds}`,
      };
    }

    return { status: 'ok', pending, failed, rejected, oldestPendingSeconds };
  } catch (error: any) {
    return {
      status: 'error',
      pending: 0,
      failed: 0,
      rejected: 0,
      oldestPendingSeconds: 0,
      message: error?.message || 'Lifecycle purge health check failed',
    };
  }
}

export async function anonymizeUser(input: UserAnonymizeInput): Promise<boolean> {
  const deletedAt = new Date().toISOString();
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE app_user
       SET name = $3,
           image_url = NULL,
           custom_data = jsonb_build_object(
             'deleted', true,
             'deleted_at', $4::text,
             'deleted_by', COALESCE($5, 'system'),
             'delete_reason', COALESCE($6, 'user_delete')
           ),
           last_active_at = NULL,
           updated_at = NOW()
       WHERE app_id = $1 AND id = $2`,
      [
        input.appId,
        input.userId,
        `Deleted user ${createHash('sha256').update(`${input.appId}:${input.userId}`).digest('hex').slice(0, 8)}`,
        deletedAt,
        input.deletedBy ?? null,
        input.reason ?? null,
      ]
    );

    const anonymized = (result.rowCount ?? 0) > 0;
    if (anonymized) {
      await client.query(
        `DELETE FROM device_token
         WHERE app_id = $1 AND user_id = $2`,
        [input.appId, input.userId]
      );
    }
    return anonymized;
  });
}

export async function createDataExport(input: {
  appId: string;
  requestedBy: string;
  scopeType: 'app' | 'channel' | 'user';
  scopeId?: string;
}): Promise<{
  id: string;
  manifest: Record<string, unknown>;
  artifact: Record<string, unknown>;
  checksum: string;
  expiresAt: string;
}> {
  if (input.scopeType === 'app') {
    throw new Error('APP_EXPORT_REQUIRES_STREAMING');
  }

  const messages = await db.query(
    `SELECT id, channel_id, user_id, seq, text, attachments, voice_url, video_url,
            video_thumbnail_url, deleted_at, deleted_by, delete_reason, hard_deleted_at,
            created_at, edited_at
     FROM message
     WHERE app_id = $1
       AND ($2::text != 'channel' OR channel_id::text = $3)
       AND ($2::text != 'user' OR user_id = $3)
     ORDER BY created_at ASC`,
    [input.appId, input.scopeType, input.scopeId ?? null]
  );

  const uploads = await db.query(
    `SELECT id, channel_id, user_id, filename, content_type, size, storage_key,
            thumbnail_storage_key, status, purged_at, created_at
     FROM upload
     WHERE app_id = $1
       AND ($2::text != 'channel' OR channel_id::text = $3)
       AND ($2::text != 'user' OR user_id = $3)
     ORDER BY created_at ASC`,
    [input.appId, input.scopeType, input.scopeId ?? null]
  );

  const deletions = messages.rows
    .filter((row) => row.deleted_at || row.hard_deleted_at)
    .map((row) => ({
      messageId: row.id,
      channelId: row.channel_id,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      reason: row.delete_reason,
      hardDeletedAt: row.hard_deleted_at,
    }));

  const liveStorageKeys = new Set<string>();
  for (const row of messages.rows) {
    if (row.deleted_at || row.hard_deleted_at) {
      continue;
    }
    for (const key of extractMessageStorageKeys(input.appId, row)) {
      liveStorageKeys.add(key);
    }
  }

  const artifact = {
    scope: {
      appId: input.appId,
      type: input.scopeType,
      id: input.scopeId ?? null,
    },
    messages: messages.rows.map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      userId: row.user_id,
      seq: row.seq,
      text: row.deleted_at || row.hard_deleted_at ? null : row.text,
      attachments: row.deleted_at || row.hard_deleted_at ? [] : row.attachments,
      deletedAt: row.deleted_at,
      hardDeletedAt: row.hard_deleted_at,
      createdAt: row.created_at,
      editedAt: row.edited_at,
    })),
    attachments: uploads.rows.map((row) => {
      const storageKeyLive = row.storage_key && liveStorageKeys.has(row.storage_key);
      const thumbnailKeyLive = row.thumbnail_storage_key && liveStorageKeys.has(row.thumbnail_storage_key);
      const redacted = row.purged_at || (!storageKeyLive && !thumbnailKeyLive);
      return {
        id: row.id,
        channelId: row.channel_id,
        userId: row.user_id,
        filename: redacted ? null : row.filename,
        contentType: row.content_type,
        size: row.size,
        storageKey: storageKeyLive ? row.storage_key : null,
        thumbnailStorageKey: thumbnailKeyLive ? row.thumbnail_storage_key : null,
        status: row.status,
        purgedAt: row.purged_at,
        createdAt: row.created_at,
      };
    }),
    deletions,
  };

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    scope: artifact.scope,
    counts: {
      messages: messages.rows.length,
      deletions: deletions.length,
      attachments: uploads.rows.length,
    },
  };
  const checksum = createHash('sha256').update(JSON.stringify({ manifest, artifact })).digest('hex');
  const encryptedArtifact = encryptExportArtifact(artifact);
  const expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const saved = await db.query(
    `INSERT INTO data_export (app_id, requested_by, scope_type, scope_id, manifest, artifact, checksum, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, expires_at`,
    [
      input.appId,
      input.requestedBy,
      input.scopeType,
      input.scopeId ?? null,
      JSON.stringify(manifest),
      JSON.stringify(encryptedArtifact),
      checksum,
      expiresAt,
    ]
  );

  return {
    id: saved.rows[0].id,
    manifest,
    artifact: encryptedArtifact,
    checksum,
    expiresAt: saved.rows[0].expires_at,
  };
}

export function extractAttachmentStorageKeys(attachments: unknown): string[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  const keys = new Set<string>();
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== 'object') {
      continue;
    }
    const record = attachment as Record<string, unknown>;
    for (const field of ['url', 'thumbnailUrl']) {
      const value = record[field];
      if (typeof value !== 'string') {
        continue;
      }
      const key = extractStorageKeyFromUrl(value, LIFECYCLE_URL_BASE);
      if (key) {
        keys.add(key);
      }
    }
  }
  return [...keys];
}

function extractMessageStorageKeys(appId: string, row: Record<string, unknown>): string[] {
  const keys = new Set(extractAttachmentStorageKeys(row.attachments));
  for (const field of ['voice_url', 'video_url', 'video_thumbnail_url']) {
    const value = row[field];
    if (typeof value !== 'string') {
      continue;
    }

    const key = extractStorageKeyFromValue(value);
    if (key) {
      keys.add(key);
    }
  }
  return [...keys].filter((key) => storageKeyBelongsToApp(appId, key));
}

function extractStorageKeyFromValue(value: string): string | null {
  if (value.startsWith('apps/')) {
    return value;
  }
  return extractStorageKeyFromUrl(value, LIFECYCLE_URL_BASE);
}

function storageKeyBelongsToApp(appId: string, key: string): boolean {
  return key.startsWith(`apps/${appId}/`);
}

function isLegalHoldActive(value: unknown): boolean {
  if (!value) {
    return false;
  }
  const until = new Date(String(value)).getTime();
  return Number.isFinite(until) && until > Date.now();
}

async function recordStoragePurgeStatus(
  appId: string,
  storageKey: string,
  status: string,
  errorMessage: string | null = null
): Promise<void> {
  const writeLedger = () => db.query(
    `WITH updated AS (
       UPDATE data_purge_ledger
       SET status = $3,
           error_message = $4
       WHERE app_id = $1
         AND storage_key = $2
         AND status = 'pending'
       RETURNING id
     )
     INSERT INTO data_purge_ledger (app_id, resource_type, resource_id, storage_key, status, error_message)
     SELECT $1, 'storage_object', $2, $2, $3, $4
     WHERE NOT EXISTS (SELECT 1 FROM updated)`,
    [appId, storageKey, status, errorMessage]
  );
  if (typeof db.withIsolatedTenantContext === 'function') {
    await db.withIsolatedTenantContext({ appId, system: true }, writeLedger);
  } else {
    await writeLedger();
  }
}

async function queryPendingStoragePurgesForApp(appId: string, limit: number) {
  const queryPending = () => db.query(
    `SELECT app_id, storage_key
     FROM data_purge_ledger
     WHERE app_id = $1
       AND status = 'pending'
       AND storage_key IS NOT NULL
     ORDER BY created_at ASC
     LIMIT $2`,
    [appId, limit]
  );
  return typeof db.withIsolatedTenantContext === 'function'
    ? db.withIsolatedTenantContext({ appId, system: true }, queryPending)
    : queryPending();
}

async function queryPendingStoragePurges(limit: number) {
  const queryPending = () => db.query(
    `SELECT app_id, storage_key
     FROM data_purge_ledger
     WHERE status = 'pending'
       AND storage_key IS NOT NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return typeof db.withSystemContext === 'function'
    ? db.withSystemContext(queryPending)
    : queryPending();
}

async function withSystemContext<T>(fn: () => Promise<T>): Promise<T> {
  const runner = db.withSystemContext?.bind(db);
  if (typeof runner === 'function') {
    return runner(fn);
  }
  return fn();
}

async function markUploadsPurged(
  client: PoolClient,
  appId: string,
  storageKeys: string[],
  reason: string
): Promise<void> {
  if (storageKeys.length === 0) {
    return;
  }

  await client.query(
    `UPDATE upload
     SET purged_at = COALESCE(purged_at, NOW()),
         purge_reason = COALESCE(purge_reason, $3),
         status = 'purged',
         url = NULL,
         thumbnail_url = NULL,
         updated_at = NOW()
     WHERE app_id = $1
       AND (storage_key = ANY($2) OR thumbnail_storage_key = ANY($2))`,
    [appId, storageKeys, reason]
  );
}

async function recordPurgeLedger(
  client: PoolClient,
  appId: string,
  resourceType: string,
  resourceId: string,
  storageKeys: string[],
  status: string
): Promise<void> {
  if (storageKeys.length === 0) {
    await client.query(
      `INSERT INTO data_purge_ledger (app_id, resource_type, resource_id, status, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        appId,
        resourceType,
        resourceId,
        status === 'pending' ? 'completed' : status,
        status === 'pending' ? 'No storage objects to purge' : null,
      ]
    );
    return;
  }

  for (const key of storageKeys) {
    await client.query(
      `INSERT INTO data_purge_ledger (app_id, resource_type, resource_id, storage_key, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [appId, resourceType, resourceId, key, status]
    );
  }
}

function encryptExportArtifact(artifact: Record<string, unknown>): Record<string, unknown> {
  const key = createHash('sha256').update(config.jwt.secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(artifact), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: true,
    alg: 'A256GCM',
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
}
