#!/usr/bin/env tsx
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import pg from 'pg';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  buildBackupDrillReport,
  buildRestoreReconciliationSql,
  checksumObjectManifest,
  reconcileRestoredObjects,
  type ObjectManifestEntry,
  type PurgeLedgerEntry,
  type RestoredUploadRow,
} from '../../packages/api/src/services/backup-restore';

const { Client } = pg;

const apply = process.env.APPLY_RESTORE_RECONCILIATION === 'true';
const databaseUrl = process.env.RESTORE_DATABASE_URL || (apply ? undefined : process.env.DATABASE_URL);
const manifestPath = process.env.OBJECT_MANIFEST_PATH;
const manifestMetadataPath = process.env.OBJECT_MANIFEST_METADATA_PATH
  || (manifestPath ? manifestPath.replace(/\.jsonl$/, '.metadata.json') : undefined);
const appId = process.env.APP_ID;
const applyAllApps = process.env.RESTORE_APPLY_ALL_APPS === 'true';
const restoreDrillConfirm = process.env.RESTORE_DRILL_CONFIRM || '';
const allowRemoteIsolatedTarget = process.env.RESTORE_ALLOW_REMOTE_ISOLATED_TARGET === 'true';
const runId = process.env.RUN_ID || `restore-${new Date().toISOString().replace(/[:.]/g, '')}`;
const reportDir = process.env.RESTORE_REPORT_DIR || 'docs/agent-runs/restore-drills';
const reportPath = path.join(reportDir, `${runId}.json`);
const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || 'us-east-1';
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY;

function createS3ClientIfConfigured(): S3Client | null {
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  });
}

function appIdFromStorageKey(storageKey: string): string | null {
  const match = /^apps\/([^/]+)\//.exec(storageKey);
  return match?.[1] ?? null;
}

function targetHost(connectionString: string): string {
  return new URL(connectionString).hostname;
}

function assertSafeApplyTarget(connectionString: string): void {
  if (!apply) {
    return;
  }
  if (restoreDrillConfirm !== 'I_UNDERSTAND_THIS_WILL_CLEAN_THE_TARGET') {
    throw new Error('Refusing destructive reconciliation: set RESTORE_DRILL_CONFIRM=I_UNDERSTAND_THIS_WILL_CLEAN_THE_TARGET for an isolated restore target');
  }
  if (process.env.DATABASE_URL && connectionString === process.env.DATABASE_URL) {
    throw new Error('Refusing destructive reconciliation: RESTORE_DATABASE_URL matches DATABASE_URL');
  }

  const host = targetHost(connectionString);
  const productionHosts = (process.env.PRODUCTION_DATABASE_HOSTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (productionHosts.includes(host)) {
    throw new Error(`Refusing destructive reconciliation: target host ${host} is listed in PRODUCTION_DATABASE_HOSTS`);
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && !allowRemoteIsolatedTarget) {
    throw new Error(`Refusing destructive reconciliation to remote host ${host}: set RESTORE_ALLOW_REMOTE_ISOLATED_TARGET=true only for an isolated restore database`);
  }
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function gapAction(kind: string): 'tombstone_upload' | 'clear_thumbnail' | 'delete_object' | 'report_only' {
  switch (kind) {
    case 'missing_primary':
    case 'upload_references_purged_object':
      return 'tombstone_upload';
    case 'missing_thumbnail':
      return 'clear_thumbnail';
    case 'purged_object_restored':
      return 'delete_object';
    case 'rejected_purge_key_present':
      return 'report_only';
    default:
      return 'report_only';
  }
}

function readManifest(filePath: string): ObjectManifestEntry[] {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const row = JSON.parse(line);
      return {
        key: row.key,
        size: row.size ?? undefined,
        etag: row.etag ?? undefined,
        checksumSha256: row.checksumSha256 ?? undefined,
        lastModified: row.lastModified ?? undefined,
      };
    });
}

