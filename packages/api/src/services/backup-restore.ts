import { createHash } from 'crypto';

export interface RestoredUploadRow {
  id: string;
  appId: string;
  storageKey: string | null;
  thumbnailStorageKey?: string | null;
  status?: string | null;
}

export interface ObjectManifestEntry {
  key: string;
  size?: number;
  checksumSha256?: string;
  etag?: string;
  lastModified?: string;
}

export interface PurgeLedgerEntry {
  appId: string;
  storageKey: string | null;
  status: string;
}

export interface RestoreReconciliationGap {
  appId: string;
  uploadId?: string;
  storageKey: string;
  kind: 'missing_primary' | 'missing_thumbnail' | 'purged_object_restored' | 'upload_references_purged_object' | 'rejected_purge_key_present';
}

export interface RestoreReconciliationResult {
  checkedUploads: number;
  availableUploads: string[];
  tombstoneUploadIds: string[];
  thumbnailKeysToClear: string[];
  objectsToDelete: string[];
  gaps: RestoreReconciliationGap[];
}

export interface BackupDrillReportInput {
  runId: string;
  sourceEnvironment: string;
  restoreTarget: string;
  backupTimestamp: string;
  startedAt: string;
  finishedAt: string;
  postgresBackupPath: string;
  objectManifestPath: string;
  migrationVersion: string;
  postgresRpoSeconds: number;
  restoreRtoSeconds: number;
  reconciliation: RestoreReconciliationResult;
  verificationCommands: string[];
  playwrightResult: 'passed' | 'failed' | 'skipped';
  failures: string[];
  followUps: string[];
}

export interface BackupDrillReport extends BackupDrillReportInput {
  status: 'passed' | 'failed';
  generatedAt: string;
}

const PURGED_STATUSES = new Set(['completed', 'missing_or_failed']);

export function checksumObjectManifest(entries: ObjectManifestEntry[]): string {
  const canonical = [...entries]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => JSON.stringify({
      key: entry.key,
      size: entry.size ?? null,
      checksumSha256: entry.checksumSha256 ?? null,
      etag: entry.etag ?? null,
    }))
    .join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

export function reconcileRestoredObjects(input: {
  uploads: RestoredUploadRow[];
  objectManifest: ObjectManifestEntry[];
  purgeLedger: PurgeLedgerEntry[];
}): RestoreReconciliationResult {
  const manifestKeys = new Set(input.objectManifest.map((entry) => entry.key));
  const purgedKeysByApp = new Map<string, Set<string>>();
  const rejectedKeysByApp = new Map<string, Set<string>>();

  for (const entry of input.purgeLedger) {
    if (!entry.storageKey) {
      continue;
    }
    if (PURGED_STATUSES.has(entry.status)) {
      const keys = purgedKeysByApp.get(entry.appId) ?? new Set<string>();
      keys.add(entry.storageKey);
      purgedKeysByApp.set(entry.appId, keys);
    } else if (entry.status === 'rejected') {
      const keys = rejectedKeysByApp.get(entry.appId) ?? new Set<string>();
      keys.add(entry.storageKey);
      rejectedKeysByApp.set(entry.appId, keys);
    }
  }

  const gaps: RestoreReconciliationGap[] = [];
  const availableUploads: string[] = [];
  const tombstoneUploadIds = new Set<string>();
  const thumbnailKeysToClear = new Set<string>();
  const objectsToDelete = new Set<string>();

  for (const [appId, keys] of purgedKeysByApp.entries()) {
    for (const storageKey of keys) {
      if (manifestKeys.has(storageKey)) {
        objectsToDelete.add(storageKey);
        gaps.push({ appId, storageKey, kind: 'purged_object_restored' });
      }
    }
  }

  for (const [appId, keys] of rejectedKeysByApp.entries()) {
    for (const storageKey of keys) {
      if (manifestKeys.has(storageKey)) {
        gaps.push({ appId, storageKey, kind: 'rejected_purge_key_present' });
      }
    }
  }

  for (const upload of input.uploads) {
    const purgedKeys = purgedKeysByApp.get(upload.appId) ?? new Set<string>();
    let tombstone = false;

    if (!upload.storageKey || !manifestKeys.has(upload.storageKey)) {
      if (upload.storageKey) {
        gaps.push({
          appId: upload.appId,
          uploadId: upload.id,
          storageKey: upload.storageKey,
          kind: 'missing_primary',
        });
      }
      tombstone = true;
    } else if (purgedKeys.has(upload.storageKey)) {
      gaps.push({
        appId: upload.appId,
        uploadId: upload.id,
        storageKey: upload.storageKey,
        kind: 'upload_references_purged_object',
      });
      tombstone = true;
      objectsToDelete.add(upload.storageKey);
    }

    if (upload.thumbnailStorageKey) {
      if (!manifestKeys.has(upload.thumbnailStorageKey)) {
        gaps.push({
          appId: upload.appId,
          uploadId: upload.id,
          storageKey: upload.thumbnailStorageKey,
          kind: 'missing_thumbnail',
        });
        thumbnailKeysToClear.add(upload.thumbnailStorageKey);
      } else if (purgedKeys.has(upload.thumbnailStorageKey)) {
        gaps.push({
          appId: upload.appId,
          uploadId: upload.id,
          storageKey: upload.thumbnailStorageKey,
          kind: 'upload_references_purged_object',
        });
        thumbnailKeysToClear.add(upload.thumbnailStorageKey);
        objectsToDelete.add(upload.thumbnailStorageKey);
      }
    }

    if (tombstone) {
      tombstoneUploadIds.add(upload.id);
    } else {
      availableUploads.push(upload.id);
    }
  }

  return {
    checkedUploads: input.uploads.length,
    availableUploads,
    tombstoneUploadIds: [...tombstoneUploadIds],
    thumbnailKeysToClear: [...thumbnailKeysToClear],
    objectsToDelete: [...objectsToDelete],
    gaps,
  };
}

export function buildRestoreReconciliationSql(result: RestoreReconciliationResult): {
  tombstoneUploadSql?: { sql: string; params: unknown[] };
  clearThumbnailSql?: { sql: string; params: unknown[] };
} {
  return {
    tombstoneUploadSql: result.tombstoneUploadIds.length > 0
      ? {
          sql: `UPDATE upload
                SET status = 'restore_tombstoned',
                    url = NULL,
                    thumbnail_url = NULL,
                    thumbnail_storage_key = NULL,
                    updated_at = NOW()
                WHERE id = ANY($1)`,
          params: [result.tombstoneUploadIds],
        }
      : undefined,
    clearThumbnailSql: result.thumbnailKeysToClear.length > 0
      ? {
          sql: `UPDATE upload
                SET thumbnail_url = NULL,
                    thumbnail_storage_key = NULL,
                    updated_at = NOW()
                WHERE thumbnail_storage_key = ANY($1)`,
          params: [result.thumbnailKeysToClear],
        }
      : undefined,
  };
}

export function buildBackupDrillReport(input: BackupDrillReportInput): BackupDrillReport {
  const failed = input.failures.length > 0
    || input.playwrightResult === 'failed'
    || input.reconciliation.gaps.some((gap) =>
      gap.kind === 'missing_primary'
      || gap.kind === 'upload_references_purged_object'
      || gap.kind === 'rejected_purge_key_present'
    );

  return {
    ...input,
    status: failed ? 'failed' : 'passed',
    generatedAt: new Date().toISOString(),
  };
}
