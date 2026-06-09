#!/usr/bin/env tsx
import { createWriteStream, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import {
  checksumObjectManifest,
  type ObjectManifestEntry,
} from '../../packages/api/src/services/backup-restore';

const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || 'us-east-1';
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY;
const appId = process.env.APP_ID;
const outputDir = process.env.OBJECT_MANIFEST_DIR || 'backups/objects';
const runId = process.env.RUN_ID || new Date().toISOString().replace(/[:.]/g, '');

async function main(): Promise<void> {
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Set S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID/S3_ACCESS_KEY, and S3_SECRET_ACCESS_KEY/S3_SECRET_KEY');
  }

  const prefix = process.env.S3_PREFIX || (appId ? `apps/${appId}/` : 'apps/');
  mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, `${runId}.jsonl`);
  const metadataPath = path.join(outputDir, `${runId}.metadata.json`);
  const stream = createWriteStream(manifestPath, { flags: 'w' });
  const manifestEntries: ObjectManifestEntry[] = [];

  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  });

  let continuationToken: string | undefined;
  let objectCount = 0;
  let totalBytes = 0;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const object of response.Contents || []) {
      if (!object.Key) continue;
      const keyAppId = object.Key.split('/')[1] || null;
      if (appId && keyAppId !== appId) {
        throw new Error(`Cross-app object found under scoped manifest: ${object.Key}`);
      }
      const line = JSON.stringify({
        key: object.Key,
        appId: keyAppId,
        size: object.Size ?? null,
        etag: object.ETag?.replace(/^"|"$/g, '') ?? null,
        lastModified: object.LastModified?.toISOString() ?? null,
      });
      stream.write(`${line}\n`);
      manifestEntries.push({
        key: object.Key,
        size: object.Size ?? undefined,
        etag: object.ETag?.replace(/^"|"$/g, '') ?? undefined,
        lastModified: object.LastModified?.toISOString() ?? undefined,
      });
      objectCount += 1;
      totalBytes += object.Size ?? 0;
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  await new Promise<void>((resolve, reject) => {
    stream.end((error: Error | null | undefined) => error ? reject(error) : resolve());
  });

  const manifestSha256 = checksumObjectManifest(manifestEntries);
  writeFileSync(metadataPath, JSON.stringify({
    runId,
    bucket,
    prefix,
    appId: appId || null,
    manifestPath,
    manifestSha256,
    objectCount,
    totalBytes,
    generatedAt: new Date().toISOString(),
  }, null, 2));

  console.log(JSON.stringify({ manifestPath, metadataPath, manifestSha256, objectCount, totalBytes }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