function readExpectedManifestChecksum(filePath: string | undefined): string | undefined {
  if (!filePath || !existsSync(filePath)) {
    return undefined;
  }
  const metadata = JSON.parse(readFileSync(filePath, 'utf8'));
  return typeof metadata.manifestSha256 === 'string' ? metadata.manifestSha256 : undefined;
}

function requireManifestChecksum(filePath: string | undefined): string {
  const checksum = readExpectedManifestChecksum(filePath);
  if (!checksum) {
    throw new Error('Object manifest metadata with manifestSha256 is required before destructive reconciliation apply');
  }
  return checksum;
}

function writeReportFile(input: {
  report: ReturnType<typeof buildBackupDrillReport>;
  objectManifestSha256: string;
  applied: boolean;
  phase: 'planned' | 'final' | 'audit_failed';
  deletedRestoredObjects: string[];
  objectDeletionFailures: string[];
  sql: ReturnType<typeof buildRestoreReconciliationSql>;
  auditError?: string;
}): void {
  writeFileSync(reportPath, JSON.stringify({
    ...input.report,
    objectManifestSha256: input.objectManifestSha256,
    applied: input.applied,
    phase: input.phase,
    deletedRestoredObjects: input.deletedRestoredObjects,
    objectDeletionFailures: input.objectDeletionFailures,
    sql: input.sql,
    auditError: input.auditError,
  }, null, 2));
}

async function deleteRestoredObjects(storageKeys: string[]): Promise<{ deleted: string[]; failures: string[] }> {
  if (storageKeys.length === 0) {
    return { deleted: [], failures: [] };
  }

  const s3 = createS3ClientIfConfigured();
  if (!s3 || !bucket) {
    throw new Error('Set S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID/S3_ACCESS_KEY, and S3_SECRET_ACCESS_KEY/S3_SECRET_KEY before applying restored object deletions');
  }

  const deleted: string[] = [];
  const failures: string[] = [];
  for (const key of storageKeys) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      deleted.push(key);
    } catch (error) {
      failures.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { deleted, failures };
}

