import { describe, expect, it } from 'vitest';
import {
  buildBackupDrillReport,
  buildRestoreReconciliationSql,
  checksumObjectManifest,
  reconcileRestoredObjects,
} from '../src/services/backup-restore';

describe('backup and restore reconciliation', () => {
  it('checksums object manifests deterministically', () => {
    const first = checksumObjectManifest([
      { key: 'apps/app-a/channels/c/file-b.png', size: 20, checksumSha256: 'b' },
      { key: 'apps/app-a/channels/c/file-a.png', size: 10, checksumSha256: 'a' },
    ]);
    const second = checksumObjectManifest([
      { key: 'apps/app-a/channels/c/file-a.png', size: 10, checksumSha256: 'a' },
      { key: 'apps/app-a/channels/c/file-b.png', size: 20, checksumSha256: 'b' },
    ]);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('tombstones uploads whose primary object is missing after restore', () => {
    const result = reconcileRestoredObjects({
      uploads: [
        {
          id: 'upload-ok',
          appId: 'app-a',
          storageKey: 'apps/app-a/channels/c/live.png',
        },
        {
          id: 'upload-missing',
          appId: 'app-a',
          storageKey: 'apps/app-a/channels/c/missing.png',
        },
      ],
      objectManifest: [
        { key: 'apps/app-a/channels/c/live.png', size: 3 },
      ],
      purgeLedger: [],
    });

    expect(result.availableUploads).toEqual(['upload-ok']);
    expect(result.tombstoneUploadIds).toEqual(['upload-missing']);
    expect(result.gaps).toContainEqual({
      appId: 'app-a',
      uploadId: 'upload-missing',
      storageKey: 'apps/app-a/channels/c/missing.png',
      kind: 'missing_primary',
    });
  });

  it('clears missing thumbnails without tombstoning the primary upload', () => {
    const result = reconcileRestoredObjects({
      uploads: [{
        id: 'upload-image',
        appId: 'app-a',
        storageKey: 'apps/app-a/channels/c/image.png',
        thumbnailStorageKey: 'apps/app-a/channels/c/thumb.png',
      }],
      objectManifest: [
        { key: 'apps/app-a/channels/c/image.png', size: 3 },
      ],
      purgeLedger: [],
    });

    expect(result.availableUploads).toEqual(['upload-image']);
    expect(result.tombstoneUploadIds).toEqual([]);
    expect(result.thumbnailKeysToClear).toEqual(['apps/app-a/channels/c/thumb.png']);
    expect(result.gaps[0]).toMatchObject({ kind: 'missing_thumbnail' });
  });

  it('deletes resurrected purged objects and tombstones rows that reference them', () => {
    const result = reconcileRestoredObjects({
      uploads: [{
        id: 'upload-purged',
        appId: 'app-a',
        storageKey: 'apps/app-a/channels/c/purged.png',
      }],
      objectManifest: [
        { key: 'apps/app-a/channels/c/purged.png', size: 3 },
      ],
      purgeLedger: [{
        appId: 'app-a',
        storageKey: 'apps/app-a/channels/c/purged.png',
        status: 'completed',
      }],
    });

    expect(result.tombstoneUploadIds).toEqual(['upload-purged']);
    expect(result.objectsToDelete).toEqual(['apps/app-a/channels/c/purged.png']);
    expect(result.gaps.map((gap) => gap.kind)).toEqual([
      'purged_object_restored',
      'upload_references_purged_object',
    ]);
  });

  it('does not replay rejected purge ledger rows as object deletes', () => {
    const result = reconcileRestoredObjects({
      uploads: [],
      objectManifest: [
        { key: 'apps/app-b/channels/c/foreign.png', size: 3 },
      ],
      purgeLedger: [{
        appId: 'app-a',
        storageKey: 'apps/app-b/channels/c/foreign.png',
        status: 'rejected',
      }],
    });

    expect(result.objectsToDelete).toEqual([]);
    expect(result.gaps).toEqual([{
      appId: 'app-a',
      storageKey: 'apps/app-b/channels/c/foreign.png',
      kind: 'rejected_purge_key_present',
    }]);
  });

  it('builds bounded SQL updates for restore tombstones and thumbnail cleanup', () => {
    const sql = buildRestoreReconciliationSql({
      checkedUploads: 2,
      availableUploads: [],
      tombstoneUploadIds: ['upload-a'],
      thumbnailKeysToClear: ['thumb-a'],
      objectsToDelete: [],
      gaps: [],
    });

    expect(sql.tombstoneUploadSql?.sql).toContain("status = 'restore_tombstoned'");
    expect(sql.tombstoneUploadSql?.params).toEqual([['upload-a']]);
    expect(sql.clearThumbnailSql?.sql).toContain('thumbnail_storage_key = NULL');
    expect(sql.clearThumbnailSql?.params).toEqual([['thumb-a']]);
  });

  it('marks drill reports failed when reconciliation finds unsafe gaps', () => {
    const report = buildBackupDrillReport({
      runId: 'drill-1',
      sourceEnvironment: 'local',
      restoreTarget: 'isolated',
      backupTimestamp: '2026-06-08T18:00:00.000Z',
      startedAt: '2026-06-08T18:01:00.000Z',
      finishedAt: '2026-06-08T18:02:00.000Z',
      postgresBackupPath: 'backups/pg.dump',
      objectManifestPath: 'backups/objects.jsonl',
      migrationVersion: '10',
      postgresRpoSeconds: 60,
      restoreRtoSeconds: 120,
      reconciliation: {
        checkedUploads: 1,
        availableUploads: [],
        tombstoneUploadIds: ['upload-a'],
        thumbnailKeysToClear: [],
        objectsToDelete: [],
        gaps: [{
          appId: 'app-a',
          uploadId: 'upload-a',
          storageKey: 'apps/app-a/channels/c/missing.png',
          kind: 'missing_primary',
        }],
      },
      verificationCommands: ['npm --workspace @chatsdk/api test -- --run'],
      playwrightResult: 'passed',
      failures: [],
      followUps: [],
    });

    expect(report.status).toBe('failed');
  });
});