async function insertBackupDrillAudit(input: {
  client: pg.Client;
  report: ReturnType<typeof buildBackupDrillReport>;
  objectManifest: ObjectManifestEntry[];
  objectManifestSha256: string;
}): Promise<void> {
  const { client, report, objectManifest, objectManifestSha256 } = input;
  await client.query('BEGIN');
  try {
    await client.query("SELECT set_config('app.system_context', 'true', true)");
    const drillResult = await client.query<{ id: string }>(
      `INSERT INTO backup_drill (
         run_id, source_environment, restore_target, backup_timestamp, started_at, finished_at,
         postgres_backup_path, object_manifest_path, object_manifest_sha256, migration_version,
         postgres_rpo_seconds, restore_rto_seconds, status, playwright_result, report
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (run_id)
       DO UPDATE SET
         finished_at = EXCLUDED.finished_at,
         object_manifest_sha256 = EXCLUDED.object_manifest_sha256,
         status = EXCLUDED.status,
         playwright_result = EXCLUDED.playwright_result,
         report = EXCLUDED.report
       RETURNING id::text`,
      [
        report.runId,
        report.sourceEnvironment,
        report.restoreTarget,
        report.backupTimestamp,
        report.startedAt,
        report.finishedAt,
        report.postgresBackupPath,
        report.objectManifestPath,
        objectManifestSha256,
        report.migrationVersion,
        report.postgresRpoSeconds,
        report.restoreRtoSeconds,
        report.status,
        report.playwrightResult,
        JSON.stringify(report),
      ]
    );
    const drillId = drillResult.rows[0].id;

    await client.query('DELETE FROM backup_object_manifest WHERE drill_id = $1', [drillId]);
    for (const object of objectManifest) {
      const objectAppId = appIdFromStorageKey(object.key);
      if (!isUuid(objectAppId)) {
        throw new Error(`Object manifest key is not app-scoped with a UUID app id: ${object.key}`);
      }
      await client.query(
        `INSERT INTO backup_object_manifest (
           drill_id, app_id, storage_key, size_bytes, checksum_sha256, etag, last_modified
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          drillId,
          objectAppId,
          object.key,
          object.size ?? null,
          object.checksumSha256 ?? null,
          object.etag ?? null,
          object.lastModified ?? null,
        ]
      );
    }

    await client.query('DELETE FROM backup_restore_gap WHERE drill_id = $1', [drillId]);
    for (const gap of report.reconciliation.gaps) {
      await client.query(
        `INSERT INTO backup_restore_gap (drill_id, app_id, upload_id, storage_key, kind, action)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          drillId,
          gap.appId,
          gap.uploadId ?? null,
          gap.storageKey,
          gap.kind,
          gapAction(gap.kind),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(): Promise<void> {
  if (!databaseUrl || !manifestPath) {
    throw new Error(apply
      ? 'Set RESTORE_DATABASE_URL and OBJECT_MANIFEST_PATH'
      : 'Set RESTORE_DATABASE_URL/DATABASE_URL and OBJECT_MANIFEST_PATH');
  }

  if (apply && !appId && !applyAllApps) {
    throw new Error('Set APP_ID for scoped apply, or RESTORE_APPLY_ALL_APPS=true for a whole-environment restore reconciliation');
  }
  assertSafeApplyTarget(databaseUrl);

  mkdirSync(reportDir, { recursive: true });
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const uploadQuery = appId
      ? {
          text: `SELECT id::text, app_id::text AS app_id, storage_key, thumbnail_storage_key, status
                 FROM upload
                 WHERE app_id = $1`,
          values: [appId],
        }
      : {
          text: `SELECT id::text, app_id::text AS app_id, storage_key, thumbnail_storage_key, status
                 FROM upload`,
          values: [],
        };
    const uploadsResult = await client.query(uploadQuery);
    const purgeQuery = appId
      ? {
          text: `SELECT app_id::text AS app_id, storage_key, status
                 FROM data_purge_ledger
                 WHERE app_id = $1 AND storage_key IS NOT NULL`,
          values: [appId],
        }
      : {
          text: `SELECT app_id::text AS app_id, storage_key, status
                 FROM data_purge_ledger
                 WHERE storage_key IS NOT NULL`,
          values: [],
        };
    const purgeResult = await client.query(purgeQuery);

    const uploads: RestoredUploadRow[] = uploadsResult.rows.map((row) => ({
      id: row.id,
      appId: row.app_id,
      storageKey: row.storage_key,
      thumbnailStorageKey: row.thumbnail_storage_key,
      status: row.status,
    }));
    const purgeLedger: PurgeLedgerEntry[] = purgeResult.rows.map((row) => ({
      appId: row.app_id,
      storageKey: row.storage_key,
      status: row.status,
    }));
    const objectManifest = readManifest(manifestPath);

    if (appId) {
      const crossAppObject = objectManifest.find((entry) => !entry.key.startsWith(`apps/${appId}/`));
      if (crossAppObject) {
        throw new Error(`Cross-app object in scoped restore manifest: ${crossAppObject.key}`);
      }
    }

    const reconciliation = reconcileRestoredObjects({ uploads, objectManifest, purgeLedger });
    const sql = buildRestoreReconciliationSql(reconciliation);
    const objectManifestSha256 = checksumObjectManifest(objectManifest);
    const expectedManifestSha256 = apply
      ? requireManifestChecksum(manifestMetadataPath)
      : readExpectedManifestChecksum(manifestMetadataPath);
    if (expectedManifestSha256 && expectedManifestSha256 !== objectManifestSha256) {
      throw new Error(`Object manifest checksum mismatch: metadata=${expectedManifestSha256} computed=${objectManifestSha256}`);
    }
    let deletedRestoredObjects: string[] = [];
    let objectDeletionFailures: string[] = [];

    const report = buildBackupDrillReport({
      runId,
      sourceEnvironment: process.env.SOURCE_ENVIRONMENT || 'restored',
      restoreTarget: process.env.RESTORE_TARGET || 'isolated',
      backupTimestamp: process.env.BACKUP_TIMESTAMP || new Date().toISOString(),
      startedAt: process.env.RESTORE_STARTED_AT || new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      postgresBackupPath: process.env.POSTGRES_BACKUP_PATH || 'unknown',
      objectManifestPath: manifestPath,
      migrationVersion: process.env.MIGRATION_VERSION || 'unknown',
      postgresRpoSeconds: Number(process.env.POSTGRES_RPO_SECONDS || 0),
      restoreRtoSeconds: Number(process.env.RESTORE_RTO_SECONDS || 0),
      reconciliation,
      verificationCommands: [
        'npm --workspace @chatsdk/api test -- --run tests/backup-restore.test.ts',
        'npm run test:playwright -- tests/playwright/chat-restored-data.spec.ts',
      ],
      playwrightResult: (process.env.PLAYWRIGHT_RESULT as 'passed' | 'failed' | 'skipped') || 'skipped',
      failures: objectDeletionFailures,
      followUps: reconciliation.gaps.length > 0 ? ['Review reconciliation gaps before production cutover'] : [],
    });

    writeReportFile({
      report,
      objectManifestSha256,
      applied: false,
      phase: 'planned',
      deletedRestoredObjects,
      objectDeletionFailures,
      sql,
    });
    await insertBackupDrillAudit({ client, report, objectManifest, objectManifestSha256 });

    if (apply) {
      if (reconciliation.objectsToDelete.length > 0 && !createS3ClientIfConfigured()) {
        throw new Error('Restored purged objects were detected; configure S3 credentials so APPLY_RESTORE_RECONCILIATION can delete them');
      }

      await client.query('BEGIN');
      try {
        await client.query("SELECT set_config('app.system_context', 'true', true)");
        if (sql.tombstoneUploadSql) {
          await client.query(sql.tombstoneUploadSql.sql, sql.tombstoneUploadSql.params);
        }
        if (sql.clearThumbnailSql) {
          await client.query(sql.clearThumbnailSql.sql, sql.clearThumbnailSql.params);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      const deletionResult = await deleteRestoredObjects(reconciliation.objectsToDelete);
      deletedRestoredObjects = deletionResult.deleted;
      objectDeletionFailures = deletionResult.failures;
    }

    const finalReport = buildBackupDrillReport({
      ...report,
      failures: objectDeletionFailures,
      followUps: reconciliation.gaps.length > 0 ? ['Review reconciliation gaps before production cutover'] : [],
    });

    writeReportFile({
      report: finalReport,
      objectManifestSha256,
      applied: apply,
      phase: 'final',
      deletedRestoredObjects,
      objectDeletionFailures,
      sql,
    });

    try {
      await insertBackupDrillAudit({ client, report: finalReport, objectManifest, objectManifestSha256 });
    } catch (error) {
      const auditError = error instanceof Error ? error.message : String(error);
      writeReportFile({
        report: buildBackupDrillReport({
          ...finalReport,
          failures: [...finalReport.failures, `Audit persistence failed: ${auditError}`],
        }),
        objectManifestSha256,
        applied: apply,
        phase: 'audit_failed',
        deletedRestoredObjects,
        objectDeletionFailures,
        sql,
        auditError,
      });
      throw error;
    }
    if (finalReport.status === 'failed') {
      throw new Error(`Restore reconciliation completed with failed status; see ${reportPath}`);
    }
    console.log(JSON.stringify({ reportPath, status: finalReport.status, reconciliation, applied: apply }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
